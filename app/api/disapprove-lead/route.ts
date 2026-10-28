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

  const { lead_id } = (await request.json()) as {
    lead_id: string;
  };

  if (!lead_id) {
    return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Get the company_id before deleting the lead
  const { data: lead } = await admin
    .from("larkspur_leads")
    .select("company_id")
    .eq("id", lead_id)
    .single();

  // Delete the lead
  await admin.from("larkspur_leads").delete().eq("id", lead_id);

  // Soft-delete the company so re-ingestion won't resurrect it
  if (lead?.company_id) {
    await admin
      .from("larkspur_companies")
      .update({ disapproved_at: new Date().toISOString() })
      .eq("id", lead.company_id);
  }

  return NextResponse.json({ success: true });
}