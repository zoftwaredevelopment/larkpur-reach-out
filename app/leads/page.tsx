import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StageSelect } from "./StageSelect";
import { LeadRowActions } from "./LeadRowActions";

export const dynamic = "force-dynamic";

/** PostgREST may return a related row as object or as a 1-element array. */
function firstRel<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; stage?: string; industry?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const search = (params.search || "").toLowerCase();
  const stageFilter = params.stage || "";
  const industryFilter = params.industry || "";

  // Include phone/email on both company and contact — detail UI already falls back to company.phone
  const { data: allLeads } = await supabase
    .from("larkspur_leads")
    .select(
      "*, larkspur_companies(name, industry, city, website, phone), larkspur_contacts(name, role, phone, email)"
    )
    .neq("stage", "disqualified")
    .order("updated_at", { ascending: false });

  const leads = (allLeads || []).filter((lead: any) => {
    const company = firstRel(lead.larkspur_companies);
    const contact = firstRel(lead.larkspur_contacts);

    if (stageFilter && lead.stage !== stageFilter) return false;
    if (
      industryFilter &&
      company?.industry?.toLowerCase() !== industryFilter.toLowerCase()
    )
      return false;
    if (search) {
      const companyName = (company?.name || "").toLowerCase();
      const contactName = (contact?.name || "").toLowerCase();
      const industry = (company?.industry || "").toLowerCase();
      const city = (company?.city || "").toLowerCase();
      if (
        !companyName.includes(search) &&
        !contactName.includes(search) &&
        !industry.includes(search) &&
        !city.includes(search)
      )
        return false;
    }
    return true;
  });

  // Top pile = not yet outreached. First logged outreach moves stage off prospect.
  const freshLeads = stageFilter
    ? leads
    : leads.filter((l: any) => (l.stage || "prospect") === "prospect");

  const allIndustries = [
    ...new Set(
      (allLeads || [])
        .map((l: any) => firstRel(l.larkspur_companies)?.industry)
        .filter(Boolean)
    ),
  ].sort();

  const allStages = [...new Set((allLeads || []).map((l: any) => l.stage))].sort();

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch {
      return "—";
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600 mt-1">
            {stageFilter
              ? `${leads.length} lead${leads.length === 1 ? "" : "s"} (filtered)`
              : `${freshLeads.length} fresh lead${freshLeads.length === 1 ? "" : "s"} (prospects) in your pipeline`}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            WhatsApp / Email from this list — no need to open each lead. Confirm
            "Good?" after sending so they leave the fresh pile.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link
            href="/follow-ups"
            className="px-4 py-2 bg-amber-100 text-amber-900 rounded hover:bg-amber-200 text-sm font-medium border border-amber-200"
          >
            ⚠ Follow-ups
          </Link>
          <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
            ← Dashboard
          </Link>
        </div>
      </div>

      <form method="get" className="bg-white rounded-lg shadow p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Search</label>
          <input
            type="text"
            name="search"
            defaultValue={params.search || ""}
            placeholder="Company, contact, city…"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Stage</label>
          <select
            name="stage"
            defaultValue={stageFilter}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Fresh (prospects)</option>
            {allStages.map((s) => (
              <option key={s} value={s}>
                {s === "meeting" ? "met" : s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Industry</label>
          <select
            name="industry"
            defaultValue={industryFilter}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All industries</option>
            {allIndustries.map((ind) => (
              <option key={ind as string} value={ind as string}>
                {ind as string}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
          >
            Filter
          </button>
          <Link
            href="/leads"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200"
          >
            Clear
          </Link>
        </div>
      </form>

      {!freshLeads || freshLeads.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 mb-4">No fresh leads match your filters</p>
          <Link
            href="/companies-to-approve"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Approve Companies →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Industry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Website
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outreach
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {freshLeads.map((lead: any) => {
                  const company = firstRel(lead.larkspur_companies);
                  const contact = firstRel(lead.larkspur_contacts);
                  // Same fallback order as LeadDetailClient
                  const phone =
                    contact?.phone || company?.phone || lead.phone || null;
                  const email = contact?.email || company?.email || null;

                  return (
                    <tr key={lead.id} className="hover:bg-gray-50 align-top">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline"
                        >
                          {company?.name || "—"}
                        </Link>
                        <div className="text-sm text-gray-500">
                          {company?.city}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {contact?.name || "—"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {contact?.role || "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {company?.industry || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {company?.website ? (
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {company.website}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StageSelect leadId={lead.id} currentStage={lead.stage} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(lead.last_contacted_at)}
                      </td>
                      <td className="px-6 py-4">
                        <LeadRowActions
                          leadId={lead.id}
                          phone={phone}
                          email={email}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
