"use client";

import { useState, type MouseEvent } from "react";
import { buildWhatsAppUrl } from "@/lib/messaging/whatsapp";

interface WhatsAppPhoneLinkProps {
  phone: string;
  message: string | null;
  onGenerateMessage: () => Promise<string | null>;
  onOpen: () => void;
  onError: (message: string | null) => void;
}

export function WhatsAppPhoneLink({
  phone,
  message,
  onGenerateMessage,
  onOpen,
  onError,
}: WhatsAppPhoneLinkProps) {
  const [preparing, setPreparing] = useState(false);
  const href = buildWhatsAppUrl(phone, message);

  if (!href) {
    return (
      <span className="text-gray-500" title="This number cannot be used in a wa.me link">
        {phone}
      </span>
    );
  }

  const handleClick = async (event: MouseEvent<HTMLAnchorElement>) => {
    onOpen();

    // When a draft already exists, let the real wa.me hyperlink open normally.
    if (message?.trim()) return;

    event.preventDefault();
    if (preparing) return;

    // Open synchronously from the click so the browser does not block the tab
    // while Groq is generating the message.
    const chatWindow = window.open("about:blank", "_blank");
    if (chatWindow) {
      chatWindow.opener = null;
      chatWindow.document.title = "Preparing WhatsApp…";
      chatWindow.document.body.innerHTML =
        '<p style="font:14px system-ui;padding:24px">Preparing your Groq message…</p>';
    }

    setPreparing(true);
    onError(null);

    try {
      const draft = await onGenerateMessage();
      if (!draft) {
        chatWindow?.close();
        return;
      }

      const chatUrl = buildWhatsAppUrl(phone, draft);
      if (!chatUrl) {
        chatWindow?.close();
        onError("This phone number cannot be used in a wa.me link.");
        return;
      }

      if (chatWindow && !chatWindow.closed) {
        chatWindow.location.href = chatUrl;
      } else {
        // Popup blocked: use the current tab rather than losing the draft.
        window.location.assign(chatUrl);
      }
    } catch (error) {
      chatWindow?.close();
      onError(error instanceof Error ? error.message : "Failed to prepare WhatsApp message");
    } finally {
      setPreparing(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-busy={preparing}
        className="text-green-700 font-medium hover:underline"
        title="Open WhatsApp with a Groq-drafted message ready to review"
      >
        {phone}
      </a>
      {preparing && <span className="text-xs text-gray-500">Drafting message…</span>}
    </span>
  );
}
