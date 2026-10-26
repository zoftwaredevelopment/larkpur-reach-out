import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMessage } from "@/lib/messaging/groq";
import { buildMessagePrompt } from "@/lib/messaging/prompts";
import type { MessageStage } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lead_id, stage, reply_content } = (await request.json()) as {
    lead_id: string;
    stage: MessageStage;
    reply_content?: string;
  };

  if (!lead_id || !stage) {
    return NextResponse.json({ error: "lead_id and stage are required" }, { status: 400 });
  }

  // Fetch lead with company and contact
  const { data: lead, error: leadError } = await supabase
    .from("larkspur_leads")
    .select("*, larkspur_companies(*), larkspur_contacts(*)")
    .eq("id", lead_id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const company = lead.larkspur_companies as any;
  const contact = lead.larkspur_contacts as any;

  // Generate message
  const prompt = buildMessagePrompt(company, contact, stage, reply_content);
  const result = await generateMessage(prompt);

  // Save message to database
  const { data: message, error: messageError } = await supabase
    .from("larkspur_messages")
    .insert({
      lead_id,
      stage,
      variant: result.message.variant,
      content: result.message.content,
    })
    .select()
    .single();

  if (messageError) {
    return NextResponse.json({ error: messageError.message }, { status: 500 });
  }

  return NextResponse.json({ message });
}