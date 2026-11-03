import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function LeadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: leads } = await supabase
    .from("larkspur_leads")
    .select("*, larkspur_companies(name, industry, city), larkspur_contacts(name, role, phone)")
    .neq("stage", "disqualified")
    .order("updated_at", { ascending: false });

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
  const followUpLeads = (leads || []).filter(
    (l: any) =>
      l.next_follow_up_at &&
      new Date(l.next_follow_up_at) <= now &&
      l.stage !== "client" &&
      l.stage !== "disqualified" &&
      l.stage !== "unreachable"
  );

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600 mt-1">
            {leads?.length || 0} leads in your pipeline
          </p>
        </div>
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {(!leads || leads.length === 0) ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 mb-4">No leads yet</p>
          <Link
            href="/companies-to-approve"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Approve Companies →
          </Link>
        </div>
      ) : (
        <>
          {followUpLeads.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-amber-900 mb-3">
                ⚠️ Follow-ups needed
              </h2>
              <p className="text-amber-800 text-sm mb-4">
                The following leads are due for a follow-up:
              </p>
              <div className="space-y-3">
                {followUpLeads.map((lead: any) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between p-3 bg-white rounded border border-amber-100"
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {lead.larkspur_companies?.name}
                        </div>
                        <div className="text-xs text-gray-600">
                          Due:{new Date(
                            lead.next_follow_up_at
                          ).toLocaleDateString()}
                        </div>
                      </div>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-xs text-amber-600 hover:underline font-medium"
                      >
                        View lead
                      </Link>
                    </div>
                  ))}
              </div>
            </div>
          )})
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
              {leads.map((lead: any) => (
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
        </>
      )}
    </div>
  );
}