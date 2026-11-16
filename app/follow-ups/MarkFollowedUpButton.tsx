"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function MarkFollowedUpButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!confirm("Confirm you sent this follow-up? It will leave the list and count on the dashboard.")) {
      return;
    }
    setLoading(true);
    try {
      const now = new Date().toISOString();

      // 1. Log the follow-up so dashboard can count it
      const { error: intErr } = await supabase.from("larkspur_interactions").insert({
        lead_id: leadId,
        type: "whatsapp_sent",
        message_content: "Follow-up sent",
        sent_at: now,
        notes: "follow_up_confirmed",
      });
      if (intErr) throw new Error(intErr.message);

      // 2. Clear from follow-ups list
      const { error: leadErr } = await supabase
        .from("larkspur_leads")
        .update({
          next_follow_up_at: null,
          last_contacted_at: now,
          updated_at: now,
        })
        .eq("id", leadId);
      if (leadErr) throw new Error(leadErr.message);

      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to mark follow-up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50"
    >
      {loading ? "Saving…" : "Mark followed up"}
    </button>
  );
}