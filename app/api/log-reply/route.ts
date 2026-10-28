import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function parseChatHistory(chat: string): Array<{
  timestamp: string | null;
  sender: string | null;
  content: string;
}> {
  const lines = chat.split(/\r?\n/);
  const messages: Array<{ timestamp: string | null; sender: string | null; content: string }> = [];
  const exportRegex = /^(\d{1,2}\/\d{1,2}\/\d{4},\s*\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)\s*-\s*([^:]+):\s*(.*)$/;
  const simpleRegex = /^([^:]{1,60}):\s*(.*)$/;
  let current: { timestamp: string | null; sender: string | null; content: string } | null = null;
  const flush = () => { if (current) messages.push(current); current = null; };
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const exportMatch = line.match(exportRegex);
    if (exportMatch) {
      flush();
      current = {
        timestamp: normalizeWhatsAppTimestamp(exportMatch[1]),
        sender: exportMatch[2].trim(),
        content: exportMatch[3].trim(),
      };
      continue;
    }
    const simpleMatch = line.match(simpleRegex);
    if (simpleMatch && !current) {
      flush();
      current = { timestamp: null, sender: simpleMatch[1].trim(), content: simpleMatch[2].trim() };
      continue;
    }
    if (current) {
      current.content += "\n" + line;
    }
  }
  flush();
  return messages;
}

function normalizeWhatsAppTimestamp(ts: string): string | null {
  try {
    const parts = ts.split(",");
    if (parts.length < 2) return null;
    const datePart = parts[0].trim();
    const timePart = parts[1].trim();
    const dateMatch = datePart.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!dateMatch) return null;
    const month = parseInt(dateMatch[1], 10);
    const day = parseInt(dateMatch[2], 10);
    const year = parseInt(dateMatch[3], 10);
    const timeMatch = timePart.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!timeMatch) return null;
    let hour = parseInt(timeMatch[1], 10);
    const minute = parseInt(timeMatch[2], 10);
    const ampm = timeMatch[3]?.toUpperCase();
    if (ampm === "PM" && hour !== 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    const date = new Date(year, month - 1, day, hour, minute, 0, 0);
    return date.toISOString();
  } catch { return null; }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { lead_id, reply_content, chat_history, stage = "replied", outreach_method = "whatsapp" } = body as {
    lead_id: string;
    reply_content?: string;
    chat_history?: string;
    stage?: "replied" | "meeting" | "disqualified" | "unreachable";
    outreach_method?: "whatsapp" | "email" | "phone";
  };

  if (!lead_id) {
    return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const interactionTypeMap: Record<string, string> = {
    whatsapp: "whatsapp_reply",
    email: "email_reply",
    phone: "call",
  };

  // --- Single message mode (existing behaviour) ---
  if (reply_content && !chat_history) {
    await admin.from("larkspur_interactions").insert({
      lead_id,
      type: interactionTypeMap[outreach_method] || "whatsapp_reply",
      reply_content: reply_content.trim(),
      outreach_method,
      replied_at: now,
    });
    await admin.from("larkspur_leads").update({
      stage,
      updated_at: now,
      ...(stage === "replied" ? { last_contacted_at: now } : {}),
    }).eq("id", lead_id);
    return NextResponse.json({ success: true, stage, added: 1 });
  }

  // --- Full chat history mode (new behaviour) ---
  if (chat_history) {
    const parsed = parseChatHistory(chat_history);
    if (parsed.length === 0) {
      return NextResponse.json({ error: "No messages could be parsed from the chat history." }, { status: 400 });
    }

    const { data: existing } = await admin
      .from("larkspur_interactions")
      .select("reply_content")
      .eq("lead_id", lead_id)
      .eq("type", interactionTypeMap[outreach_method] || "whatsapp_reply");

    const existingContents = new Set((existing ?? []).map((i: any) => i.reply_content?.trim()).filter(Boolean));

    const newMessages = parsed.filter((m) => {
      const content = m.content.trim();
      if (!content || existingContents.has(content)) return false;
      return true;
    });

    const insertRows = newMessages.map((m) => ({
      lead_id,
      type: interactionTypeMap[outreach_method] || "whatsapp_reply",
      reply_content: m.content,
      outreach_method,
      replied_at: m.timestamp || now,
      message_content: `WhatsApp reply received${m.sender ? ` from ${m.sender}` : ""}`,
    }));

    let added = 0;
    if (insertRows.length > 0) {
      const { error } = await admin.from("larkspur_interactions").insert(insertRows);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      added = insertRows.length;
    }

    await admin.from("larkspur_leads").update({
      stage,
      updated_at: now,
      ...(stage === "replied" ? { last_contacted_at: now } : {}),
    }).eq("id", lead_id);

    return NextResponse.json({
      success: true,
      stage,
      added,
      total_parsed: parsed.length,
      already_recorded: parsed.length - added,
    });
  }

  return NextResponse.json({ error: "reply_content or chat_history is required" }, { status: 400 });
}
