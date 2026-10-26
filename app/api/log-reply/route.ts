import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lead_id, reply_content, stage = "replied", outreach_method = "whatsapp" } = (await request.json()) as {
    lead_id: string;
    reply_content: string;
    stage?: "replied" | "meeting" | "disqualified" | "unreachable";
    outreach_method?: "whatsapp" | "email" | "phone";
  };

  if (!lead_id || !reply_content) {
    return NextResponse.json({ error: "lead_id and reply_content are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Map outreach method to interaction type
  const interactionTypeMap: Record<string, string> = {
    whatsapp: "whatsapp_reply",
    email: "email_reply",
    phone: "call",
  };

  const messageContentMap: Record<string, string> = {
    whatsapp: "WhatsApp reply received",
    email: "Email reply received",
    phone: "Call received",
  };

  // Log the lead's reply as an interaction with outreach method
  await admin.from("larkspur_interactions").insert({
    lead_id,
    type: interactionTypeMap[outreach_method] || "whatsapp_reply",
    reply_content,
    outreach_method,
    replied_at: now,
  });

  // Update lead stage and timestamps
  await admin.from("larkspur_leads").update({
    stage,
    updated_at: now,
    ...(stage === "replied" ? { last_contacted_at: now } : {}),
  }).eq("id", lead_id);

  return NextResponse.json({ success: true, stage });
}