import { createAdminClient } from "@/lib/supabase/admin";

const SEARCHES = [
  { label: "Sales companies Lagos", industry: "sales", city: "Lagos", keywords: ["sales company", "sales agency", "business development"] },
  { label: "Marketing agencies Lagos", industry: "marketing", city: "Lagos", keywords: ["marketing agency", "digital marketing", "advertising agency"] },
  { label: "Customer service Lagos", industry: "customer_service", city: "Lagos", keywords: ["customer service", "call center", "customer support"] },
  { label: "Administration services Lagos", industry: "administration", city: "Lagos", keywords: ["administration", "office services", "administrative services"] },
  { label: "Operations companies Lagos", industry: "operations", city: "Lagos", keywords: ["operations company", "business operations", "office management"] },
  { label: "Management firms Lagos", industry: "management", city: "Lagos", keywords: ["management consulting", "project management", "general manager"] },
];

export async function seed() {
  const supabase = createAdminClient();
  for (const s of SEARCHES) {
    const { error } = await supabase
      .from("larkspur_saved_searches")
      .insert(s);
    if (error) console.error(`Error seeding ${s.label}:`, error.message);
    else console.log(`Seeded: ${s.label}`);
  }
  console.log("Seed complete");
}

seed().catch(console.error);