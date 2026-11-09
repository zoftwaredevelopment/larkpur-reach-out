import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const stageColors = {
  prospect: "bg-gray-100 text-gray-800",
  contacted: "bg-blue-100 text-blue-800",
  replied: "bg-green-100 text-green-800",
  meeting: "bg-purple-100 text-purple-800",
  client: "bg-emerald-100 text-emerald-800",
  disqualified: "bg-red-100 text-red-800",
  unreachable: "bg-orange-100 text-orange-800",
};

export default async function FollowUpsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: leads } = await supabase
    .from("larkspur_leads")
    .select(
      "*, larkspur_companies(name, industry, city), larkspur_contacts(name, role, phone)"
    )
    .neq("stage", "disqualified")
    .neq("stage", "client")
    .neq("stage", "unreachable")
    // Cumulative: show ALL leads that have a due date set (regardless of date)
    .not("next_follow_up_at", "is", null)
    .order("next_follow_up_at", { ascending: true });

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Follow-ups Needed</h1>
          <p className="text-gray-600 mt-1">
            {leads?.length || 0} leads due for follow-up
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/leads"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Fresh Leads
          </Link>
        </div>
      </div>

      {!leads || leads.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-green-600 mb-4">
            No follow-ups needed right now
          </p>
          <Link
            href="/leads"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View Fresh Leads →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Industry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Stage
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.map((lead: any) => {
                const alreadyHandled = !lead.next_follow_up_at;
                return (
                  <tr
                    key={lead.id}
                    className="hover:bg-amber-50"
                    onClick={() => window.location.href = `/leads/${lead.id}`}
                  >
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          stageColors[
                            lead.stage as keyof typeof stageColors
                          ]
                        }`}
                      >
                        {lead.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={alreadyHandled}
                          onChange={async (e) => {
                            const handled = e.target.checked;
                            await supabase
                              .from("larkspur_leads")
                              .update({
                                next_follow_up_at: handled
                                  ? null
                                  : lead.next_follow_up_at,
                              })
                              .eq("id", lead.id);
                            window.location.reload();
                          }}
                          className="form-checkbox form-checkbox-sm rounded"
                        />
                        <span className="ml-2 text-sm text-gray-600">
                          Mark as followed up
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}