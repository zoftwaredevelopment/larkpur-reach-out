"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { WhatsAppPhoneLink } from "./WhatsAppPhoneLink";
import { EmailFallbackLink } from "./EmailFallbackLink";
import { createClient } from "@/lib/supabase/client";

interface LeadDetailProps {
  lead: any;
  interactions: any[];
  company: any;
  contact: any;
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    // Stable, locale-independent format (avoids hydration mismatch)
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy}, ${hh}:${min}`;
  } catch {
    return "";
  }
}

export function LeadDetailClient({
  lead,
  interactions: initialInteractions,
  company,
  contact,
}: LeadDetailProps) {
  const router = useRouter();
  const supabase = createClient();

  const [generating, setGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [interactions, setInteractions] = useState(initialInteractions || []);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [contactMethod, setContactMethod] = useState<"whatsapp" | "email" | "phone">("whatsapp");

  // Chat history paste
  const [chatHistoryInput, setChatHistoryInput] = useState("");
  const [chatHistorySaving, setChatHistorySaving] = useState(false);
  const [chatHistoryResult, setChatHistoryResult] = useState<{
    added: number;
    total: number;
    already: number;
  } | null>(null);

  const co = company || lead?.larkspur_companies || {};
  const c = contact || lead?.larkspur_contacts || {};

  const handleGenerateMessage = async (stage: string): Promise<string | null> => {
    setGenerating(true);
    setMessageError(null);
    setGeneratedMessage(null);

    try {
      const res = await fetch("/api/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id, stage }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate message");
      }

      const data = await res.json();
      const content = data.message?.content?.trim() || data.content?.trim();
      if (!content) throw new Error("Empty message returned");

      setGeneratedMessage(content);
      return content;
    } catch (err: any) {
      setMessageError(err.message || "Could not generate message");
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const saveChatHistory = async () => {
    if (!chatHistoryInput.trim()) return;
    setChatHistorySaving(true);
    setChatHistoryResult(null);
    setMessageError(null);

    try {
      const res = await fetch("/api/log-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.id,
          chat_history: chatHistoryInput.trim(),
          stage: "replied",
          outreach_method: contactMethod,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to log chat history");
      }

      const data = await res.json();
      setChatHistoryResult({
        added: data.added ?? 0,
        total: data.total_parsed ?? 0,
        already: data.already_recorded ?? 0,
      });

      // Refresh interactions from DB
      const { data: intData } = await supabase
        .from("larkspur_interactions")
        .select("*")
        .eq("lead_id", lead.id)
        .order("replied_at", { ascending: true })
        .order("created_at", { ascending: true });

      if (intData) setInteractions(intData);
      setChatHistoryInput("");
    } catch (err: any) {
      setMessageError(err.message || "Something went wrong");
    } finally {
      setChatHistorySaving(false);
    }
  };

  const handleClearHistory = async (scope: "lead" | "all") => {
    const confirmation =
      scope === "lead"
        ? "Clear all conversation history for this lead? This cannot be undone."
        : "Clear ALL conversation history? This will remove every interaction in your account and cannot be undone.";

    if (!window.confirm(confirmation)) return;

    setClearingHistory(true);
    setMessageError(null);

    try {
      const result =
        scope === "lead"
          ? await supabase
              .from("larkspur_interactions")
              .delete()
              .eq("lead_id", lead.id)
          : await supabase
              .from("larkspur_interactions")
              .delete()
              .not("id", "is", null);

      if (result.error) {
        throw new Error(result.error.message);
      }

      // This page displays only this lead's interactions.
      setInteractions([]);
      router.refresh();
      alert(
        scope === "lead"
          ? "This lead's conversation history has been cleared."
          : "All conversation history has been cleared."
      );
    } catch (err: any) {
      setMessageError(err.message || "Could not clear conversation history.");
    } finally {
      setClearingHistory(false);
    }
  };

  const disapprove = async () => {
    if (!confirm("Disapprove this lead? It will be removed from your active pipeline.")) return;

    const { error } = await supabase
      .from("larkspur_leads")
      .update({ stage: "disqualified", disapproved_at: new Date().toISOString() })
      .eq("id", lead.id);

    if (error) {
      alert(error.message);
      return;
    }
    router.push("/leads");
    router.refresh();
  };

  // You = blue/right. Client = white/left.
  const isFromMe = (int: any) => {
    const t = (int.type || "").toLowerCase();
    return t === "whatsapp_sent" || t.includes("sent");
  };

  // Prefer real message body. Never show the old wrapper text.
  const getBubbleText = (int: any) => {
    const raw = (int.reply_content || "").trim();
    if (raw && !/^whatsapp (message sent|reply received)/i.test(raw)) {
      return raw;
    }
    const fallback = (int.message_content || "")
      .replace(/^WhatsApp message sent to .+?:\s*/i, "")
      .replace(/^WhatsApp reply received from .+?:\s*/i, "")
      .trim();
    return fallback || "—";
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{co.name || "Lead"}</h1>
          <p className="text-gray-600 mt-1">Lead details</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/leads" className="text-blue-600 hover:text-blue-800 font-medium">
            ← Back to Leads
          </Link>
          <Link
            href="/follow-ups"
            className="px-4 py-2 bg-amber-100 text-amber-900 rounded hover:bg-amber-200 text-sm font-medium border border-amber-200"
          >
            ⚠ View Follow-ups Needed
          </Link>
          <button
            onClick={disapprove}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
          >
            Disapprove
          </button>
        </div>
      </div>

      {/* Company + Contact */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="p-6 border-b">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Company</p>
              <p className="text-lg font-medium text-gray-900">{co.name || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Industry</p>
              <p className="text-lg font-medium text-gray-900">{co.industry || "Not specified"}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">City</p>
              <p className="text-lg font-medium text-gray-900">{co.city || "Not specified"}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Stage</p>
              <p className="text-lg font-medium text-gray-900">{lead.stage}</p>
            </div>

            {/* Green WhatsApp */}
            <div>
              <p className="text-gray-500 mb-1">Phone (WhatsApp)</p>
              {co.phone || c.phone ? (
                <WhatsAppPhoneLink
                  phone={c.phone || co.phone}
                  message={generatedMessage}
                  onGenerateMessage={() => handleGenerateMessage("initial")}
                  onOpen={() => setContactMethod("whatsapp")}
                  onError={setMessageError}
                />
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </div>

            {/* Purple Email */}
            <div>
              <EmailFallbackLink
                key={lead.id}
                leadId={lead.id}
                onOpen={() => setContactMethod("email")}
              />
            </div>

            {co.website && (
              <div className="md:col-span-2">
                <p className="text-gray-500 mb-1">Website</p>
                <a
                  href={co.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {co.website}
                </a>
              </div>
            )}
          </div>
        </div>

        {(c.name || c.role) && (
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold mb-3">Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Name: </span>
                <span className="font-medium">{c.name || "—"}</span>
              </div>
              <div>
                <span className="text-gray-500">Role: </span>
                <span className="font-medium">{c.role || "—"}</span>
              </div>
              {c.phone && (
                <div>
                  <span className="text-gray-500">Phone: </span>
                  <WhatsAppPhoneLink
                    phone={c.phone}
                    message={generatedMessage}
                    onGenerateMessage={() => handleGenerateMessage("initial")}
                    onOpen={() => setContactMethod("whatsapp")}
                    onError={setMessageError}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========== CONVERSATION HISTORY ========== */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="p-6 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Conversation History</h2>
            <p className="text-sm text-gray-500">
              Your messages (Mishael) appear on the right in blue. Client messages on the left in white.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleClearHistory("lead")}
              disabled={clearingHistory || interactions.length === 0}
              className="px-3 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {clearingHistory ? "Clearing…" : "Clear This Lead"}
            </button>
            <button
              onClick={() => handleClearHistory("all")}
              disabled={clearingHistory}
              className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {clearingHistory ? "Clearing…" : "Clear All History"}
            </button>
          </div>
        </div>

        <div className="p-6 min-h-[200px] max-h-[520px] overflow-y-auto bg-gray-50 space-y-3">
          {interactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No messages yet. Paste a full WhatsApp chat below to import.
            </p>
          ) : (
            interactions.map((int: any) => {
              const mine = isFromMe(int);
              const text = getBubbleText(int);
              const time = int.replied_at || int.created_at;

              // Skip completely empty / pure wrapper rows
              if (!text || text === "—" || /^whatsapp (message sent|reply received)/i.test(text)) {
                return null;
              }

              return (
                <div
                  key={int.id || `${int.type}-${time}-${text.slice(0, 24)}`}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
                      mine
                        ? "bg-blue-600 text-white rounded-br-md"
                        : "bg-white text-gray-900 border border-gray-200 rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{text}</p>
                    {time && (
                      <p
                        className={`text-[10px] mt-1 ${
                          mine ? "text-blue-100" : "text-gray-400"
                        }`}
                      >
                        {formatTime(time)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Paste full chat */}
        <div className="p-6 border-t bg-white">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Paste full WhatsApp chat
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Copy the conversation from WhatsApp (with timestamps) and paste it here.
            Messages from <strong>Mishael</strong> become blue (you). Everything else becomes white (client).
            Already-saved messages are skipped.
          </p>

          <textarea
            value={chatHistoryInput}
            onChange={(e) => setChatHistoryInput(e.target.value)}
            rows={7}
            placeholder={`Example:\n[09/11/2026, 12:39:32] Mishael: Goodday! I'm Mishael from Larkspur...\n[09/11/2026, 12:40:46] ~International School of Management Lagos: Thank you Mishael\n[09/11/2026, 12:41:48] Mishael: Alright thank you for your time.`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />

          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <button
              onClick={saveChatHistory}
              disabled={chatHistorySaving || !chatHistoryInput.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              {chatHistorySaving ? "Importing…" : "Import Chat History"}
            </button>

            {chatHistoryResult && (
              <span className="text-sm text-gray-600">
                Parsed {chatHistoryResult.total} · Added {chatHistoryResult.added} · Already had{" "}
                {chatHistoryResult.already}
              </span>
            )}
          </div>

          {messageError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded text-red-700 text-sm">
              {messageError}
            </div>
          )}
        </div>
      </div>

      {/* Generate Message */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-2">Generate WhatsApp Message</h2>
        <p className="text-sm text-gray-600 mb-4">
          Generate a personalized message, then click the green number above to open WhatsApp with it pre-filled.
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={() => handleGenerateMessage("initial")}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {generating ? "Generating…" : "Generate Initial Message"}
          </button>
          <button
            onClick={() => handleGenerateMessage("follow_up_1")}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {generating ? "Generating…" : "Follow-up 1"}
          </button>
          <button
            onClick={() => handleGenerateMessage("follow_up_2")}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {generating ? "Generating…" : "Follow-up 2"}
          </button>
        </div>

        {generatedMessage && (
          <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Generated Message:</h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap mb-3">{generatedMessage}</p>
            <button
              onClick={() => navigator.clipboard.writeText(generatedMessage)}
              className="text-xs text-blue-600 hover:underline"
            >
              Copy to clipboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}