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

  const admin = createAdminClient();

  // Step 1: Permanently remove approved companies from triage.
  // These companies have a lead record — the lead is the source of truth now.
  // FK on leads.company_id is on delete set null, so leads survive company deletion.
  const { data: leads } = await admin
    .from("larkspur_leads")
    .select("company_id")
    .not("company_id", "is", null);

  const approvedCompanyIds = (leads ?? [])
    .map((l: any) => l.company_id)
    .filter(Boolean);

  let approvedDeleted = 0;
  if (approvedCompanyIds.length > 0) {
    const { error } = await admin
      .from("larkspur_companies")
      .delete()
      .in("id", approvedCompanyIds);
    if (!error) approvedDeleted = approvedCompanyIds.length;
  }

  // Step 2: Permanently remove disapproved companies from triage.
  // These have disapproved_at set and no lead (disapprove deletes the lead).
  const { data: disapprovedCompanies } = await admin
    .from("larkspur_companies")
    .select("id")
    .not("disapproved_at", "is", null);

  const disapprovedIds = (disapprovedCompanies ?? []).map((c: any) => c.id);

  let disapprovedDeleted = 0;
  if (disapprovedIds.length > 0) {
    const { error } = await admin
      .from("larkspur_companies")
      .delete()
      .in("id", disapprovedIds);
    if (!error) disapprovedDeleted = disapprovedIds.length;
  }

  return NextResponse.json({
    success: true,
    approved_deleted: approvedDeleted,
    disapproved_deleted: disapprovedDeleted,
  });
}
