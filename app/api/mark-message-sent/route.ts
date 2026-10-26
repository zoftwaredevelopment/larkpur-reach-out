import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lead_id, follow_up_days = 1, contact_method = "whatsapp" } = (await request.json()) as {
    lead_id: string;
    follow_up_days?: number;
    contact_method?: "whatsapp" | "email" | "phone";
  };

  if (!lead_id) {
    return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
  }

  const now = new Date();
  const nextFollowUp = new Date(now.getTime() + follow_up_days * 24 * 60 * 60 * 1000);

  const admin = createAdminClient();

  const { error: leadError } = await admin
    .from("larkspur_leads")
    .update({
      last_contacted_at: now.toISOString(),
      next_follow_up_at: nextFollowUp.toISOString(),
    })
    .eq("id", lead_id);

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 });
  }

  // Log the interaction with the contact method used
  const interactionTypeMap: Record<string, string> = {
    whatsapp: "whatsapp_sent",
    email: "email",
    phone: "call",
  };
  const messageContentMap: Record<string, string> = {
    whatsapp: "WhatsApp message sent",
    email: "Email sent",
    phone: "Phone call made",
  };

  await admin.from("larkspur_interactions").insert({
    lead_id,
    type: interactionTypeMap[contact_method] || "whatsapp_sent",
    message_content: messageContentMap[contact_method] || "Initial message sent",
    sent_at: now.toISOString(),
  });

  return NextResponse.json({
    success: true,
    last_contacted_at: now.toISOString(),
    next_follow_up_at: nextFollowUp.toISOString(),
  });
}