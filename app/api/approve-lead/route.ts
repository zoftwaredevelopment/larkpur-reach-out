import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { company_id } = (await request.json()) as { company_id: string };

  if (!company_id) {
    return NextResponse.json({ error: "company_id is required" }, { status: 400 });
  }

  // Use admin client to bypass RLS for creating the lead
  const admin = createAdminClient();

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

  return NextResponse.json(lead);
}