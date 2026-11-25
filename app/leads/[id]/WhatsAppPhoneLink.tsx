"use client";

import { useState, type MouseEvent } from "react";
import { buildWhatsAppUrl } from "@/lib/messaging/whatsapp";

interface WhatsAppPhoneLinkProps {
  phone: string;
  message: string | null;
  onGenerateMessage: () => Promise<string | null>;
  onOpen: (draft: string) => void;
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

  if (!phone?.trim()) {
    return <span className="text-gray-400">No phone</span>;
  }

  if (!href && message?.trim()) {
    return (
      <span className="text-gray-500" title="Number cannot be used in wa.me">
        {phone}
      </span>
    );
  }

  const handleClick = async (event: MouseEvent<HTMLAnchorElement>) => {
    // Always prepare draft first; DB write happens only on Good?
    if (message?.trim()) {
      onOpen(message.trim());
      return; // let browser open href
    }

    event.preventDefault();
    if (preparing) return;

    const chatWindow = window.open("about:blank", "_blank");
    if (chatWindow) {
      chatWindow.opener = null;
      chatWindow.document.title = "Preparing WhatsApp…";
      chatWindow.document.body.innerHTML =
        '<p style="font:14px system-ui;padding:24px">Preparing message…</p>';
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

      onOpen(draft);

      if (chatWindow && !chatWindow.closed) {
        chatWindow.location.href = chatUrl;
      } else {
        window.location.assign(chatUrl);
      }
    } catch (error) {
      chatWindow?.close();
      onError(error instanceof Error ? error.message : "Failed to prepare WhatsApp");
    } finally {
      setPreparing(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <a
        href={href || buildWhatsAppUrl(phone) || "#"}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-busy={preparing}
        className="text-green-700 font-medium hover:underline"
        title="Open WhatsApp — confirm Good? afterward to log"
      >
        {phone}
      </a>
      {preparing && <span className="text-xs text-gray-500">Drafting…</span>}
    </span>
  );
}