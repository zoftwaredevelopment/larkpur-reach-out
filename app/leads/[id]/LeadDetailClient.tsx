"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useMemo } from "react";
import { WhatsAppPhoneLink } from "./WhatsAppPhoneLink";
import { EmailFallbackLink } from "./EmailFallbackLink";
import { createClient } from "@/lib/supabase/client";

interface LeadDetailProps {
  lead: any;
  interactions: any[];
  company: any;
  contact: any;
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

export function LeadDetailClient({
  lead: initialLead,
  interactions: initialInteractions,
  company: initialCompany,
  contact: initialContact,
}: LeadDetailProps) {
  const router = useRouter();
  const supabase = createClient();

  const [lead, setLead] = useState(initialLead);
  const [company, setCompany] = useState(initialCompany || initialLead?.larkspur_companies || {});
  const [contact, setContact] = useState(initialContact || initialLead?.larkspur_contacts || {});
  const [interactions, setInteractions] = useState(initialInteractions || []);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    years_established: company?.years_established ?? "",
    monthly_salary: company?.monthly_salary ?? "",
    potential_talent: company?.potential_talent ?? "",
    touch_point: company?.touch_point ?? "",
    company_notes: company?.notes ?? "",
    contact_name: contact?.name ?? "",
    contact_role: contact?.role ?? "",
    contact_phone: contact?.phone ?? "",
    contact_email: contact?.email ?? "",
    is_decision_maker: contact?.is_decision_maker ? "Y" : "N",
    linkedin_url: contact?.linkedin_url ?? "",
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

  const [generating, setGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [contactMethod, setContactMethod] = useState<"whatsapp" | "email" | "phone">("whatsapp");

  const [chatHistoryInput, setChatHistoryInput] = useState("");
  const [chatHistorySaving, setChatHistorySaving] = useState(false);
  const [chatHistoryResult, setChatHistoryResult] = useState<{
    added: number;
    total: number;
    already: number;
  } | null>(null);

  const updateForm = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const startEditing = () => {
    setForm({
      years_established: company?.years_established ?? "",
      monthly_salary: company?.monthly_salary ?? "",
      potential_talent: company?.potential_talent ?? "",
      touch_point: company?.touch_point ?? "",
      company_notes: company?.notes ?? "",
      contact_name: contact?.name ?? "",
      contact_role: contact?.role ?? "",
      contact_phone: contact?.phone ?? "",
      contact_email: contact?.email ?? "",
      is_decision_maker: contact?.is_decision_maker ? "Y" : "N",
      linkedin_url: contact?.linkedin_url ?? "",
      stage: lead?.stage ?? "prospect",
      last_contacted_at: formatDateInput(lead?.last_contacted_at),
      objections: lead?.objections ?? "",
      next_action: lead?.next_action ?? "",
      lead_notes: lead?.notes ?? "",
    });
    setEditing(true);
    setSaveMsg(null);
  };

  const cancelEditing = () => {
    setEditing(false);
    setSaveMsg(null);
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
        salaryNum && !isNaN(salaryNum) ? Math.round(0.15 * salaryNum * 12) : null;
      const yearsNum = form.years_established
        ? parseInt(String(form.years_established), 10)
        : null;

      // Company — do NOT send deal_value (generated column in DB)
      if (company?.id) {
        const { error: coErr } = await supabase
          .from("larkspur_companies")
          .update({
            years_established: yearsNum,
            monthly_salary: salaryNum,
            potential_talent: form.potential_talent || null,
            touch_point: form.touch_point || null,
            notes: form.company_notes || null,
          })
          .eq("id", company.id);
        if (coErr) throw new Error(coErr.message);

        setCompany((prev: any) => ({
          ...prev,
          years_established: yearsNum,
          monthly_salary: salaryNum,
          deal_value: dealValue,
          potential_talent: form.potential_talent || null,
          touch_point: form.touch_point || null,
          notes: form.company_notes || null,
        }));
      }

      // Contact
      if (contact?.id) {
        const { error: cErr } = await supabase
          .from("larkspur_contacts")
          .update({
            name: form.contact_name || null,
            role: form.contact_role || null,
            phone: form.contact_phone || null,
            email: form.contact_email || null,
            is_decision_maker: form.is_decision_maker === "Y",
            linkedin_url: form.linkedin_url || null,
          })
          .eq("id", contact.id);
        if (cErr) throw new Error(cErr.message);

        setContact((prev: any) => ({
          ...prev,
          name: form.contact_name || null,
          role: form.contact_role || null,
          phone: form.contact_phone || null,
          email: form.contact_email || null,
          is_decision_maker: form.is_decision_maker === "Y",
          linkedin_url: form.linkedin_url || null,
        }));
      }

      // Lead
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

  const saveChatHistory = async () => {
    if (!chatHistoryInput.trim()) return;
    setChatHistorySaving(true);
    setChatHistoryResult(null);
    setMessageError(null);
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
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to log chat history");
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
    } catch (err: any) {
      setMessageError(err.message || "Something went wrong");
    } finally {
      setChatHistorySaving(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm("Delete ALL conversation history for this lead? This cannot be undone.")) return;
    const { error } = await supabase
      .from("larkspur_interactions")
      .delete()
      .eq("lead_id", lead.id);
    if (error) {
      alert(error.message);
      return;
    }
    setInteractions([]);
    setChatHistoryResult(null);
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

  const isFromMe = (int: any) => {
    const t = (int.type || "").toLowerCase();
    return t === "whatsapp_sent" || t.includes("sent");
  };

  const getBubbleText = (int: any) => {
    const raw = (int.reply_content || "").trim();
    if (raw && !/^whatsapp (message sent|reply received)/i.test(raw)) return raw;
    const fallback = (int.message_content || "")
      .replace(/^WhatsApp message sent to .+?:\s*/i, "")
      .replace(/^WhatsApp reply received from .+?:\s*/i, "")
      .trim();
    return fallback || "—";
  };

  const displaySalary = editing ? form.monthly_salary : company?.monthly_salary;
  const displayDeal = editing ? computedDealValue : company?.deal_value ?? computedDealValue;

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{company?.name || "Lead"}</h1>
          <p className="text-gray-600 mt-1">Lead details</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Link href="/leads" className="text-blue-600 hover:text-blue-800 font-medium">
            ← Back to Leads
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
                onClick={cancelEditing}
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
              <p className="text-lg font-medium text-gray-900">{company?.name || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Location</p>
              <p className="text-lg font-medium text-gray-900">
                {[company?.city, company?.state].filter(Boolean).join(", ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Industry</p>
              <p className="text-lg font-medium text-gray-900">{company?.industry || "—"}</p>
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
                <p className="text-lg font-medium text-gray-900">
                  {company?.years_established ?? "—"}
                </p>
              )}
            </div>
            <div>
              <p className="text-gray-500 mb-1">Monthly salary (GAS)</p>
              {editing ? (
                <input
                  type="number"
                  value={form.monthly_salary}
                  onChange={(e) => updateForm("monthly_salary", e.target.value)}
                  placeholder="e.g. 150000"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              ) : (
                <p className="text-lg font-medium text-gray-900">{formatNaira(displaySalary)}</p>
              )}
            </div>
            <div>
              <p className="text-gray-500 mb-1">Deal Value (15% of GAS × 12)</p>
              <p className="text-lg font-medium text-emerald-700">{formatNaira(displayDeal)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Auto-calculated from monthly salary</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Potential Talent</p>
              {editing ? (
                <input
                  type="text"
                  value={form.potential_talent}
                  onChange={(e) => updateForm("potential_talent", e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              ) : (
                <p className="text-lg font-medium text-gray-900">
                  {company?.potential_talent || "—"}
                </p>
              )}
            </div>
            <div>
              <p className="text-gray-500 mb-1">Touch Point</p>
              {editing ? (
                <input
                  type="text"
                  value={form.touch_point}
                  onChange={(e) => updateForm("touch_point", e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              ) : (
                <p className="text-lg font-medium text-gray-900">
                  {company?.touch_point || "—"}
                </p>
              )}
            </div>
            {company?.website && (
              <div className="md:col-span-2">
                <p className="text-gray-500 mb-1">Website</p>
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {company.website}
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold mb-3">Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Contact Name</p>
              {editing ? (
                <input
                  type="text"
                  value={form.contact_name}
                  onChange={(e) => updateForm("contact_name", e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              ) : (
                <p className="font-medium">{contact?.name || "—"}</p>
              )}
            </div>
            <div>
              <p className="text-gray-500 mb-1">Job Title</p>
              {editing ? (
                <input
                  type="text"
                  value={form.contact_role}
                  onChange={(e) => updateForm("contact_role", e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              ) : (
                <p className="font-medium">{contact?.role || "—"}</p>
              )}
            </div>
            <div>
              <p className="text-gray-500 mb-1">Decision Maker (Y/N)</p>
              {editing ? (
                <select
                  value={form.is_decision_maker}
                  onChange={(e) => updateForm("is_decision_maker", e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="Y">Y</option>
                  <option value="N">N</option>
                </select>
              ) : (
                <p className="font-medium">{contact?.is_decision_maker ? "Y" : "N"}</p>
              )}
            </div>
            <div>
              <p className="text-gray-500 mb-1">LinkedIn Profile</p>
              {editing ? (
                <input
                  type="url"
                  value={form.linkedin_url}
                  onChange={(e) => updateForm("linkedin_url", e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              ) : contact?.linkedin_url ? (
                <a
                  href={contact.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  View profile
                </a>
              ) : (
                <p className="font-medium">—</p>
              )}
            </div>
            <div>
              <p className="text-gray-500 mb-1">Phone Number</p>
              {editing ? (
                <input
                  type="text"
                  value={form.contact_phone}
                  onChange={(e) => updateForm("contact_phone", e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              ) : contact?.phone || company?.phone ? (
                <WhatsAppPhoneLink
                  phone={contact?.phone || company?.phone}
                  message={generatedMessage}
                  onGenerateMessage={() => handleGenerateMessage("initial")}
                  onOpen={() => setContactMethod("whatsapp")}
                  onError={setMessageError}
                />
              ) : (
                <p className="font-medium">—</p>
              )}
            </div>
            <div>
              <p className="text-gray-500 mb-1">Email Address</p>
              {editing ? (
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => updateForm("contact_email", e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              ) : (
                <p className="font-medium">{contact?.email || "—"}</p>
              )}
            </div>
            {!editing && (
              <div>
                <EmailFallbackLink
                  key={lead.id}
                  leadId={lead.id}
                  onOpen={() => setContactMethod("email")}
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-lg font-semibold mb-3">Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Stage</p>
              {editing ? (
                <select
                  value={form.stage}
                  onChange={(e) => updateForm("stage", e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  {["prospect", "contacted", "replied", "meeting", "client", "disqualified", "unreachable"].map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ),
                  )}
                </select>
              ) : (
                <p className="font-medium">{lead.stage}</p>
              )}
            </div>
            <div>
              <p className="text-gray-500 mb-1">Last Date</p>
              {editing ? (
                <input
                  type="date"
                  value={form.last_contacted_at}
                  onChange={(e) => updateForm("last_contacted_at", e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              ) : (
                <p className="font-medium">
                  {lead?.last_contacted_at
                    ? formatTime(lead.last_contacted_at).split(",")[0]
                    : "—"}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <p className="text-gray-500 mb-1">Objections</p>
              {editing ? (
                <textarea
                  value={form.objections}
                  onChange={(e) => updateForm("objections", e.target.value)}
                  rows={2}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              ) : (
                <p className="font-medium whitespace-pre-wrap">{lead?.objections || "—"}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <p className="text-gray-500 mb-1">Comments</p>
              {editing ? (
                <textarea
                  value={form.lead_notes}
                  onChange={(e) => updateForm("lead_notes", e.target.value)}
                  rows={2}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              ) : (
                <p className="font-medium whitespace-pre-wrap">{lead?.notes || "—"}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <p className="text-gray-500 mb-1">Next Action</p>
              {editing ? (
                <textarea
                  value={form.next_action}
                  onChange={(e) => updateForm("next_action", e.target.value)}
                  rows={2}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              ) : (
                <p className="font-medium whitespace-pre-wrap">{lead?.next_action || "—"}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-1">Conversation History</h2>
            <p className="text-sm text-gray-500">
              Your messages (Mishael) on the right in blue. Client on the left in white.
            </p>
          </div>
          <button onClick={clearHistory} className="text-xs text-red-600 hover:underline">
            Clear history
          </button>
        </div>

        <div className="p-6 min-h-[200px] max-h-[520px] overflow-y-auto bg-gray-50 space-y-3">
          {interactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No messages yet. Paste a full WhatsApp chat below to import.
            </p>
          ) : (
            interactions.map((int: any) => {
              const mine = isFromMe(int);
              const text = getBubbleText(int);
              const time = int.replied_at || int.created_at;
              if (!text || text === "—" || /^whatsapp (message sent|reply received)/i.test(text)) {
                return null;
              }
              return (
                <div
                  key={int.id || `${int.type}-${time}-${text.slice(0, 24)}`}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
                      mine
                        ? "bg-blue-600 text-white rounded-br-md"
                        : "bg-white text-gray-900 border border-gray-200 rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{text}</p>
                    {time && (
                      <p className={`text-[10px] mt-1 ${mine ? "text-blue-100" : "text-gray-400"}`}>
                        {formatTime(time)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-6 border-t bg-white">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Paste full WhatsApp chat</h3>
          <p className="text-xs text-gray-500 mb-3">
            Messages from <strong>Mishael</strong> → blue (you). Everyone else → white (client).
          </p>
          <textarea
            value={chatHistoryInput}
            onChange={(e) => setChatHistoryInput(e.target.value)}
            rows={7}
            placeholder={`[09/11/2026, 12:39:32] Mishael: Goodday!...\n[09/11/2026, 12:40:46] ~Client Name: Thank you...`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <button
              onClick={saveChatHistory}
              disabled={chatHistorySaving || !chatHistoryInput.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              {chatHistorySaving ? "Importing…" : "Import Chat History"}
            </button>
            {chatHistoryResult && (
              <span className="text-sm text-gray-600">
                Parsed {chatHistoryResult.total} · Added {chatHistoryResult.added} · Already had{" "}
                {chatHistoryResult.already}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-2">Generate WhatsApp Message</h2>
        <p className="text-sm text-gray-600 mb-4">
          Generate a message, then click the green number to open WhatsApp with it pre-filled.
        </p>
        <div className="flex flex-wrap gap-3 mb-4">
          {["initial", "follow_up_1", "follow_up_2"].map((stage) => (
            <button
              key={stage}
              onClick={() => handleGenerateMessage(stage)}
              disabled={generating}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {generating ? "Generating…" : stage.replace("_", " ")}
            </button>
          ))}
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