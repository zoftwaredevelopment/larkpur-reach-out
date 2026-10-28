import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const admin = createAdminClient();
  const report: Record<string, any> = {};

  // Count leads
  const { count: totalLeads, error: leadsError } = await admin
    .from("larkspur_leads")
    .select("*", { count: "exact", head: true });
  report.total_leads = totalLeads;
  report.leads_error = leadsError?.message || null;

  // Count companies
  const { count: totalCompanies, error: companiesError } = await admin
    .from("larkspur_companies")
    .select("*", { count: "exact", head: true });
  report.total_companies = totalCompanies;
  report.companies_error = companiesError?.message || null;

  // Count disapproved companies
  const { count: disapprovedCompanies } = await admin
    .from("larkspur_companies")
    .select("*", { count: "exact", head: true })
    .not("disapproved_at", "is", null);
  report.disapproved_companies = disapprovedCompanies || 0;

  // Count leads with null company_id (orphaned from company deletion)
  const { count: orphanedLeads } = await admin
    .from("larkspur_leads")
    .select("*", { count: "exact", head: true })
    .is("company_id", null);
  report.orphaned_leads = orphanedLeads || 0;

  // Count leads by stage
  const { data: leadsByStage } = await admin
    .from("larkspur_leads")
    .select("stage, id");
  const stageCounts: Record<string, number> = {};
  (leadsByStage ?? []).forEach((l: any) => {
    stageCounts[l.stage] = (stageCounts[l.stage] || 0) + 1;
  });
  report.leads_by_stage = stageCounts;

  // Recent leads
  const { data: recentLeads } = await admin
    .from("larkspur_leads")
    .select("*, larkspur_companies(name), larkspur_contacts(name)")
    .order("created_at", { ascending: false })
    .limit(10);
  report.recent_leads = recentLeads || [];

  return NextResponse.json(report);
}
