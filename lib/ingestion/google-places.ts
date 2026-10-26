import { createAdminClient } from "@/lib/supabase/admin";
import type { Industry, SavedSearch } from "@/lib/types";

export interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  types: string[];
  rating?: number;
  user_ratings_total?: number;
}

export interface IngestSummary {
  source: string;
  fetched: number;
  inserted: number;
  duplicates: number;
  failed: number;
  error: string | null;
}

const INDUSTRY_SEARCH_TERMS: Record<Industry, string[]> = {
  law_firm: ["law firm", "lawyer", "attorney", "legal services"],
  accounting: ["accounting firm", "accountant", "tax consultant", "auditor"],
  consulting: ["consulting firm", "business consultant", "management consultant"],
  hospitality: ["hotel", "restaurant", "event venue", "catering"],
  retail: ["boutique", "retail store", "shop", "fashion store"],
  healthcare: ["clinic", "hospital", "medical center", "wellness center"],
  logistics: ["logistics", "shipping", "freight", "transportation"],
  ecommerce: ["online store", "e-commerce", "digital store"],
  architecture: ["architecture firm", "interior design", "architect"],
  agriculture: ["farm", "agricultural", "agribusiness"],
  recruitment: ["recruitment agency", "staffing agency", "hr consultant"],
  real_estate: ["real estate", "property management", "estate agent"],
  other: [],
};

function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchGooglePlaces(
  query: string,
  location: string,
  apiKey: string,
): Promise<GooglePlaceResult[]> {
  // Use Places API (New) - Text Search
  const url = "https://places.googleapis.com/v1/places:searchText";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.id,places.rating,places.userRatingCount,places.types",
    },
    body: JSON.stringify({
      textQuery: `${query} in ${location}`,
      languageCode: "en",
      regionCode: "NG",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Google Places API error: ${response.status} ${errorText}`,
    );
  }

  const data = await response.json();
  const places = data.places || [];

  return places.map((p: any) => ({
    place_id: p.id,
    name: p.displayName?.text || "",
    formatted_address: p.formattedAddress || "",
    formatted_phone_number: p.nationalPhoneNumber || undefined,
    website: p.websiteUri || undefined,
    types: p.types || [],
    rating: p.rating || undefined,
    user_ratings_total: p.userRatingCount || undefined,
  }));
}

export async function runIngestion(): Promise<IngestSummary[]> {
  const supabase = createAdminClient();
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY not configured");
  }

  const summaries: IngestSummary[] = [];

  // Fetch active saved searches
  const { data: searches } = await supabase
    .from("larkspur_saved_searches")
    .select("*")
    .eq("is_active", true);

  if (!searches || searches.length === 0) {
    console.log("No active saved searches found");
    return summaries;
  }

  for (const search of searches as SavedSearch[]) {
    const startedAt = new Date().toISOString();
    let fetched = 0;
    let inserted = 0;
    let duplicates = 0;
    let failed = 0;
    let error: string | null = null;

    try {
      const searchTerms = search.industry
        ? INDUSTRY_SEARCH_TERMS[search.industry]
        : search.keywords;

      const location = search.city || "Lagos, Nigeria";

      for (const term of searchTerms) {
        const places = await searchGooglePlaces(term, location, apiKey);
        fetched += places.length;

        for (const place of places) {
          const result = await upsertCompany(supabase, place, search.industry);
          if (result === "inserted") inserted++;
          if (result === "duplicate") duplicates++;
          if (result === "failed") failed++;
        }

        // Rate limiting: wait 100ms between API calls
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    await supabase.from("larkspur_ingestion_runs").insert({
      source: "google_places",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      fetched_count: fetched,
      inserted_count: inserted,
      duplicate_count: duplicates,
      error,
    });

    summaries.push({
      source: "google_places",
      fetched,
      inserted,
      duplicates,
      failed,
      error,
    });
  }

  return summaries;
}

async function upsertCompany(
  supabase: ReturnType<typeof createAdminClient>,
  place: GooglePlaceResult,
  industry: Industry | null,
): Promise<"inserted" | "duplicate" | "failed"> {
  const normalizedName = normalizeCompanyName(place.name);

  // Check if company already exists
  const { data: existing } = await supabase
    .from("larkspur_companies")
    .select("id")
    .eq("normalized_name", normalizedName)
    .single();

  if (existing) {
    return "duplicate";
  }

  const row = {
    name: place.name,
    normalized_name: normalizedName,
    industry,
    city: "Lagos", // Default for now, could parse from formatted_address
    state: "Lagos",
    phone: place.formatted_phone_number || null,
    website: place.website || null,
    google_place_id: place.place_id,
    size: null, // Would need to fetch details separately
    linkedin_url: null,
    notes: null,
  };

  const { data: insertedCompany, error: insertError } = await supabase
    .from("larkspur_companies")
    .insert(row)
    .select("id")
    .single();

  if (insertError) {
    console.error(`Failed to insert company ${place.name}:`, insertError.message);
    return "failed";
  }

  // Auto-approve: every ingested company becomes a lead (no triage step)
  const { error: leadError } = await supabase
    .from("larkspur_leads")
    .insert({
      company_id: insertedCompany.id,
      stage: "prospect",
      source: "google_places",
    });

  if (leadError) {
    console.error(`Failed to create lead for company ${place.name}:`, leadError.message);
    // Company was inserted; lead creation failure is non-fatal
  }

  return "inserted";
}