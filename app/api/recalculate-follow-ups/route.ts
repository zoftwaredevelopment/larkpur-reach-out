import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const FOLLOW_UP_DAYS = 7;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Fetch all leads with their last_contacted_at
  const { data: leads, error: fetchError } = await admin
    .from("larkspur_leads")
    .select("id, last_contacted_at, next_follow_up_at");

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const now = new Date();
  const updates = leads.map((lead) => {
    // Recalculate: one week from last contact, or one week from now if never contacted
    const base = lead.last_contacted_at ? new Date(lead.last_contacted_at) : now;
    const nextFollowUp = new Date(base.getTime() + FOLLOW_UP_DAYS * 24 * 60 * 60 * 1000);

    return {
      id: lead.id,
      next_follow_up_at: nextFollowUp.toISOString(),
    };
  });

  // Apply updates individually (Supabase doesn't support bulk upsert of different values easily)
  const results = await Promise.all(
    updates.map((u) =>
      admin.from("larkspur_leads").update({ next_follow_up_at: u.next_follow_up_at }).eq("id", u.id)
    )
  );

  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Failed to update some leads", details: errors.map((e) => e.error?.message) },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    recalculated: updates.length,
    follow_up_days: FOLLOW_UP_DAYS,
  });
}
