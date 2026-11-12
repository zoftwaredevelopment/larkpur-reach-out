"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { WhatsAppPhoneLink } from "./WhatsAppPhoneLink";
import { EmailFallbackLink } from "./EmailFallbackLink";
import { createClient } from "@/lib/supabase/client";

interface LeadDetailProps {
  lead: any;
  interactions: any[];
  company: any;
  contact: any;
}

export function LeadDetailClient({
  lead,
  interactions: initialInteractions,
  company,
  contact,
}: LeadDetailProps) {
  const router = useRouter();
  const supabase = createClient();

  const [generating, setGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [interactions, setInteractions] = useState(initialInteractions || []);
  const [contactMethod, setContactMethod] = useState<"whatsapp" | "email" | "phone">("whatsapp");

  const co = company || lead?.larkspur_companies || {};
  const c = contact || lead?.larkspur_contacts || {};

  const handleGenerateMessage = async (stage: string): Promise<string | null> => {
    setGenerating(true);
    setMessageError(null);
    setGeneratedMessage(null);

    try {
      const res = await fetch("/api/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id, stage }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate message");
      }

      const data = await res.json();
      const content = data.message?.content?.trim() || data.content?.trim();
      if (!content) throw new Error("Empty message returned");

      setGeneratedMessage(content);
      return content;
    } catch (err: any) {
      setMessageError(err.message || "Could not generate message");
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const disapprove = async () => {
    if (!confirm("Disapprove this lead? It will be removed from your active pipeline.")) return;

    const { error } = await supabase
      .from("larkspur_leads")
      .update({ stage: "disqualified", disapproved_at: new Date().toISOString() })
      .eq("id", lead.id);

    if (error) {
      alert(error.message);
      return;
    }
    router.push("/leads");
    router.refresh();
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{co.name || "Lead"}</h1>
          <p className="text-gray-600 mt-1">Lead details</p>
        </div>
        <div className="flex gap-2">
          <Link href="/leads" className="text-blue-600 hover:text-blue-800 font-medium">
            ← Back to Leads
          </Link>
          <Link
            href="/follow-ups"
            className="px-4 py-2 bg-amber-100 text-amber-900 rounded hover:bg-amber-200 text-sm font-medium border border-amber-200"
          >
            ⚠ View Follow-ups Needed
          </Link>
          <button
            onClick={disapprove}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
          >
            Disapprove
          </button>
        </div>
      </div>

      {/* Company + Contact card */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="p-6 border-b">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Company</p>
              <p className="text-lg font-medium text-gray-900">{co.name || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Industry</p>
              <p className="text-lg font-medium text-gray-900">{co.industry || "Not specified"}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">City</p>
              <p className="text-lg font-medium text-gray-900">{co.city || "Not specified"}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Stage</p>
              <p className="text-lg font-medium text-gray-900">{lead.stage}</p>
            </div>

            {/* Green WhatsApp number */}
            <div>
              <p className="text-gray-500 mb-1">Phone (WhatsApp)</p>
              {co.phone || c.phone ? (
                <WhatsAppPhoneLink
                  phone={c.phone || co.phone}
                  message={generatedMessage}
                  onGenerateMessage={() => handleGenerateMessage("initial")}
                  onOpen={() => setContactMethod("whatsapp")}
                  onError={setMessageError}
                />
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </div>

            {/* Purple Email */}
            <div>
              <EmailFallbackLink
                key={lead.id}
                leadId={lead.id}
                onOpen={() => setContactMethod("email")}
              />
            </div>

            {co.website && (
              <div className="md:col-span-2">
                <p className="text-gray-500 mb-1">Website</p>
                <a
                  href={co.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {co.website}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Contact person */}
        {(c.name || c.role) && (
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold mb-3">Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Name: </span>
                <span className="font-medium">{c.name || "—"}</span>
              </div>
              <div>
                <span className="text-gray-500">Role: </span>
                <span className="font-medium">{c.role || "—"}</span>
              </div>
              {c.phone && (
                <div>
                  <span className="text-gray-500">Phone: </span>
                  <WhatsAppPhoneLink
                    phone={c.phone}
                    message={generatedMessage}
                    onGenerateMessage={() => handleGenerateMessage("initial")}
                    onOpen={() => setContactMethod("whatsapp")}
                    onError={setMessageError}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conversation History */}
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Conversation History</h2>
          {interactions.length === 0 ? (
            <p className="text-gray-500">No interactions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Message</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {interactions.map((int: any) => (
                    <tr key={int.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {int.message_content || int.reply_content || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{int.type}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {int.created_at
                          ? new Date(int.created_at).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Generate Message */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-2">Generate WhatsApp Message</h2>
        <p className="text-sm text-gray-600 mb-4">
          Generate a personalized outreach message with Groq, then click the green number above to open WhatsApp with it pre-filled.
        </p>

        {messageError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded text-red-700 text-sm">
            {messageError}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={() => handleGenerateMessage("initial")}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {generating ? "Generating…" : "Generate Initial Message"}
          </button>
          <button
            onClick={() => handleGenerateMessage("follow_up_1")}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {generating ? "Generating…" : "Follow-up 1"}
          </button>
          <button
            onClick={() => handleGenerateMessage("follow_up_2")}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {generating ? "Generating…" : "Follow-up 2"}
          </button>
        </div>

        {generatedMessage && (
          <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Generated Message:</h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap mb-3">{generatedMessage}</p>
            <button
              onClick={() => navigator.clipboard.writeText(generatedMessage)}
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

//triggering a redeployment here