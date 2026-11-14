import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const stageColors: Record<string, string> = {
  prospect: "bg-gray-100 text-gray-800",
  contacted: "bg-blue-100 text-blue-800",
  replied: "bg-green-100 text-green-800",
  meeting: "bg-purple-100 text-purple-800",
  client: "bg-emerald-100 text-emerald-800",
  disqualified: "bg-red-100 text-red-800",
  unreachable: "bg-orange-100 text-orange-800",
};

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
      "id, stage, next_follow_up_at, larkspur_companies(name, industry, city), larkspur_contacts(name, role)"
    )
    .neq("stage", "disqualified")
    .neq("stage", "client")
    .neq("stage", "unreachable")
    .not("next_follow_up_at", "is", null)
    .order("next_follow_up_at", { ascending: true });

  const rows = leads || [];

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Follow-ups Needed</h1>
          <p className="text-gray-600 mt-1">
            {rows.length} lead{rows.length === 1 ? "" : "s"} due for follow-up
          </p>
        </div>
        <Link
          href="/leads"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Leads
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-green-600 mb-4">No follow-ups needed right now</p>
          <Link href="/leads" className="text-blue-600 hover:text-blue-800 font-medium">
            View Leads →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Company
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Industry
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    City
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Stage
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Due
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((lead: any) => (
                  <tr key={lead.id} className="hover:bg-amber-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {lead.larkspur_companies?.name || "—"}
                      </Link>
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
                      {lead.larkspur_companies?.city || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          stageColors[lead.stage] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {lead.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(lead.next_follow_up_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="inline-flex px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                      >
                        Open lead →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}