"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { WhatsAppPhoneLink } from "./WhatsAppPhoneLink";
import { EmailFallbackLink } from "./EmailFallbackLink";

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [disapproving, setDisapproving] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [replySaving, setReplySaving] = useState(false);
  const [chatHistoryInput, setChatHistoryInput] = useState("");
  const [chatHistorySaving, setChatHistorySaving] = useState(false);
  const [chatHistoryResult, setChatHistoryResult] = useState<{ added: number; total: number; already: number } | null>(null);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [contactMethod, setContactMethod] = useState<"whatsapp" | "email" | "phone">("whatsapp");

  useEffect(() => {
    let isMounted = true;

    const fetchLead = async () => {
      const resolvedParams = await params;
      const { data, error } = await supabase
        .from("larkspur_leads")
        .select("*, larkspur_companies(*), larkspur_contacts(*)")
        .eq("id", resolvedParams.id)
        .single();

      if (!isMounted) return;

      if (error || !data) {
        router.push("/leads");
        return;
      }

      setLead(data);

      // Fetch conversation history (replies)
      const { data: intData } = await supabase
        .from("larkspur_interactions")
        .select("*")
        .eq("lead_id", resolvedParams.id)
        .order("created_at", { ascending: true });

      if (intData) {
        setInteractions(intData);
      }

      setLoading(false);
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!isMounted) return;
      if (!user) {
        router.push("/login");
        return;
      }
      fetchLead();
    });

    return () => {
      isMounted = false;
    };
  }, [router, supabase, params]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!lead) return null;

  const company = lead.larkspur_companies as any;
  const contact = lead.larkspur_contacts as any;

  // Editable field state
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

  const startContactEdit = (field: string, value: string | null) => {
    if (field === "phone") {
      setPhoneEditValue(value || "");
      setPhoneEditing(field);
    } else if (field === "email") {
      setEmailEditValue(value || "");
      setEmailEditing(field);
    }
  };

  const cancelContactEdit = () => {
    setPhoneEditing(null);
    setEmailEditing(null);
    setPhoneEditValue("");
    setEmailEditValue("");
  };

  const saveContactEdit = async (field: string, recordId: string) => {
    try {
      await supabase
        .from("larkspur_contacts")
        .update({ [field]: field === "phone" ? phoneEditValue : emailEditValue })
        .eq("id", recordId);
      setPhoneEditing(null);
      setEmailEditing(null);
      setPhoneEditValue("");
      setEmailEditValue("");
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleGenerateMessage = async (stage: string): Promise<string | null> => {
    setGenerating(true);
    setMessageError(null);
    setGeneratedMessage(null);

    // Use the latest lead reply as context for follow-up messages
    const latestReply = interactions
      .filter((i: any) => i.type === "whatsapp_reply")
      .map((i: any) => i.reply_content)
      .pop();

    try {
      const res = await fetch("/api/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id, stage, reply_content: latestReply }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate message");
      }

      const data = await res.json();
      const content = data.message?.content?.trim();
      if (!content) {
        throw new Error("Groq returned an empty message");
      }

      setGeneratedMessage(content);
      return content;
    } catch (err: any) {
      setMessageError(err.message || "Something went wrong");
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const saveReply = async () => {
    if (!replyInput.trim()) return;
    setReplySaving(true);

    try {
      const res = await fetch("/api/log-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id, reply_content: replyInput.trim(), stage: "replied", outreach_method: contactMethod }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save reply");
      }

      setInteractions((prev: any[]) => [
        ...prev,
        { type: "whatsapp_reply", reply_content: replyInput.trim(), outreach_method: contactMethod, created_at: new Date().toISOString() },
      ]);
      setLead((prev: any) => ({ ...prev, stage: "replied" }));
      setReplyInput("");
    } catch (err: any) {
      setMessageError(err.message || "Something went wrong");
    } finally {
      setReplySaving(false);
    }
  };

  const saveChatHistory = async () => {
    if (!chatHistoryInput.trim()) return;
    setChatHistorySaving(true);
    setChatHistoryResult(null);

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
        const err = await res.json();
        throw new Error(err.error || "Failed to log chat history");
      }

      const data = await res.json();
      setChatHistoryResult({
        added: data.added ?? 0,
        total: data.total_parsed ?? 0,
        already: data.already_recorded ?? 0,
      });

      // Refresh interactions from server
      const { data: intData } = await supabase
        .from("larkspur_interactions")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: true });
      if (intData) {
        setInteractions(intData);
      }
      setLead((prev: any) => ({ ...prev, stage: "replied" }));
      setChatHistoryInput("");
    } catch (err: any) {
      setMessageError(err.message || "Something went wrong");
    } finally {
      setChatHistorySaving(false);
    }
  };

  const passToOwner = async () => {
    if (!confirm("Pass this lead to the business owner? This marks it as a meeting-ready lead.")) return;

    try {
      const res = await fetch("/api/log-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id, reply_content: replyInput.trim() || "Meeting requested", stage: "meeting", outreach_method: contactMethod }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to pass to owner");
      }

      setLead((prev: any) => ({ ...prev, stage: "meeting" }));
      setReplyInput("");
    } catch (err: any) {
      setMessageError(err.message || "Something went wrong");
    }
  };

  const disapprove = async () => {
    if (!confirm("Remove this lead from your active pipeline? It will be marked as disqualified and hidden from your leads.")) return;

    setDisapproving(true);
    setMessageError(null);

    try {
      const res = await fetch("/api/disapprove-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to disapprove");
      }

      router.push("/leads");
      router.refresh();
    } catch (err: any) {
      setMessageError(err.message || "Something went wrong");
      setDisapproving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleMarkMessageSent = async () => {
    try {
      const res = await fetch("/api/mark-message-sent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id, follow_up_days: 7, contact_method: contactMethod }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to mark message as sent");
      }

      const data = await res.json();
      setLead((prev: any) => ({
        ...prev,
        last_contacted_at: data.last_contacted_at,
        next_follow_up_at: data.next_follow_up_at,
      }));
    } catch (err: any) {
      setMessageError(err.message || "Something went wrong");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      <Link href="/leads">Back to Leads</Link>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{company?.name}</h1>
        <button
          onClick={disapprove}
          disabled={disapproving}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
        >
          {disapproving ? "Removing…" : "Disapprove lead"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
        <div><span className="font-medium">Industry:</span> {company?.industry || "—"}</div>
        <div><span className="font-medium">Location:</span> {company?.city}, {company?.state}</div>
        <div>
          <span className="font-medium">Phone:</span>{" "}
          {company?.phone ? (
            <WhatsAppPhoneLink
              phone={company.phone}
              message={generatedMessage}
              onGenerateMessage={() => handleGenerateMessage("initial")}
              onOpen={() => setContactMethod("whatsapp")}
              onError={setMessageError}
            />
          ) : (
            "—"
          )}
        </div>
        <EmailFallbackLink key={lead.id} leadId={lead.id} onOpen={() => setContactMethod("email")} />
        <div>
          <span className="font-medium">Website:</span>{" "}
          {company?.website ? (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {company.website}
            </a>
          ) : (
            "—"
          )}
        </div>
        <div><span className="font-medium">Stage:</span> <span className="font-bold">{lead.stage}</span></div>
        <div><span className="font-medium">Years Established:</span> {company?.years_established ?? "—"}</div>
        <div><span className="font-medium">Monthly Salary:</span> {company?.monthly_salary ? `$${company.monthly_salary}` : "—"}</div>
        <div><span className="font-medium">Deal Value:</span> {company?.deal_value ? `$${company.deal_value}` : "—"}</div>
        <div><span className="font-medium">Potential Talent:</span> {company?.potential_talent ?? "—"}</div>
        <div><span className="font-medium">Touch Point:</span> {company?.touch_point ?? "—"}</div>
        <div><span className="font-medium">Objections:</span> {lead.objections ?? "—"}</div>
        <div><span className="font-medium">Next Action:</span> {lead.next_action ?? "—"}</div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Contact</h2>
        {contact ? (
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Name:</span> {contact.name}</div>
            <div><span className="font-medium">Role:</span> {contact.role}</div>
            <div>
              <span className="font-medium">Phone:</span>{" "}
              {phoneEditing === "phone" ? (
                <>
                  <input
                    type="text"
                    value={phoneEditValue}
                    onChange={(e) => setPhoneEditValue(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => saveContactEdit("phone", contact.id)}
                    className="text-xs text-blue-600 px-2 py-1 hover:text-blue-800 mr-1"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setPhoneEditing(null)}
                    className="text-xs text-gray-600 px-2 py-1 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {contact.phone ? (
                    <span
                      onClick={() => startContactEdit("phone", contact.phone)}
                      className="cursor-pointer text-blue-600 hover:underline"
                    >
                      {contact.phone}
                    </span>
                  ) : (
                    <span onClick={() => startContactEdit("phone", null)} className="cursor-pointer text-blue-600 hover:underline">
                      Add phone
                    </span>
                  )}
                </>
              )}
            </div>
            <div>
              <span className="font-medium">Email:</span>{" "}
              {emailEditing === "email" ? (
                <>
                  <input
                    type="email"
                    value={emailEditValue}
                    onChange={(e) => setEmailEditValue(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => saveContactEdit("email", contact.id)}
                    className="text-xs text-blue-600 px-2 py-1 hover:text-blue-800 mr-1"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEmailEditing(null)}
                    className="text-xs text-gray-600 px-2 py-1 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {contact.email ? (
                    <span
                      onClick={() => startContactEdit("email", contact.email)}
                      className="cursor-pointer text-blue-600 hover:underline"
                    >
                      {contact.email}
                    </span>
                  ) : (
                    <span
                      onClick={() => startContactEdit("email", null)}
                      className="cursor-pointer text-blue-600 hover:underline"
                    >
                      Add email
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        ) : <p className="text-gray-500">No contact</p>}
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Message Tracking</h2>
        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={!!lead.last_contacted_at}
            onChange={handleMarkMessageSent}
            disabled={generating}
            className="w-5 h-5 text-blue-600 rounded border-gray-300"
          />
          <span className="text-sm font-medium text-gray-700">
            {lead.last_contacted_at ? "Initial message sent" : "Mark initial message as sent"}
          </span>
          {generating && <span className="text-xs text-gray-500">Saving...</span>}
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Contact Method</label>
          <div className="flex gap-3">
            {["whatsapp", "email", "phone"].map((method) => (
              <label key={method} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="contactMethod"
                  value={method}
                  checked={contactMethod === method}
                  onChange={() => setContactMethod(method as "whatsapp" | "email" | "phone")}
                  className="w-4 h-4 text-blue-600 border-gray-300"
                />
                {method === "whatsapp" ? "WhatsApp" : method === "email" ? "Email" : "Phone"}
              </label>
            ))}
          </div>
        </div>

        {lead.last_contacted_at && (
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium text-gray-900">Sent at:</span>
              <p>{new Date(lead.last_contacted_at).toLocaleString()}</p>
            </div>
            {lead.next_follow_up_at && (
              <div>
                <span className="font-medium text-gray-900">Next follow-up:</span>
                <p>{new Date(lead.next_follow_up_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        )}

        {messageError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded text-red-700 text-sm">
            {messageError}
          </div>
        )}
      </div>

      {/* Log Full Chat History */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Log Full WhatsApp Chat History</h2>
        <p className="text-sm text-gray-600 mb-4">
          Paste the entire WhatsApp chat (with timestamps). The app will only record messages
          that haven't been logged yet.
        </p>
        <textarea
          value={chatHistoryInput}
          onChange={(e) => setChatHistoryInput(e.target.value)}
          placeholder="Paste full WhatsApp chat here..."
          rows={8}
          className="w-full p-3 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-4"
        />
        {chatHistoryResult && (
          <div className={`mb-4 p-3 rounded text-sm ${
            chatHistoryResult.added > 0
              ? "bg-green-50 border border-green-100 text-green-800"
              : "bg-blue-50 border border-blue-100 text-blue-800"
          }`}
          >
            {chatHistoryResult.added > 0
              ? `Logged ${chatHistoryResult.added} new message(s) out of ${chatHistoryResult.total} parsed (${chatHistoryResult.already} already recorded).`
              : `No new messages — all ${chatHistoryResult.total} parsed message(s) were already recorded.`
          }
          </div>
        )}
        <button
          onClick={saveChatHistory}
          disabled={chatHistorySaving || !chatHistoryInput.trim()}
          className={`px-4 py-2 rounded text-sm font-medium ${
            chatHistorySaving || !chatHistoryInput.trim()
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {chatHistorySaving ? "Logging…" : "Log Chat History"}
        </button>
      </div>

      {/* Conversation History (chat style) */}
      {interactions.length > 0 && (
        <div className="bg-gray-50 rounded-lg shadow p-4 mb-6 min-h-[300px]">
          <div className="flex flex-col h-full max-h-[500px] overflow-y-auto pr-2 space-y-2 pb-2">
            {interactions.map((int: any) => {
              const isSent = int.type === "whatsapp_sent";
              const timestamp = new Date(
                int.replied_at || int.created_at || int.sent_at || int.created_at
              ).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <div
                  key={int.id}
                  className={`max-w-[85%] ${
                    isSent ? "ml-auto" : "mr-auto"
                  }`}
                >
                  <div
                    className={`p-3 rounded-lg ${
                      isSent
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : "bg-white text-gray-900 border border-gray-200 rounded-tl-none"
                    }`}
                  >
                    <p className="text-sm">{int.reply_content || int.message_content?.replace(/^WhatsApp message sent to .+?:\s*/, "").replace(/^WhatsApp reply received from .+?:\s*/, "") || ""}</p>
                    <div className="flex justify-between items-start mt-1">
                      <span className={`text-[10px] ${isSent ? "text-blue-100" : "text-gray-500"}`}>
                        {isSent ? "You" : contact?.name || "Lead"}
                      </span>
                      <span className={`text-[10px] ${isSent ? "text-blue-100" : "text-gray-500"}`}>
                        {timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Generate WhatsApp Message</h2>
        <p className="text-sm text-gray-600 mb-4">
          Generate a personalized outreach message using Groq.
        </p>

        {messageError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded text-red-700 text-sm">
            {messageError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => handleGenerateMessage("initial")}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {generating ? "Generating..." : "Generate Initial Message"}
          </button>
          <button
            onClick={() => handleGenerateMessage("follow_up_1")}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {generating ? "Generating..." : "Generate Follow-Up 1"}
          </button>
          <button
            onClick={() => handleGenerateMessage("follow_up_2")}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {generating ? "Generating..." : "Generate Follow-Up 2"}
          </button>
        </div>

        {generatedMessage && (
          <div className="mt-6 p-4 bg-gray-50 rounded border border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Generated Message:</h3>
            <p className="text-sm text-gray-800 mb-3">{generatedMessage}</p>
            <button
              onClick={() => copyToClipboard(generatedMessage || "")}
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