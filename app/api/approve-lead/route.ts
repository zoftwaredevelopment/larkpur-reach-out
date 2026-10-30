import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const company_id = formData.get("company_id") as string;

  if (!company_id) {
    return NextResponse.json({ error: "company_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check if a lead already exists for this company
  const { data: existingLead } = await admin
    .from("larkspur_leads")
    .select("id, stage, company_id")
    .eq("company_id", company_id)
    .single();

  if (existingLead) {
    // If the lead was previously disqualified, reactivate it back to prospect
    if (existingLead.stage === "disqualified") {
      const { data: reactivatedLead, error: reactivateError } = await admin
        .from("larkspur_leads")
        .update({
          stage: "prospect",
          updated_at: new Date().toISOString(),
          last_contacted_at: null,
        })
        .eq("id", existingLead.id)
        .select()
        .single();

      if (reactivateError) {
        return NextResponse.json({ error: reactivateError.message }, { status: 500 });
      }

      // Clear disapproved_at on the company so re-ingestion won't block it
      const { error: companyError } = await admin
        .from("larkspur_companies")
        .update({ disapproved_at: null })
        .eq("id", company_id);

      if (companyError) {
        return NextResponse.json({ error: companyError.message }, { status: 500 });
      }

      return NextResponse.json({ leadId: reactivatedLead.id, reactivated: true });
    }

    // Already an active lead — return the existing lead id
    return NextResponse.json({ leadId: existingLead.id });
  }

  // Create the lead
  const { data: lead, error: leadError } = await admin
    .from("larkspur_leads")
    .insert({
      company_id,
      stage: "prospect",
      source: "google_places",
    })
    .select()
    .single();

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 });
  }

  // Return the lead id so the client can redirect to the lead page
  return NextResponse.json({ leadId: lead.id });
}