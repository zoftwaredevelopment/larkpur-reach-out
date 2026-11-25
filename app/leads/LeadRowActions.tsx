"use client";

import { useState, type MouseEvent } from "react";
import { buildWhatsAppUrl } from "@/lib/messaging/whatsapp";
import { SendConfirmBar } from "./SendConfirmBar";

export function LeadRowActions({
  leadId,
  phone,
  email,
}: {
  leadId: string;
  phone?: string | null;
  email?: string | null;
}) {
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    channel: "whatsapp" | "email";
    text: string;
  } | null>(null);

  const phoneTrim = (phone || "").trim();
  const emailTrim = (email || "").trim();

  const generateInitial = async (): Promise<string | null> => {
    const res = await fetch("/api/generate-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: leadId, stage: "initial" }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate message");
    }
    const data = await res.json();
    const content = data.message?.content?.trim() || data.content?.trim();
    if (!content) throw new Error("Empty message returned");
    return content;
  };

  const openWhatsApp = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!phoneTrim || preparing) return;

    setError(null);
    setPreparing(true);

    // Open blank tab immediately so popup blockers don't kill it after await
    const chatWindow = window.open("about:blank", "_blank");
    if (chatWindow) {
      chatWindow.opener = null;
      chatWindow.document.title = "Preparing WhatsApp…";
      chatWindow.document.body.innerHTML =
        '<p style="font:14px system-ui;padding:24px">Drafting message…</p>';
    }

    try {
      const draft = await generateInitial();
      if (!draft) {
        chatWindow?.close();
        return;
      }

      const url = buildWhatsAppUrl(phoneTrim, draft);
      if (!url) {
        chatWindow?.close();
        setError("Phone cannot be used in wa.me");
        return;
      }

      setPending({ channel: "whatsapp", text: draft });

      if (chatWindow && !chatWindow.closed) {
        chatWindow.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      chatWindow?.close();
      setError(err?.message || "Could not prepare WhatsApp");
    } finally {
      setPreparing(false);
    }
  };

  const openEmail = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!emailTrim || preparing) return;

    setError(null);
    setPreparing(true);

    try {
      const draft = await generateInitial();
      if (!draft) return;

      const subject = "Quick intro — Larkspur";
      const href = `mailto:${encodeURIComponent(emailTrim)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft)}`;
      setPending({ channel: "email", text: draft });
      window.location.href = href;
    } catch (err: any) {
      setError(err?.message || "Could not prepare email");
    } finally {
      setPreparing(false);
    }
  };

  return (
    <div className="space-y-2 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-2">
        {phoneTrim ? (
          <button
            type="button"
            onClick={openWhatsApp}
            disabled={preparing}
            className="px-2.5 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            title="Generate initial message and open WhatsApp"
          >
            {preparing ? "…" : "WhatsApp"}
          </button>
        ) : (
          <span className="text-xs text-gray-400">No phone</span>
        )}
        {emailTrim ? (
          <button
            type="button"
            onClick={openEmail}
            disabled={preparing}
            className="px-2.5 py-1 text-xs font-medium rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
            title="Generate message and open mail client"
          >
            Email
          </button>
        ) : null}
      </div>
      {error && <p className="text-xs text-red-600 max-w-[200px]">{error}</p>}
      {pending && (
        <SendConfirmBar
          leadId={leadId}
          channel={pending.channel}
          messageText={pending.text}
          onDone={() => setPending(null)}
          onDismiss={() => setPending(null)}
        />
      )}
    </div>
  );
}
