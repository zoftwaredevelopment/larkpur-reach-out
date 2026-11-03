"use client";

import { useEffect, useState } from "react";

type EmailDraft = { email: string; subject: string; body: string };
type Status = "loading" | "ready" | "unavailable" | "error";

export function EmailFallbackLink({ leadId, onOpen }: { leadId: string; onOpen: () => void }) {
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/prepare-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: leadId, refresh: attempt > 0 }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        if (response.status === 404) {
          setStatus("unavailable");
          return;
        }
        if (!response.ok || !data?.draft) {
          throw new Error(data?.error || "Could not prepare the email fallback");
        }
        setDraft(data.draft);
        setStatus("ready");
      })
      .catch((reason) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "Could not prepare email");
        setStatus("error");
      });

    return () => { cancelled = true; };
  }, [leadId, attempt]);

  const retry = () => {
    setStatus("loading");
    setError(null);
    setDraft(null);
    setAttempt((value) => value + 1);
  };
  const href = draft
    ? `mailto:${draft.email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`
    : null;

  return (
    <div>
      <span className="font-medium">Email:</span>{" "}
      {status === "loading" && <span className="text-purple-600">Preparing email…</span>}
      {status === "ready" && draft && href && (
        <a
          href={href}
          onClick={onOpen}
          className="text-purple-700 font-medium hover:underline break-all"
          title={`Subject: ${draft.subject}`}
        >
          {draft.email}
        </a>
      )}
      {status === "unavailable" && (
        <button onClick={retry} className="text-gray-500 hover:text-purple-700 hover:underline" title="Search the website again">
          No public email found · retry
        </button>
      )}
      {status === "error" && (
        <button onClick={retry} className="text-purple-700 hover:underline" title={error || undefined}>
          Retry email preparation
        </button>
      )}
    </div>
  );
}
