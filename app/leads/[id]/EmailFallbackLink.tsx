"use client";

import { useState, type MouseEvent } from "react";

interface EmailFallbackLinkProps {
  leadId: string;
  email: string | null | undefined;
  message: string | null;
  onGenerateMessage: () => Promise<string | null>;
  onOpen: (draft: string) => void;
  onError: (message: string | null) => void;
}

export function EmailFallbackLink({
  leadId,
  email,
  message,
  onGenerateMessage,
  onOpen,
  onError,
}: EmailFallbackLinkProps) {
  const [preparing, setPreparing] = useState(false);

  if (!email?.trim()) {
    return <span className="text-gray-400">No email</span>;
  }

  const buildMailto = (body: string) =>
    `mailto:${email.trim()}?subject=${encodeURIComponent(
      "Quick note"
    )}&body=${encodeURIComponent(body)}`;

  const handleClick = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (message?.trim()) {
      onOpen(message.trim());
      return;
    }

    event.preventDefault();
    if (preparing) return;

    setPreparing(true);
    onError(null);

    try {
      const draft = await onGenerateMessage();
      if (!draft) return;
      onOpen(draft);
      window.location.href = buildMailto(draft);
    } catch (e: any) {
      onError(e.message || "Failed to prepare email");
    } finally {
      setPreparing(false);
    }
  };

  const href = message?.trim() ? buildMailto(message.trim()) : `mailto:${email.trim()}`;

  return (
    <span className="inline-flex items-center gap-2">
      <a
        href={href}
        onClick={handleClick}
        className="text-purple-700 font-medium hover:underline break-all"
        title="Open email — confirm Good? afterward to log as Larkspur outbound"
      >
        {email}
      </a>
      {preparing && <span className="text-xs text-gray-500">Drafting…</span>}
    </span>
  );
}