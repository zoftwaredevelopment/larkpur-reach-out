"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

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
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [replySaving, setReplySaving] = useState(false);
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

  const handleGenerateMessage = async (stage: string) => {
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
      setGeneratedMessage(data.message?.content || "");
    } catch (err: any) {
      setMessageError(err.message || "Something went wrong");
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
    if (!confirm("Disapprove this lead? This will permanently delete the company and lead from your pipeline.")) return;

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
    } catch (err: any) {
      setMessageError(err.message || "Something went wrong");
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
        body: JSON.stringify({ lead_id: lead.id, follow_up_days: 1, contact_method: contactMethod }),
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{company?.name}</h1>
      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
        <div><span className="font-medium">Industry:</span> {company?.industry || "—"}</div>
        <div><span className="font-medium">Location:</span> {company?.city}, {company?.state}</div>
        <div><span className="font-medium">Phone:</span> {company?.phone || "—"}</div>
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
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Contact</h2>
        {contact ? (
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Name:</span> {contact.name}</div>
            <div><span className="font-medium">Role:</span> {contact.role}</div>
            <div><span className="font-medium">Phone:</span> {contact.phone}</div>
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

      {/* Conversation History */}
      {interactions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Conversation History</h2>
          <div className="space-y-4">
            {interactions.map((int: any) => (
              <div
                key={int.id}
                className={`p-3 rounded ${
                  int.type === "whatsapp_reply"
                    ? "bg-green-50 border border-green-100"
                    : "bg-blue-50 border border-blue-100"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={`text-xs font-semibold uppercase ${
                      int.type === "whatsapp_reply" ? "text-green-800" : "text-blue-800"
                    }`}
                  >
                    {int.type === "whatsapp_reply" ? "Lead Replied" : "Message Sent"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(int.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-800">
                  {int.type === "whatsapp_reply" ? int.reply_content : int.message_content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lead's Response */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Log Lead's Response</h2>
        <p className="text-sm text-gray-600 mb-4">
          Enter what the lead said on WhatsApp so follow-up messages can reference
          their actual response.
        </p>

        <textarea
          value={replyInput}
          onChange={(e) => setReplyInput(e.target.value)}
          placeholder="e.g. 'Yes, we are hiring. Send me more info.' or 'Not interested right now.'"
          rows={3}
          className="w-full p-3 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={saveReply}
            disabled={replySaving || !replyInput.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
          >
            {replySaving ? "Saving…" : "Save Response"}
          </button>
          <button
            onClick={passToOwner}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium"
          >
            Pass to Business Owner
          </button>
          <button
            onClick={disapprove}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
          >
            Disapprove
          </button>
          <span className="text-xs text-gray-500 italic">
            {lead.stage === "meeting" ? "✓ Meeting-ready" : ""}
          </span>
        </div>
      </div>

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