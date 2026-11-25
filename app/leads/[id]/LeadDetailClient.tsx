"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useMemo } from "react";
import { WhatsAppPhoneLink } from "./WhatsAppPhoneLink";
import { EmailFallbackLink } from "./EmailFallbackLink";
import { SendConfirmBar } from "../SendConfirmBar";
import { createClient } from "@/lib/supabase/client";

const BLOCKED_BUBBLE_PHRASES = [
  "follow-up sent",
  "follow up sent",
  "email sent",
  "whatsapp message sent",
  "whatsapp reply received",
  "message sent",
  "15-minute scoping call",
  "scoping call completed",
];

function formatNaira(n: number | null | undefined) {
  if (n == null || isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(n));
}

function formatDateInput(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy}, ${hh}:${min}`;
  } catch {
    return "";
  }
}

export function LeadDetailClient({
  lead: initialLead,
  interactions: initialInteractions,
  company: initialCompany,
  contact: initialContact,
}: {
  lead: any;
  interactions: any[];
  company: any;
  contact: any;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [lead, setLead] = useState(initialLead);
  const [company, setCompany] = useState(
    initialCompany || initialLead?.larkspur_companies || {}
  );
  const [contact, setContact] = useState(
    initialContact || initialLead?.larkspur_contacts || {}
  );
  const [interactions, setInteractions] = useState(initialInteractions || []);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [pendingSend, setPendingSend] = useState<{
    channel: "whatsapp" | "email";
    text: string;
  } | null>(null);

  const [historyMode, setHistoryMode] = useState<"whatsapp" | "email">("whatsapp");
  const [emailSpeaker, setEmailSpeaker] = useState<"larkspur" | "client">("client");
  const [chatHistoryInput, setChatHistoryInput] = useState("");
  const [chatHistorySaving, setChatHistorySaving] = useState(false);
  const [chatHistoryResult, setChatHistoryResult] = useState<{
    added: number;
    total: number;
    already: number;
  } | null>(null);

  const [form, setForm] = useState({
    years_established: company?.years_established ?? "",
    monthly_salary: company?.monthly_salary ?? "",
    company_notes: company?.notes ?? "",
    contact_name: contact?.name ?? "",
    contact_role: contact?.role ?? "",
    contact_phone: contact?.phone || company?.phone || "",
    contact_email: contact?.email || company?.email || "",
    stage: lead?.stage ?? "prospect",
    last_contacted_at: formatDateInput(lead?.last_contacted_at),
    objections: lead?.objections ?? "",
    next_action: lead?.next_action ?? "",
    lead_notes: lead?.notes ?? "",
  });

  const computedDealValue = useMemo(() => {
    const salary = parseFloat(String(form.monthly_salary).replace(/,/g, ""));
    if (!salary || isNaN(salary)) return null;
    return Math.round(0.15 * salary * 12);
  }, [form.monthly_salary]);

  const updateForm = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const startEditing = () => {
    setForm({
      years_established: company?.years_established ?? "",
      monthly_salary: company?.monthly_salary ?? "",
      company_notes: company?.notes ?? "",
      contact_name: contact?.name ?? "",
      contact_role: contact?.role ?? "",
      contact_phone: contact?.phone || company?.phone || "",
      contact_email: contact?.email || company?.email || "",
      stage: lead?.stage ?? "prospect",
      last_contacted_at: formatDateInput(lead?.last_contacted_at),
      objections: lead?.objections ?? "",
      next_action: lead?.next_action ?? "",
      lead_notes: lead?.notes ?? "",
    });
    setEditing(true);
    setSaveMsg(null);
  };

  const isFromMe = (int: any) => {
    if (int.notes === "email_client_paste") return false;
    const t = (int.type || "").toLowerCase();
    if (t === "whatsapp_reply") return false;
    if (t === "whatsapp_sent" || t === "email" || t === "call") return true;
    if (t.includes("sent") || t.includes("outbound")) return true;
    if (int.notes === "follow_up_confirmed") return true;
    if (t === "note") return false;
    return false;
  };

  const getBubbleText = (int: any) => {
    const raw = (int.reply_content || "").trim();
    if (raw) return raw;
    return (int.message_content || "").trim();
  };

  const shouldShowBubble = (int: any) => {
    if (int.notes === "follow_up_confirmed") return false;
    const text = getBubbleText(int);
    if (!text) return false;
    const lower = text.toLowerCase();
    if (BLOCKED_BUBBLE_PHRASES.some((b) => lower === b || lower.startsWith(b))) {
      return false;
    }
    if (/^whatsapp (message sent|reply received)/i.test(text)) return false;
    return true;
  };

  const saveChatHistory = async () => {
    if (!chatHistoryInput.trim()) return;
    setChatHistorySaving(true);
    setChatHistoryResult(null);
    setMessageError(null);
    try {
      const payload: any = {
        lead_id: lead.id,
        chat_history: chatHistoryInput.trim(),
        outreach_method: historyMode === "email" ? "email" : "whatsapp",
      };
      if (historyMode === "email") {
        payload.email_mode = true;
        payload.speaker = emailSpeaker;
      }
      const res = await fetch("/api/log-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to log history");
      }
      const data = await res.json();
      setChatHistoryResult({
        added: data.added ?? 0,
        total: data.total_parsed ?? 0,
        already: data.already_recorded ?? 0,
      });
      const { data: intData } = await supabase
        .from("larkspur_interactions")
        .select("*")
        .eq("lead_id", lead.id)
        .order("replied_at", { ascending: true })
        .order("created_at", { ascending: true });
      if (intData) setInteractions(intData);
      setChatHistoryInput("");
      router.refresh();
    } catch (err: any) {
      setMessageError(err.message || "Something went wrong");
    } finally {
      setChatHistorySaving(false);
    }
  };

  const clearHistory = async () => {
    if (!window.confirm("Delete ALL conversation history for this lead? This cannot be undone.")) return;
    const { error } = await supabase.from("larkspur_interactions").delete().eq("lead_id", lead.id);
    if (error) {
      alert(error.message);
      return;
    }
    setInteractions([]);
    setChatHistoryResult(null);
  };

  const saveDetails = async () => {
    setSaving(true);
    setSaveMsg(null);
    setMessageError(null);
    try {
      const salaryNum = form.monthly_salary
        ? parseFloat(String(form.monthly_salary).replace(/,/g, ""))
        : null;
      const dealValue =
        salaryNum && !isNaN(salaryNum)
          ? Math.round(0.15 * salaryNum * 12)
          : null;
      const yearsNum = form.years_established
        ? parseInt(String(form.years_established), 10)
        : null;

      if (company?.id) {
        const { error: coErr } = await supabase
          .from("larkspur_companies")
          .update({
            years_established: yearsNum,
            monthly_salary: salaryNum,
            notes: form.company_notes || null,
            phone: form.contact_phone || null,
          })
          .eq("id", company.id);
        if (coErr) throw new Error(coErr.message);
        setCompany((prev: any) => ({
          ...prev,
          years_established: yearsNum,
          monthly_salary: salaryNum,
          deal_value: dealValue,
          notes: form.company_notes || null,
          phone: form.contact_phone || null,
        }));
      }

      if (contact?.id) {
        const { error: cErr } = await supabase
          .from("larkspur_contacts")
          .update({
            name: form.contact_name || null,
            role: form.contact_role || null,
            phone: form.contact_phone || null,
            email: form.contact_email || null,
          })
          .eq("id", contact.id);
        if (cErr) throw new Error(cErr.message);
        setContact((prev: any) => ({
          ...prev,
          name: form.contact_name || null,
          role: form.contact_role || null,
          phone: form.contact_phone || null,
          email: form.contact_email || null,
        }));
      } else if (form.contact_phone || form.contact_email || form.contact_name) {
        const insertPayload: any = {
          name: form.contact_name || null,
          role: form.contact_role || null,
          phone: form.contact_phone || null,
          email: form.contact_email || null,
        };
        if (company?.id) insertPayload.company_id = company.id;
        const { data: newContact, error: insErr } = await supabase
          .from("larkspur_contacts")
          .insert(insertPayload)
          .select()
          .single();
        if (insErr) throw new Error(insErr.message);
        if (newContact?.id) {
          await supabase
            .from("larkspur_leads")
            .update({ contact_id: newContact.id })
            .eq("id", lead.id);
          setContact(newContact);
        }
      }

      const lastContacted = form.last_contacted_at
        ? new Date(form.last_contacted_at).toISOString()
        : null;

      const { error: lErr } = await supabase
        .from("larkspur_leads")
        .update({
          stage: form.stage,
          last_contacted_at: lastContacted,
          objections: form.objections || null,
          next_action: form.next_action || null,
          notes: form.lead_notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id);
      if (lErr) throw new Error(lErr.message);

      setLead((prev: any) => ({
        ...prev,
        stage: form.stage,
        last_contacted_at: lastContacted,
        objections: form.objections || null,
        next_action: form.next_action || null,
        notes: form.lead_notes || null,
      }));

      setSaveMsg("Saved");
      setEditing(false);
      router.refresh();
    } catch (err: any) {
      setMessageError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateMessage = async (
    stage: string
  ): Promise<string | null> => {
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
      const content =
        data.message?.content?.trim() || data.content?.trim();
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
    if (
      !window.confirm(
        "Disapprove this lead? It will be removed from your active pipeline."
      )
    )
      return;
    try {
      const res = await fetch("/api/disapprove-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to disapprove lead");
        return;
      }
      router.push("/leads");
      router.refresh();
    } catch {
      alert("Something went wrong");
    }
  };

  const livePhone = contact?.phone || company?.phone || form.contact_phone || "";
  const liveEmail = contact?.email || company?.email || form.contact_email || "";
  const displaySalary = editing ? form.monthly_salary : company?.monthly_salary;
  const displayDeal = editing
    ? computedDealValue
    : company?.deal_value ?? computedDealValue;

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {company?.name || "Lead"}
          </h1>
          <p className="text-gray-600 mt-1">Lead details</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Link href="/leads" className="text-blue-600 hover:text-blue-800 font-medium">
            ← Back to Leads
          </Link>
          <Link
            href="/follow-ups"
            className="px-4 py-2 bg-amber-100 text-amber-900 rounded hover:bg-amber-200 text-sm font-medium border border-amber-200"
          >
            ⚠ Follow-ups
          </Link>
          {!editing ? (
            <button
              onClick={startEditing}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-medium"
            >
              Edit details
            </button>
          ) : (
            <>
              <button
                onClick={saveDetails}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setEditing(false)}
                disabled={saving}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm font-medium"
              >
                Cancel
              </button>
            </>
          )}
          <button
            onClick={disapprove}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
          >
            Disapprove
          </button>
        </div>
      </div>

      {saveMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
          {saveMsg}
        </div>
      )}
      {messageError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded text-red-700 text-sm">
          {messageError}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold mb-4">Company</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Company Name</p>
              <p className="text-lg font-medium">{company?.name || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Location</p>
              <p className="text-lg font-medium">
                {[company?.city, company?.state].filter(Boolean).join(", ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Industry</p>
              <p className="text-lg font-medium">{company?.industry || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Years Established</p>
              {editing ? (
                <input
                  type="number"
                  value={form.years_established}
                  onChange={(e) => updateForm("years_established", e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              ) : (
                <p className="text-lg font-medium">{company?.years_established ?? "—"}</p>
              )}
            </div>
            <div>
              <p className="text-gray-500 mb-1">Monthly salary (GAS)</p>
              {editing ? (
                <input
                  type="number"
                  value={form.monthly_salary}
                  onChange={(e) => updateForm("monthly_salary", e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              ) : (
                <p className="text-lg font-medium">{formatNaira(displaySalary)}</p>
              )}
            </div>
            <div>
              <p className="text-gray-500 mb-1">Deal Value (15% × 12)</p>
              <p className="text-lg font-medium text-emerald-700">{formatNaira(displayDeal)}</p>
            </div>
          </div>
        </div>

        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold mb-4">Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Name</p>
              {editing ? (
                <input type="text" value={form.contact_name} onChange={(e) => updateForm("contact_name", e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              ) : (
                <p className="text-lg font-medium">{contact?.name || "—"}</p>
              )}
            </div>
            <div>
              <p className="text-gray-500 mb-1">Role</p>
              {editing ? (
                <input type="text" value={form.contact_role} onChange={(e) => updateForm("contact_role", e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              ) : (
                <p className="text-lg font-medium">{contact?.role || "—"}</p>
              )}
            </div>
            <div>
              <p className="text-gray-500 mb-1">Phone (WhatsApp)</p>
              {editing ? (
                <input type="text" value={form.contact_phone} onChange={(e) => updateForm("contact_phone", e.target.value)} placeholder="e.g. 0803… or +234…" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              ) : livePhone ? (
                <WhatsAppPhoneLink
                  phone={livePhone}
                  message={generatedMessage}
                  onGenerateMessage={() => handleGenerateMessage("initial")}
                  onOpen={(draft) => setPendingSend({ channel: "whatsapp", text: draft })}
                  onError={setMessageError}
                />
              ) : (
                <p className="text-lg font-medium text-gray-400">No phone</p>
              )}
            </div>
            <div>
              <p className="text-gray-500 mb-1">Email</p>
              {editing ? (
                <input type="email" value={form.contact_email} onChange={(e) => updateForm("contact_email", e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              ) : liveEmail ? (
                <EmailFallbackLink
                  leadId={lead.id}
                  email={liveEmail}
                  message={generatedMessage}
                  onGenerateMessage={() => handleGenerateMessage("initial")}
                  onOpen={(draft) => setPendingSend({ channel: "email", text: draft })}
                  onError={setMessageError}
                />
              ) : (
                <p className="text-lg font-medium text-gray-400">No email</p>
              )}
            </div>
          </div>
          {pendingSend && (
            <SendConfirmBar
              leadId={lead.id}
              channel={pendingSend.channel}
              messageText={pendingSend.text}
              onDone={() => setPendingSend(null)}
              onDismiss={() => setPendingSend(null)}
            />
          )}
        </div>

        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Lead status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Stage</p>
              {editing ? (
                <select value={form.stage} onChange={(e) => updateForm("stage", e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  {["prospect", "contacted", "replied", "meeting", "client", "disqualified", "unreachable"].map((s) => (
                    <option key={s} value={s}>{s === "meeting" ? "met" : s}</option>
                  ))}
                </select>
              ) : (
                <p className="text-lg font-medium">{lead?.stage === "meeting" ? "met" : lead?.stage || "—"}</p>
              )}
            </div>
            <div>
              <p className="text-gray-500 mb-1">Last contacted</p>
              {editing ? (
                <input type="date" value={form.last_contacted_at} onChange={(e) => updateForm("last_contacted_at", e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              ) : (
                <p className="text-lg font-medium">{lead?.last_contacted_at ? formatTime(lead.last_contacted_at).slice(0, 10) : "—"}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <p className="text-gray-500 mb-1">Notes</p>
              {editing ? (
                <textarea value={form.lead_notes} onChange={(e) => updateForm("lead_notes", e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              ) : (
                <p className="font-medium whitespace-pre-wrap">{lead?.notes || "—"}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Generate WhatsApp message</h2>
        <p className="text-sm text-gray-600 mb-4">
          Generate, then use the green phone link (or list Outreach) to open WhatsApp. Confirm Good? afterward to log.
        </p>
        <div className="flex flex-wrap gap-3 mb-4">
          {["initial", "follow_up_1", "follow_up_2"].map((stage) => (
            <button
              key={stage}
              onClick={() => handleGenerateMessage(stage)}
              disabled={generating}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {generating ? "Generating…" : stage.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        {generatedMessage && (
          <div className="p-4 bg-gray-50 rounded border border-gray-200">
            <p className="text-sm whitespace-pre-wrap mb-2">{generatedMessage}</p>
            <button type="button" onClick={() => navigator.clipboard.writeText(generatedMessage)} className="text-xs text-blue-600 hover:underline">
              Copy to clipboard
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-1">Conversation History</h2>
            <p className="text-sm text-gray-500">
              You on the right in blue. Client on the left in white.
            </p>
          </div>
          {interactions.length > 0 && (
            <button type="button" onClick={clearHistory} className="text-xs text-red-600 hover:underline">
              Clear all
            </button>
          )}
        </div>

        <div className="p-6 space-y-3 max-h-96 overflow-y-auto bg-gray-50">
          {interactions.filter(shouldShowBubble).length === 0 ? (
            <p className="text-sm text-gray-400">No messages yet. Paste a chat below or confirm an outreach.</p>
          ) : (
            interactions.map((int: any) => {
              if (!shouldShowBubble(int)) return null;
              const mine = isFromMe(int);
              const text = getBubbleText(int);
              const time = int.replied_at || int.created_at;
              return (
                <div key={int.id || `${int.type}-${time}-${text.slice(0, 24)}`} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
                    mine
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-white text-gray-900 border border-gray-200 rounded-bl-md"
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{text}</p>
                    <p className={`text-[10px] mt-1 ${mine ? "text-blue-100" : "text-gray-400"}`}>
                      {formatTime(time || "")}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-6 border-t space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setHistoryMode("whatsapp")}
              className={`px-3 py-1.5 text-xs rounded font-medium ${
                historyMode === "whatsapp" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              WhatsApp paste
            </button>
            <button
              type="button"
              onClick={() => setHistoryMode("email")}
              className={`px-3 py-1.5 text-xs rounded font-medium ${
                historyMode === "email" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              Email paste
            </button>
          </div>
          {historyMode === "email" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">This paste is from:</span>
              <button type="button" onClick={() => setEmailSpeaker("client")} className={`px-2 py-1 text-xs rounded ${emailSpeaker === "client" ? "bg-gray-800 text-white" : "bg-gray-100"}`}>Client</button>
              <button type="button" onClick={() => setEmailSpeaker("larkspur")} className={`px-2 py-1 text-xs rounded ${emailSpeaker === "larkspur" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>Larkspur</button>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {historyMode === "whatsapp" ? "Paste full WhatsApp chat" : "Paste email body"}
            </label>
            <textarea
              value={chatHistoryInput}
              onChange={(e) => setChatHistoryInput(e.target.value)}
              rows={6}
              placeholder={historyMode === "whatsapp" ? "Paste exported chat…" : "Paste email thread…"}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={saveChatHistory}
              disabled={chatHistorySaving || !chatHistoryInput.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              {chatHistorySaving ? "Importing…" : "Import into conversation"}
            </button>
            {chatHistoryResult && (
              <span className="text-sm text-gray-600">
                Parsed {chatHistoryResult.total} · Added {chatHistoryResult.added} · Already had {chatHistoryResult.already}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
