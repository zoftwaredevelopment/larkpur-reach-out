"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { WhatsAppPhoneLink } from "./WhatsAppPhoneLink";
import { EmailFallbackLink } from "./EmailFallbackLink";
import { createClient } from "@/lib/supabase/client";

interface LeadDetailProps {
  lead: any;
  interactions: any[];
  company: any;
  contact: any;
}

export function LeadDetailClient({ lead, interactions, company, contact }: LeadDetailProps) {
  const router = useRouter();
  const supabase = createClient();

  const [generating, setGenerating] = useState(false);
  const [disapproving, setDisapproving] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [replySaving, setReplySaving] = useState(false);
  const [chatHistoryInput, setChatHistoryInput] = useState("");
  const [chatHistorySaving, setChatHistorySaving] = useState(false);
  const [chatHistoryResult, setChatHistoryResult] = useState<{ added: number; total: number; already: number } | null>(null);
  const [contactMethod, setContactMethod] = useState<"whatsapp" | "email" | "phone">("whatsapp");

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const startEdit = (field: string, value: string | null) => {
    setEditValue(value || "");
    setEditingField(field);
  };
  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const [phoneEditing, setPhoneEditing] = useState<string | null>(null);
  const [phoneEditValue, setPhoneEditValue] = useState("");
  const [emailEditing, setEmailEditing] = useState<string | null>(null);
  const [emailEditValue, setEmailEditValue] = useState("");

  const handleGenerateMessage = async (stage: string): Promise<string | null> => {
    setGenerating(true);
    setMessageError(null);
    setGeneratedMessage(null);
    try {
      const { data: latestReply } = await supabase
        .from("larkspur_interactions")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      const contactMethod = lead.last_contact_method as "whatsapp" | "email" | "phone";
      const latestReplyContent = latestReply?.reply_content || latestReply?.message_content;
      if (stage === "replied") return latestReplyContent || "Meeting requested";
      if (stage === "meeting") return "Meeting requested";
      const { data: generated } = await supabase
        .from("larkspur_interactions")
        .select("*")
        .eq("lead_id", lead.id)
        .eq("type", "initial")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      const initialContent = generated?.message_content || `Hello, I'd like to connect with you about your business.`;
      return initialContent;
    } catch (error) {
      setMessageError("Could not generate message");
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const disapprove = async () => {
    if (!confirm("Disapprove this lead? This will permanently delete it from your pipeline.")) return;
    const admin = createClient();
    const { error: leadError } = await admin
      .from("larkspur_leads")
      .update({ disapproved_at: new Date().toISOString() })
      .eq("id", lead.id);
    if (leadError) {
      alert(leadError.message);
      return;
    }
    window.location.reload();
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{lead.larkspur_companies?.name}</h1>
          <p className="text-gray-600 mt-1">Lead details</p>
        </div>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Conversation History</h2>
          {interactions.length === 0 ? (
            <p className="text-gray-600 mb-4">No interactions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {interactions.map((int: any) => {
                    const isSent = int.type === "whatsapp_sent" || int.type === "email";
                    const timestamp = int.created_at ? new Date(int.created_at).toLocaleString() : "Just now";
                    return (
                      <tr key={int.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {isSent ? int.message_content?.replace(/^WhatsApp message sent to .+?:\\s*/, "").replace(/^WhatsApp reply received from .+?:\\s*/, "") : int.reply_content || int.message_content?.replace(/^WhatsApp message sent to .+?:\\s*/, "").replace(/^WhatsApp reply received from .+?:\\s*/, "") || ""}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{contact?.name || "—"}</div>
                          <div className="text-sm text-gray-500">{contact?.role || "—"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{int.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link href={`/leads/${lead.id}`} className="text-blue-600 hover:text-blue-900">View</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Generate WhatsApp Message</h2>
          <p className="text-sm text-gray-600 mb-4">Generate a personalized outreach message using Groq.</p>
          {messageError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded text-red-700 text-sm">
              {messageError}
            </div>
          )}
          <div className="grid grid-cols-1 gap-3">
            <button onClick={() => handleGenerateMessage("initial")} disabled={generating} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
              {generating ? "Generating..." : "Generate Initial Message"}
            </button>
            <button onClick={() => handleGenerateMessage("follow_up_1")} disabled={generating} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
              {generating ? "Generating..." : "Generate Follow-Up 1"}
            </button>
            <button onClick={() => handleGenerateMessage("follow_up_2")} disabled={generating} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
              {generating ? "Generating..." : "Generate Follow-Up 2"}
            </button>
          </div>
          {generatedMessage && (
            <div className="mt-6 p-4 bg-gray-50 rounded border border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Generated Message:</h3>
              <p className="text-sm text-gray-800 mb-3">{generatedMessage}</p>
              <button onClick={() => {}} className="text-xs text-blue-600 hover:underline">Copy to clipboard</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}