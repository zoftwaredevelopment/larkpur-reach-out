import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const FOLLOW_UP_DAYS = 7;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    lead_id,
    channel,
    message_text,
    disapprove,
  } = body as {
    lead_id: string;
    channel?: "whatsapp" | "email";
    message_text?: string;
    disapprove?: boolean;
  };

  if (!lead_id) {
    return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (disapprove) {
    const { error } = await admin
      .from("larkspur_leads")
      .update({
        stage: "disqualified",
        disapproved_at: now,
        next_follow_up_at: null,
        updated_at: now,
      })
      .eq("id", lead_id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, disapproved: true });
  }

  if (!channel || !message_text?.trim()) {
    return NextResponse.json(
      { error: "channel and message_text required unless disapprove" },
      { status: 400 }
    );
  }

  const type = channel === "email" ? "email" : "whatsapp_sent";
  const notes = channel === "email" ? "email_paste" : null;

  const { error: intErr } = await admin.from("larkspur_interactions").insert({
    lead_id,
    type,
    reply_content: message_text.trim(),
    message_content: null,
    sent_at: now,
    replied_at: now,
    notes,
    user_id: user.id,
  });
  if (intErr) {
    return NextResponse.json({ error: intErr.message }, { status: 500 });
  }

  const nextFollowUp = new Date(Date.now() + FOLLOW_UP_DAYS * 24 * 60 * 60 * 1000);

  const { data: lead } = await admin
    .from("larkspur_leads")
    .select("stage")
    .eq("id", lead_id)
    .single();

  const stage =
    lead?.stage === "prospect" || !lead?.stage ? "contacted" : lead.stage;

  const { error: leadErr } = await admin
    .from("larkspur_leads")
    .update({
      stage,
      last_contacted_at: now,
      next_follow_up_at: nextFollowUp.toISOString(),
      updated_at: now,
    })
    .eq("id", lead_id);

  if (leadErr) {
    return NextResponse.json({ error: leadErr.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    stage,
    next_follow_up_at: nextFollowUp.toISOString(),
  });
}