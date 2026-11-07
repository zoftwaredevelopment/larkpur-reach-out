import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

  const { data: allLeads } = await supabase
    .from("larkspur_leads")
    .select(
      "*, larkspur_companies(name, industry, city), larkspur_contacts(name, role, phone)"
    )
    .neq("stage", "disqualified")
    .order("updated_at", { ascending: false });

  const leads = (allLeads || []).filter((lead: any) => {
    if (stageFilter && lead.stage !== stageFilter) return false;
    if (
      industryFilter &&
      lead.larkspur_companies?.industry?.toLowerCase() !==
        industryFilter.toLowerCase()
    )
      return false;
    if (search) {
      const company = (lead.larkspur_companies?.name || "").toLowerCase();
      const contact = (lead.larkspur_contacts?.name || "").toLowerCase();
      const industry = (lead.larkspur_companies?.industry || "").toLowerCase();
      const city = (lead.larkspur_companies?.city || "").toLowerCase();
      if (
        !company.includes(search) &&
        !contact.includes(search) &&
        !industry.includes(search) &&
        !city.includes(search)
      )
        return false;
    }
    return true;
  });

  const stageColors = {
    prospect: "bg-gray-100 text-gray-800",
    contacted: "bg-blue-100 text-blue-800",
    replied: "bg-green-100 text-green-800",
    meeting: "bg-purple-100 text-purple-800",
    client: "bg-emerald-100 text-emerald-800",
    disqualified: "bg-red-100 text-red-800",
    unreachable: "bg-orange-100 text-orange-800",
  };

  const now = new Date();
  const freshLeads = leads.filter((l: any) => {
    if (!l.next_follow_up_at) return true;
    return new Date(l.next_follow_up_at) > now;
  });

  const allIndustries = [
    ...new Set(
      (allLeads || [])
        .map((l: any) => l.larkspur_companies?.industry)
        .filter(Boolean)
    ),
  ].sort();
  const allStages = [...new Set((allLeads || []).map((l: any) => l.stage))].sort();

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600 mt-1">
            {freshLeads.length} fresh leads in your pipeline
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Dashboard
          </Link>
          <Link
            href="/follow-ups"
            className="px-4 py-2 bg-amber-100 text-amber-900 rounded hover:bg-amber-200 text-sm font-medium border border-amber-200"
          >
            ⚠️ View Follow-ups Needed
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 border">
        <form className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              name="search"
              defaultValue={params.search || ""}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Company, contact, industry, city..."
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Stage
            </label>
            <select
              name="stage"
              defaultValue={stageFilter}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Stages</option>
              {allStages.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Industry
            </label>
            <select
              name="industry"
              defaultValue={industryFilter}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Industries</option>
              {allIndustries.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
            >
              Filter
            </button>
            <Link
              href="/leads"
              className="ml-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium"
            >
              Clear
            </Link>
          </div>
        </form>
      </div>

      {(!freshLeads || freshLeads.length === 0) ? (
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
                  Last Contacted
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {freshLeads.map((lead: any) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {lead.larkspur_companies?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {lead.larkspur_companies?.city}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {lead.larkspur_contacts?.name || "—"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {lead.larkspur_contacts?.role || "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lead.larkspur_companies?.industry || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lead.larkspur_companies?.website ? (
                      <a
                        href={lead.larkspur_companies.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {lead.larkspur_companies.website}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        stageColors[lead.stage as keyof typeof stageColors]
                      }`}
                    >
                      {lead.stage}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lead.last_contacted_at
                      ? new Date(lead.last_contacted_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      )}
    </div>
  );
}