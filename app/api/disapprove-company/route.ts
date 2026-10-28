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

  const { company_id } = (await request.json()) as {
    company_id: string;
  };

  if (!company_id) {
    return NextResponse.json({ error: "company_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Soft-delete the company so re-ingestion won't resurrect it
  await admin
    .from("larkspur_companies")
    .update({ disapproved_at: new Date().toISOString() })
    .eq("id", company_id);

  // Soft-delete any associated leads instead of hard-deleting them
  await admin
    .from("larkspur_leads")
    .update({ stage: "disqualified", updated_at: new Date().toISOString() })
    .eq("company_id", company_id);

  return NextResponse.json({ success: true });
}