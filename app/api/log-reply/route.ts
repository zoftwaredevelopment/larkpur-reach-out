import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DEFAULT_FOLLOW_UP_DAYS = 7;

type ParsedMessage = {
  timestamp: string | null;
  sender: string | null;
  content: string;
};

function parseChatHistory(chat: string): ParsedMessage[] {
  const lines = chat.split(/\r?\n/);
  const messages: ParsedMessage[] = [];

  // Full WhatsApp export lines (with timestamp)
  const stampedPatterns = [
    /^\[?(\d{1,2}\/\d{1,2}\/\d{4},\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM))?)\]?\s*[-–—]?\s*~?([^:]+):\s*(.*)$/i,
    /^(\d{1,2}\/\d{1,2}\/\d{4},\s*\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)\s*[-–—]\s*([^:]+):\s*(.*)$/i,
  ];

  // Sender without timestamp: "Mishael: hello" or "Client Name: hi"
  const senderOnly = /^~?([A-Za-z][^:]{0,80}):\s*(.+)$/;

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
    for (const re of stampedPatterns) {
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
      const m2 = line.match(senderOnly);
      if (m2) {
        flush();
        current = {
          timestamp: null,
          sender: m2[1].trim().replace(/^~/, ""),
          content: m2[2].trim(),
        };
        matched = true;
      }
    }

    if (!matched && current) {
      current.content += "\n" + line;
    }
  }
  flush();

  // Plain paste: no timestamps and no "Name:" headers — treat whole text as one outbound message from you
  if (messages.length === 0) {
    const plain = chat.trim();
    if (plain) {
      messages.push({
        timestamp: null,
        sender: "Mishael",
        content: plain,
      });
    }
  }

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
  if (!sender) return true; // plain paste with no sender → treat as you
  const s = sender.toLowerCase();
  return (
    s.includes("mishael") ||
    s.includes("mishaelt") ||
    s.includes("larkspur") ||
    s === "me" ||
    s === "you"
  );
}

function isClientInteraction(type: string, notes?: string | null): boolean {
  const t = (type || "").toLowerCase();
  if (t === "whatsapp_reply") return true;
  if (notes === "email_client_paste") return true;
  return false;
}

function nextFollowUpIso(fromIso: string, days = DEFAULT_FOLLOW_UP_DAYS): string {
  const d = new Date(fromIso);
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  return d.toISOString();
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
    outreach_method = "whatsapp",
    email_mode,
    speaker,
  } = body as {
    lead_id: string;
    reply_content?: string;
    chat_history?: string;
    outreach_method?: "whatsapp" | "email" | "phone";
    email_mode?: boolean;
    speaker?: "larkspur" | "client";
  };

  if (!lead_id) {
    return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // --- Single inbound reply ---
  if (reply_content && !chat_history) {
    const interactionType =
      outreach_method === "whatsapp"
        ? "whatsapp_reply"
        : outreach_method === "email"
          ? "note"
          : "call";

    await admin.from("larkspur_interactions").insert({
      lead_id,
      type: interactionType,
      reply_content: reply_content.trim(),
      replied_at: now,
      notes: outreach_method === "email" ? "email_client_paste" : null,
    });

    await admin
      .from("larkspur_leads")
      .update({
        stage: "replied",
        updated_at: now,
        last_contacted_at: now,
      })
      .eq("id", lead_id);

    return NextResponse.json({ success: true, stage: "replied", added: 1 });
  }

  // --- Email mode (manual Larkspur / Client) ---
  if (chat_history && email_mode) {
    const who = speaker === "larkspur" ? "larkspur" : "client";
    const content = String(chat_history).trim();
    if (!content) {
      return NextResponse.json({ error: "Paste some email content first." }, { status: 400 });
    }

    const { data: existing } = await admin
      .from("larkspur_interactions")
      .select("reply_content, message_content, type, notes")
      .eq("lead_id", lead_id);

    const existingContents = new Set(
      (existing ?? [])
        .map((i: any) => (i.reply_content || i.message_content || "").trim().toLowerCase())
        .filter(Boolean)
    );

    if (existingContents.has(content.toLowerCase())) {
      return NextResponse.json({
        success: true,
        stage: null,
        added: 0,
        total_parsed: 1,
        already_recorded: 1,
      });
    }

    const isMine = who === "larkspur";
    const type = isMine ? "email" : "note";
    const notes = isMine ? "email_paste" : "email_client_paste";

    const { error } = await admin.from("larkspur_interactions").insert({
      lead_id,
      type,
      reply_content: content,
      replied_at: now,
      message_content: null,
      notes,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const stage = isMine ? "contacted" : "replied";
    const leadUpdate: Record<string, unknown> = {
      stage,
      updated_at: now,
      last_contacted_at: now,
    };
    if (isMine) {
      leadUpdate.next_follow_up_at = nextFollowUpIso(now);
    }

    await admin.from("larkspur_leads").update(leadUpdate).eq("id", lead_id);

    return NextResponse.json({
      success: true,
      stage,
      added: 1,
      total_parsed: 1,
      already_recorded: 0,
    });
  }

  // --- WhatsApp chat history (export OR plain single message) ---
  if (chat_history) {
    const parsed = parseChatHistory(chat_history);
    if (parsed.length === 0) {
      return NextResponse.json(
        { error: "No messages could be parsed from the chat history." },
        { status: 400 }
      );
    }

    const { data: existing } = await admin
      .from("larkspur_interactions")
      .select("reply_content, message_content, type, notes")
      .eq("lead_id", lead_id);

    const existingContents = new Set(
      (existing ?? [])
        .map((i: any) => (i.reply_content || i.message_content || "").trim().toLowerCase())
        .filter(Boolean)
    );

    const newMessages = parsed.filter((m) => {
      const content = m.content.trim();
      if (!content) return false;
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
        message_content: null as string | null,
        notes: null as string | null,
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

    const hasClientInPaste = insertRows.some((r) => isClientInteraction(r.type, r.notes));
    const hasClientExisting = (existing ?? []).some((i: any) =>
      isClientInteraction(i.type || "", i.notes)
    );
    const hasClientMessage = hasClientInPaste || hasClientExisting;
    const hasOutboundInPaste = insertRows.some((r) => r.type === "whatsapp_sent");

    const stageUpdate: Record<string, unknown> = {
      updated_at: now,
      last_contacted_at: now,
    };

    if (hasClientMessage) {
      stageUpdate.stage = "replied";
    } else if (added > 0 && hasOutboundInPaste) {
      // First message logged = confirmation you sent outreach
      stageUpdate.stage = "contacted";
      stageUpdate.next_follow_up_at = nextFollowUpIso(now);
    } else if (added > 0) {
      stageUpdate.stage = "contacted";
      stageUpdate.next_follow_up_at = nextFollowUpIso(now);
    }

    await admin.from("larkspur_leads").update(stageUpdate).eq("id", lead_id);

    return NextResponse.json({
      success: true,
      stage: (stageUpdate.stage as string) || null,
      added,
      total_parsed: parsed.length,
      already_recorded: parsed.length - added,
      has_client_message: hasClientMessage,
    });
  }

  return NextResponse.json(
    { error: "reply_content or chat_history is required" },
    { status: 400 }
  );
}
