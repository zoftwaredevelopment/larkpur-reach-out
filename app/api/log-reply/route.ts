import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type ParsedMessage = {
  timestamp: string | null;
  sender: string | null;
  content: string;
};

function parseChatHistory(chat: string): ParsedMessage[] {
  const lines = chat.split(/\r?\n/);
  const messages: ParsedMessage[] = [];

  // Common WhatsApp export formats:
  // 09/11/2026, 12:40:46 - Name: message
  // [09/11/2026, 12:40:46] Name: message
  // [09/11/2026, 12:40:46] ~Name: message
  // 09/11/2026, 12:40 PM - Name: message
  const patterns = [
    /^\[?(\d{1,2}\/\d{1,2}\/\d{4},\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM))?)\]?\s*[-–]?\s*~?([^:]+):\s*(.*)$/i,
    /^(\d{1,2}\/\d{1,2}\/\d{4},\s*\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)\s*-\s*([^:]+):\s*(.*)$/i,
  ];

  let current: ParsedMessage | null = null;

  const flush = () => {
    if (current && current.content.trim()) {
      messages.push(current);
    }
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    let matched = false;
    for (const re of patterns) {
      const m = line.match(re);
      if (m) {
        flush();
        current = {
          timestamp: normalizeWhatsAppTimestamp(m[1]),
          sender: m[2].trim().replace(/^~/, ""),
          content: m[3].trim(),
        };
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Continuation of previous message (multi-line)
      if (current) {
        current.content += "\n" + line;
      }
    }
  }
  flush();
  return messages;
}

function normalizeWhatsAppTimestamp(ts: string): string | null {
  try {
    const cleaned = ts.replace(/[\[\]]/g, "").trim();
    const parts = cleaned.split(",");
    if (parts.length < 2) return null;

    const datePart = parts[0].trim();
    const timePart = parts[1].trim();

    const dateMatch = datePart.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!dateMatch) return null;

    // WhatsApp can be DD/MM/YYYY or MM/DD/YYYY. For NG we assume DD/MM/YYYY.
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10);
    const year = parseInt(dateMatch[3], 10);

    const timeMatch = timePart.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
    if (!timeMatch) return null;

    let hour = parseInt(timeMatch[1], 10);
    const minute = parseInt(timeMatch[2], 10);
    const ampm = timeMatch[3]?.toUpperCase();

    if (ampm === "PM" && hour !== 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;

    const date = new Date(year, month - 1, day, hour, minute, 0, 0);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

function isFromOwner(sender: string | null): boolean {
  if (!sender) return false;
  const s = sender.toLowerCase();
  return s.includes("mishael") || s.includes("mishaelt") || s === "me" || s === "you";
}

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
    reply_content,
    chat_history,
    stage = "replied",
    outreach_method = "whatsapp",
  } = body as {
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

  // --- Single message mode ---
  if (reply_content && !chat_history) {
    const interactionType =
      outreach_method === "whatsapp"
        ? "whatsapp_reply"
        : outreach_method === "email"
          ? "email_reply"
          : "call";

    await admin.from("larkspur_interactions").insert({
      lead_id,
      type: interactionType,
      reply_content: reply_content.trim(),
      replied_at: now,
    });

    await admin
      .from("larkspur_leads")
      .update({
        stage,
        updated_at: now,
        ...(stage === "replied" ? { last_contacted_at: now } : {}),
      })
      .eq("id", lead_id);

    return NextResponse.json({ success: true, stage, added: 1 });
  }

  // --- Full chat history mode ---
  if (chat_history) {
    const parsed = parseChatHistory(chat_history);
    if (parsed.length === 0) {
      return NextResponse.json(
        { error: "No messages could be parsed from the chat history." },
        { status: 400 },
      );
    }

    // Load existing for dedupe (by normalized content)
    const { data: existing } = await admin
      .from("larkspur_interactions")
      .select("reply_content, message_content, type")
      .eq("lead_id", lead_id);

    const existingContents = new Set(
      (existing ?? [])
        .map((i: any) => (i.reply_content || i.message_content || "").trim().toLowerCase())
        .filter(Boolean),
    );

    const newMessages = parsed.filter((m) => {
      const content = m.content.trim();
      if (!content) return false;
      // skip pure system / media placeholders
      if (/^(image|video|audio|sticker|gif|document) omitted$/i.test(content)) return false;
      return !existingContents.has(content.toLowerCase());
    });

    const insertRows = newMessages.map((m) => {
      const mine = isFromOwner(m.sender);
      return {
        lead_id,
        type: mine ? "whatsapp_sent" : "whatsapp_reply",
        reply_content: m.content.trim(),
        replied_at: m.timestamp || now,
        // keep message_content empty or minimal so UI prefers reply_content
        message_content: null,
      };
    });

    let added = 0;
    if (insertRows.length > 0) {
      const { error } = await admin.from("larkspur_interactions").insert(insertRows);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      added = insertRows.length;
    }

    await admin
      .from("larkspur_leads")
      .update({
        stage,
        updated_at: now,
        ...(stage === "replied" ? { last_contacted_at: now } : {}),
      })
      .eq("id", lead_id);

    return NextResponse.json({
      success: true,
      stage,
      added,
      total_parsed: parsed.length,
      already_recorded: parsed.length - added,
    });
  }

  return NextResponse.json(
    { error: "reply_content or chat_history is required" },
    { status: 400 },
  );
}