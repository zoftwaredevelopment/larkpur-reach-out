import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ActivityCalendar } from "./ActivityCalendar";

export const dynamic = "force-dynamic";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function toDateKey(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function eventIso(row: {
  sent_at?: string | null;
  replied_at?: string | null;
  created_at?: string | null;
}): string | null {
  return row.sent_at || row.replied_at || row.created_at || null;
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; day?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;

  const now = new Date();
  let year = now.getFullYear();
  let monthIndex = now.getMonth();
  if (params.month && /^\d{4}-\d{2}$/.test(params.month)) {
    const [y, m] = params.month.split("-").map(Number);
    year = y;
    monthIndex = m - 1;
  }

  const monthDate = new Date(year, monthIndex, 1);
  const rangeStart = startOfMonth(monthDate);
  const rangeEnd = endOfMonth(monthDate);

  // Fetch outbound; filter by coalesced date in JS (imports often lack sent_at)
  const { data: interactions } = await supabase
    .from("larkspur_interactions")
    .select(
      `
      id,
      type,
      sent_at,
      replied_at,
      created_at,
      notes,
      lead_id,
      larkspur_leads (
        id,
        stage,
        larkspur_companies ( name, city, industry )
      )
    `
    )
    .in("type", ["whatsapp_sent", "email", "call"]);

  const all = (interactions || []) as any[];

  type LeadInfo = {
    leadId: string;
    companyName: string;
    city: string | null;
    industry: string | null;
    stage: string | null;
    types: Set<string>;
  };

  const byDay = new Map<string, Map<string, LeadInfo>>();

  for (const row of all) {
    if (row.notes === "follow_up_confirmed") continue;

    const ts = eventIso(row);
    if (!ts) continue;
    const t = new Date(ts);
    if (t < rangeStart || t > rangeEnd) continue;

    const key = toDateKey(ts);
    if (!byDay.has(key)) byDay.set(key, new Map());
    const dayMap = byDay.get(key)!;

    const lead = asOne(row.larkspur_leads);
    const leadId: string | undefined = row.lead_id || lead?.id;
    if (!leadId) continue;

    const company = asOne(lead?.larkspur_companies);

    if (!dayMap.has(leadId)) {
      dayMap.set(leadId, {
        leadId,
        companyName: company?.name || "Unknown company",
        city: company?.city || null,
        industry: company?.industry || null,
        stage: lead?.stage || null,
        types: new Set(),
      });
    }
    dayMap.get(leadId)!.types.add(row.type);
  }

  // dayCounts = unique companies that day (matches list length)
  const dayCounts: Record<string, number> = {};
  const dayDetails: Record<
    string,
    Array<{
      leadId: string;
      companyName: string;
      city: string | null;
      industry: string | null;
      stage: string | null;
      channels: string[];
    }>
  > = {};

  for (const [key, dayMap] of byDay.entries()) {
    dayCounts[key] = dayMap.size;
    dayDetails[key] = Array.from(dayMap.values()).map((v) => ({
      leadId: v.leadId,
      companyName: v.companyName,
      city: v.city,
      industry: v.industry,
      stage: v.stage,
      channels: Array.from(v.types),
    }));
  }

  const monthParam = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const selectedDay =
    params.day && dayDetails[params.day] != null
      ? params.day
      : params.day && dayCounts[params.day] != null
        ? params.day
        : null;

  const prevMonth = new Date(year, monthIndex - 1, 1);
  const nextMonth = new Date(year, monthIndex + 1, 1);
  const prevParam = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const nextParam = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

  const monthLabel = monthDate.toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const monthTotal = Object.values(dayCounts).reduce((a, b) => a + b, 0);
  const activeDays = Object.keys(dayCounts).length;
  const selectedList = selectedDay ? dayDetails[selectedDay] || [] : [];

  const todayKey = toDateKey(now.toISOString());
  const todayCount = dayCounts[todayKey] || 0;

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Outreach activity</h1>
          <p className="text-gray-600 mt-1">
            Unique companies contacted per day (first touch or follow-up = 1)
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
            ← Dashboard
          </Link>
          <Link href="/leads" className="text-blue-600 hover:text-blue-800 font-medium">
            Leads
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="text-sm text-gray-500 mb-1">Companies today</div>
          <div className="text-3xl font-bold text-blue-600">{todayCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="text-sm text-gray-500 mb-1">Company-days this month</div>
          <div className="text-3xl font-bold text-indigo-600">{monthTotal}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="text-sm text-gray-500 mb-1">Active days this month</div>
          <div className="text-3xl font-bold text-teal-600">{activeDays}</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <Link
          href={`/activity?month=${prevParam}`}
          className="px-3 py-1.5 bg-gray-100 rounded hover:bg-gray-200 text-sm font-medium"
        >
          ← Prev
        </Link>
        <h2 className="text-lg font-semibold text-gray-900">{monthLabel}</h2>
        <Link
          href={`/activity?month=${nextParam}`}
          className="px-3 py-1.5 bg-gray-100 rounded hover:bg-gray-200 text-sm font-medium"
        >
          Next →
        </Link>
      </div>

      <ActivityCalendar
        year={year}
        monthIndex={monthIndex}
        dayCounts={dayCounts}
        selectedDay={selectedDay}
        monthParam={monthParam}
      />

      {selectedDay && (
        <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">
              {selectedDay} · {dayCounts[selectedDay] || 0} compan
              {(dayCounts[selectedDay] || 0) === 1 ? "y" : "ies"}
            </h3>
            <Link
              href={`/activity?month=${monthParam}`}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              Close
            </Link>
          </div>
          {selectedList.length === 0 ? (
            <p className="p-6 text-gray-500 text-sm">No companies logged this day.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {selectedList.map((c) => (
                <li
                  key={c.leadId}
                  className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-gray-50"
                >
                  <div>
                    <div className="font-medium text-gray-900">{c.companyName}</div>
                    <div className="text-sm text-gray-500">
                      {[c.city, c.industry, c.stage].filter(Boolean).join(" · ")}
                      {c.channels.length > 0 && (
                        <span className="ml-2 text-xs text-gray-400">
                          ({c.channels.join(", ")})
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/leads/${c.leadId}`}
                    className="inline-flex px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 whitespace-nowrap"
                  >
                    Open lead →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-6 text-xs text-gray-400">
        Each company counts once per day whether it was a first message or a follow-up. Calendar
        number always matches the list length.
      </p>
    </div>
  );
}