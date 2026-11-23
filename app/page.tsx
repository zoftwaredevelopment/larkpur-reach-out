import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

function eventTime(row: {
  sent_at?: string | null;
  replied_at?: string | null;
  created_at?: string | null;
}): Date | null {
  const raw = row.sent_at || row.replied_at || row.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { count: totalLeads } = await supabase
    .from("larkspur_leads")
    .select("*", { count: "exact", head: true });

  const { count: repliedLeads } = await supabase
    .from("larkspur_leads")
    .select("*", { count: "exact", head: true })
    .eq("stage", "replied");

  const { count: meetingLeads } = await supabase
    .from("larkspur_leads")
    .select("*", { count: "exact", head: true })
    .eq("stage", "meeting");

  const replyRate = totalLeads ? Math.round((repliedLeads! / totalLeads) * 100) : 0;
  const meetingRate = repliedLeads ? Math.round((meetingLeads! / repliedLeads!) * 100) : 0;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Outbound touches (first message or follow-up — one company = one)
  const { data: outboundRows } = await supabase
    .from("larkspur_interactions")
    .select("id, type, notes, sent_at, replied_at, created_at, lead_id")
    .in("type", ["whatsapp_sent", "email", "call"]);

  const { data: replyRows } = await supabase
    .from("larkspur_interactions")
    .select("id, type, notes, sent_at, replied_at, created_at")
    .eq("type", "whatsapp_reply");

  const { data: clientEmailRows } = await supabase
    .from("larkspur_interactions")
    .select("id, type, notes, sent_at, replied_at, created_at")
    .eq("notes", "email_client_paste");

  const outbound = (outboundRows || []).filter(
    (r) => r.notes !== "follow_up_confirmed" && r.lead_id
  );

  const uniqueCompaniesSince = (since: Date) => {
    const ids = new Set<string>();
    for (const r of outbound) {
      const t = eventTime(r);
      if (t && t >= since) ids.add(r.lead_id as string);
    }
    return ids.size;
  };

  const companiesToday = uniqueCompaniesSince(startOfToday);
  const companiesThisWeek = uniqueCompaniesSince(startOfWeek);

  const replies = [...(replyRows || []), ...(clientEmailRows || [])];
  const repliesToday = replies.filter((r) => {
    const t = eventTime(r);
    return t != null && t >= startOfToday;
  }).length;

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here&apos;s your outreach overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Leads</div>
          <div className="text-3xl font-bold text-gray-900">{totalLeads || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Companies Messaged Today</div>
          <div className="text-3xl font-bold text-blue-600">{companiesToday}</div>
          <p className="text-xs text-gray-400 mt-1">Unique companies (1 per company)</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Companies Messaged This Week</div>
          <div className="text-3xl font-bold text-indigo-600">{companiesThisWeek}</div>
          <p className="text-xs text-gray-400 mt-1">Unique companies (1 per company)</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Reply Rate</div>
          <div className="text-3xl font-bold text-green-600">{replyRate}%</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Meeting Rate</div>
          <div className="text-3xl font-bold text-purple-600">{meetingRate}%</div>
          <p className="text-xs text-gray-400 mt-1">Stage set to met on Leads table</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Replies Today</div>
          <div className="text-3xl font-bold text-emerald-600">{repliesToday}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link
          href="/leads"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="font-semibold text-gray-900 mb-2">View All Leads</h3>
          <p className="text-sm text-gray-600">Prospects first — fresh outreach pile</p>
        </Link>
        <Link
          href="/activity"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border border-blue-100"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Outreach calendar</h3>
          <p className="text-sm text-gray-600">Daily unique companies contacted</p>
        </Link>
        <Link
          href="/companies-to-approve"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Approve Companies</h3>
          <p className="text-sm text-gray-600">Approve companies as leads</p>
        </Link>
        <Link
          href="/settings"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Settings</h3>
          <p className="text-sm text-gray-600">Configure searches and API keys</p>
        </Link>
      </div>
    </div>
  );
}