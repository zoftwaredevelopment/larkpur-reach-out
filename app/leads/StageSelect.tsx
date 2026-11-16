"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const STAGES = [
  { value: "prospect", label: "prospect" },
  { value: "contacted", label: "contacted" },
  { value: "replied", label: "replied" },
  { value: "meeting", label: "met" }, // DB: meeting, UI: met
  { value: "client", label: "client" },
  { value: "disqualified", label: "disqualified" },
  { value: "unreachable", label: "unreachable" },
] as const;

const stageColors: Record<string, string> = {
  prospect: "bg-gray-100 text-gray-800 border-gray-200",
  contacted: "bg-blue-100 text-blue-800 border-blue-200",
  replied: "bg-green-100 text-green-800 border-green-200",
  meeting: "bg-purple-100 text-purple-800 border-purple-200",
  client: "bg-emerald-100 text-emerald-800 border-emerald-200",
  disqualified: "bg-red-100 text-red-800 border-red-200",
  unreachable: "bg-orange-100 text-orange-800 border-orange-200",
};

export function StageSelect({
  leadId,
  currentStage,
}: {
  leadId: string;
  currentStage: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [stage, setStage] = useState(currentStage);
  const [saving, setSaving] = useState(false);

  const onChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    const prev = stage;
    setStage(next);
    setSaving(true);

    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("larkspur_leads")
        .update({
          stage: next,
          updated_at: now,
          ...(next === "meeting" || next === "contacted" || next === "replied"
            ? { last_contacted_at: now }
            : {}),
        })
        .eq("id", leadId);

      if (error) {
        setStage(prev);
        alert(error.message);
        return;
      }

      // Optional: log scoping call when moved to met
      if (next === "meeting") {
        await supabase.from("larkspur_interactions").insert({
          lead_id: leadId,
          type: "call",
          message_content: "15-minute scoping call completed",
          sent_at: now,
          notes: "scoping_call_confirmed",
        });
      }

      router.refresh();
    } catch (err: any) {
      setStage(prev);
      alert(err.message || "Failed to update stage");
    } finally {
      setSaving(false);
    }
  };

  return (
    <select
      value={stage}
      onChange={onChange}
      disabled={saving}
      className={`text-xs font-semibold rounded-full px-2 py-1 border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        stageColors[stage] || "bg-gray-100 text-gray-800 border-gray-200"
      } ${saving ? "opacity-50" : ""}`}
    >
      {STAGES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}