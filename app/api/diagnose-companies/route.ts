import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const admin = createAdminClient();
  const report: Record<string, any> = {};

  // 1. Check if disapproved_at column exists
  const { data: colCheck, error: colError } = await admin
    .from("larkspur_companies")
    .select("disapproved_at")
    .limit(1);
  report.disapproved_at_column_exists = !colError;
  report.disapproved_at_error = colError?.message || null;

  // 2. Total companies
  const { count: totalCompanies, error: totalError } = await admin
    .from("larkspur_companies")
    .select("*", { head: true });
  report.total_companies = totalCompanies;
  report.total_companies_error = totalError?.message || null;

  // 3. Companies with no leads
  const { data: companiesNoLeads, error: noLeadsError } = await admin
    .from("larkspur_companies")
    .select("id, name, industry, disapproved_at, larkspur_leads(id)")
    .is("larkspur_leads.id", null);

  report.companies_without_leads = companiesNoLeads?.length || 0;
  report.companies_without_leads_error = noLeadsError?.message || null;
  report.companies_without_leads_list = companiesNoLeads?.map((c: any) => ({
    id: c.id,
    name: c.name,
    industry: c.industry,
    disapproved_at: c.disapproved_at,
  })) || [];

  // 4. Companies with leads
  const { count: companiesWithLeads } = await admin
    .from("larkspur_companies")
    .select("*", { head: true })
    .not("larkspur_leads.id", "is", null);
  report.companies_with_leads = companiesWithLeads || 0;

  // 5. Recruitment industry companies (would be filtered out)
  const { count: recruitmentCompanies } = await admin
    .from("larkspur_companies")
    .select("*", { head: true })
    .in("industry", ["Recruitment", "Staffing", "Headhunting"]);
  report.recruitment_companies = recruitmentCompanies || 0;

  return NextResponse.json(report);
}
