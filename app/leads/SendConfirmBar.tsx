"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export function SendConfirmBar({
  leadId,
  channel,
  messageText,
  onDone,
  onDismiss,
  unansweredOutboundCount = 0,
}: {
  leadId: string;
  channel: "whatsapp" | "email";
  messageText: string;
  onDone?: () => void;
  onDismiss?: () => void;
  /** outbound with no client reply — suggest disapprove at 2+ */
  unansweredOutboundCount?: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmSend = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/confirm-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadId,
          channel,
          message_text: messageText,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to log send");
      onDone?.();
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const disapprove = async () => {
    if (
      !window.confirm(
        "Disapprove this lead? No usable contact / rejected / two unanswered."
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/confirm-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, disapprove: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to disapprove");
      onDone?.();
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 p-3 rounded-lg border border-amber-200 bg-amber-50 space-y-2">
      <p className="text-sm text-amber-900 font-medium">
        Sent via {channel === "whatsapp" ? "WhatsApp" : "email"}? Confirm to log
        and leave the top of the pile.
      </p>
      {unansweredOutboundCount >= 2 && (
        <p className="text-xs text-red-700">
          {unansweredOutboundCount} outbound messages with no client reply —
          consider disapprove.
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={confirmSend}
          className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Good? ✓ Log & continue"}
        </button>
        <Link
          href={`/leads/${leadId}`}
          className="px-3 py-1.5 bg-white border border-gray-300 text-gray-800 text-xs font-medium rounded hover:bg-gray-50"
        >
          Open detail (edit / paste replies)
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={disapprove}
          className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50"
        >
          Disapprove
        </button>
        {onDismiss && (
          <button
            type="button"
            disabled={busy}
            onClick={onDismiss}
            className="px-3 py-1.5 text-xs text-gray-600 hover:underline"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}