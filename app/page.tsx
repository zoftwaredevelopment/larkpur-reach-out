import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

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

  const { count: contactedLeads } = await supabase
    .from("larkspur_leads")
    .select("*", { count: "exact", head: true })
    .eq("stage", "contacted");

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
  const { count: messagesToday } = await supabase
    .from("larkspur_interactions")
    .select("*", { count: "exact", head: true })
    .in("type", ["whatsapp_sent", "email", "call"])
    .gte("sent_at", startOfToday.toISOString());

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const { count: messagesThisWeek } = await supabase
    .from("larkspur_interactions")
    .select("*", { count: "exact", head: true })
    .in("type", ["whatsapp_sent", "email", "call"])
    .gte("sent_at", startOfWeek.toISOString());

  const { count: totalMessagesSent } = await supabase
    .from("larkspur_interactions")
    .select("*", { count: "exact", head: true })
    .in("type", ["whatsapp_sent", "email", "call"]);

  const { count: repliesToday } = await supabase
    .from("larkspur_interactions")
    .select("*", { count: "exact", head: true })
    .in("type", ["whatsapp_reply", "email_reply"])
    .gte("replied_at", startOfToday.toISOString());

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here&apos;s your outreach overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Leads</div>
          <div className="text-3xl font-bold text-gray-900">{totalLeads || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Contacted</div>
          <div className="text-3xl font-bold text-blue-600">{contactedLeads || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Reply Rate</div>
          <div className="text-3xl font-bold text-green-600">{replyRate}%</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Meeting Rate</div>
          <div className="text-3xl font-bold text-purple-600">{meetingRate}%</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Messages Sent Today</div>
          <div className="text-3xl font-bold text-blue-600">{messagesToday || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Messages Sent This Week</div>
          <div className="text-3xl font-bold text-indigo-600">{messagesThisWeek || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Messages Sent</div>
          <div className="text-3xl font-bold text-teal-600">{totalMessagesSent || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Replies Today</div>
          <div className="text-3xl font-bold text-emerald-600">{repliesToday || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          href="/leads"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="font-semibold text-gray-900 mb-2">View All Leads</h3>
          <p className="text-sm text-gray-600">Manage your outreach pipeline</p>
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