import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    company_name: string;
    industry?: string | null;
    city?: string | null;
    state?: string | null;
    phone?: string | null;
    website?: string | null;
    google_place_id?: string | null;
    size?: string | null;
    linkedin_url?: string | null;
    company_notes?: string | null;
    contact_name?: string | null;
    contact_role?: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;
    contact_linkedin_url?: string | null;
    is_decision_maker?: boolean;
    contact_notes?: string | null;
    stage?: "prospect" | "contacted" | "replied" | "meeting" | "client" | "disqualified" | "unreachable";
    source?: string | null;
    lead_notes?: string | null;
    restore_existing?: boolean;
    chat_history?: string;
  };

  if (!body.company_name) {
    return NextResponse.json({ error: "company_name is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  function normalizeWhatsAppTimestamp(ts: string): string | null {
    try {
      const parts = ts.split(",");
      if (parts.length < 2) return null;
      const datePart = parts[0].trim();
      const timePart = parts[1].trim();
      const dateMatch = datePart.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (!dateMatch) return null;
      const month = parseInt(dateMatch[1], 10);
      const day = parseInt(dateMatch[2], 10);
      const year = parseInt(dateMatch[3], 10);
      const timeMatch = timePart.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (!timeMatch) return null;
      let hour = parseInt(timeMatch[1], 10);
      const minute = parseInt(timeMatch[2], 10);
      const second = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
      const date = new Date(year, month - 1, day, hour, minute, second, 0);
      return date.toISOString();
    } catch { return null; }
  }

  function parseChatHistory(chat: string): Array<{ timestamp: string | null; sender: string | null; content: string }> {
    const lines = chat.split(/\r?\n/);
    const messages: Array<{ timestamp: string | null; sender: string | null; content: string }> = [];
    const exportRegex = /^\[?(\d{1,2}\/\d{1,2}\/\d{4},\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM))?)\]?\s+([^:]+):\s*(.*)$/;
    const simpleRegex = /^([^:]{1,60}):\s*(.*)$/;
    let current: { timestamp: string | null; sender: string | null; content: string } | null = null;
    const flush = () => { if (current) messages.push(current); current = null; };
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      const exportMatch = line.match(exportRegex);
      if (exportMatch) {
        flush();
        current = { timestamp: normalizeWhatsAppTimestamp(exportMatch[1]), sender: exportMatch[2].trim(), content: exportMatch[3].trim() };
        continue;
      }
      const simpleMatch = line.match(simpleRegex);
      if (simpleMatch && !current) {
        flush();
        current = { timestamp: null, sender: simpleMatch[1].trim(), content: simpleMatch[2].trim() };
        continue;
      }
      if (current) { current.content += "\n" + line; }
    }
    flush();
    return messages;
  }

  try {
    // --- Step 1: Handle the company ---
    const normalizedName = body.company_name.trim().toLowerCase().replace(/\s+/g, " ");
    let existingCompany: any = null;

    if (body.google_place_id) {
      const { data: byPlaceId } = await admin
        .from("larkspur_companies")
        .select("*")
        .eq("google_place_id", body.google_place_id)
        .maybeSingle();
      if (byPlaceId) existingCompany = byPlaceId;
    }

    if (!existingCompany) {
      const { data: byName } = await admin
        .from("larkspur_companies")
        .select("*")
        .ilike("name", body.company_name.trim())
        .maybeSingle();
      if (byName) existingCompany = byName;
    }

    let companyId: string;

    if (existingCompany) {
      companyId = existingCompany.id;
      if (existingCompany.disapproved_at && body.restore_existing !== false) {
        await admin.from("larkspur_companies").update({ disapproved_at: null }).eq("id", companyId);
      }
      const updateData: any = {};
      if (body.industry) updateData.industry = body.industry;
      if (body.city !== undefined) updateData.city = body.city;
      if (body.state !== undefined) updateData.state = body.state;
      if (body.phone !== undefined) updateData.phone = body.phone;
      if (body.website !== undefined) updateData.website = body.website;
      if (body.size !== undefined) updateData.size = body.size;
      if (body.linkedin_url !== undefined) updateData.linkedin_url = body.linkedin_url;
      if (body.company_notes !== undefined) updateData.notes = body.company_notes;
      if (Object.keys(updateData).length > 0) {
        await admin.from("larkspur_companies").update(updateData).eq("id", companyId);
      }
    } else {
      const { data: newCompany, error: companyError } = await admin
        .from("larkspur_companies")
        .insert({
          name: body.company_name.trim(),
          normalized_name: normalizedName,
          industry: body.industry || null,
          city: body.city || null,
          state: body.state || null,
          phone: body.phone || null,
          website: body.website || null,
          google_place_id: body.google_place_id || null,
          size: body.size || null,
          linkedin_url: body.linkedin_url || null,
          notes: body.company_notes || null,
        })
        .select()
        .single();
      if (companyError) {
        return NextResponse.json({ error: companyError.message }, { status: 500 });
      }
      companyId = newCompany.id;
    }
    // --- Step 2: Handle the contact ---
    let contactId: string | null = null;
    if (body.contact_name || body.contact_phone || body.contact_email) {
      let existingContact: any = null;
      if (body.contact_phone) {
        const { data: byPhone } = await admin
          .from("larkspur_contacts")
          .select("*")
          .eq("phone", body.contact_phone)
          .eq("company_id", companyId)
          .maybeSingle();
        if (byPhone) existingContact = byPhone;
      }
      if (!existingContact && body.contact_email) {
        const { data: byEmail } = await admin
          .from("larkspur_contacts")
          .select("*")
          .eq("email", body.contact_email)
          .eq("company_id", companyId)
          .maybeSingle();
        if (byEmail) existingContact = byEmail;
      }
      if (existingContact) {
        contactId = existingContact.id;
        const updateData: any = {};
        if (body.contact_name !== undefined) updateData.name = body.contact_name;
        if (body.contact_role !== undefined) updateData.role = body.contact_role;
        if (body.contact_linkedin_url !== undefined) updateData.linkedin_url = body.contact_linkedin_url;
        if (body.is_decision_maker !== undefined) updateData.is_decision_maker = body.is_decision_maker;
        if (body.contact_notes !== undefined) updateData.notes = body.contact_notes;
        if (Object.keys(updateData).length > 0) {
          await admin.from("larkspur_contacts").update(updateData).eq("id", contactId);
        }
      } else {
        const { data: newContact, error: contactError } = await admin
          .from("larkspur_contacts")
          .insert({
            company_id: companyId,
            name: body.contact_name || null,
            role: body.contact_role || null,
            phone: body.contact_phone || null,
            email: body.contact_email || null,
            linkedin_url: body.contact_linkedin_url || null,
            is_decision_maker: body.is_decision_maker || false,
            notes: body.contact_notes || null,
          })
          .select()
          .single();
        if (contactError) {
          return NextResponse.json({ error: contactError.message }, { status: 500 });
        }
        contactId = newContact.id;
      }
    }
    // --- Step 3: Handle the lead ---
    const leadStage = body.stage || "replied";
    const { data: existingLead } = await admin
      .from("larkspur_leads")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();

    let leadId: string;
    if (existingLead) {
      leadId = existingLead.id;
      await admin.from("larkspur_leads").update({
        stage: leadStage,
        contact_id: contactId ?? existingLead.contact_id,
        updated_at: now,
        ...(leadStage === "replied" ? { last_contacted_at: now } : {}),
        ...(body.lead_notes !== undefined ? { notes: body.lead_notes } : {}),
      }).eq("id", leadId);
    } else {
      const { data: newLead, error: leadError } = await admin
        .from("larkspur_leads")
        .insert({
          company_id: companyId,
          contact_id: contactId || null,
          stage: leadStage,
          source: body.source || "manual_restore",
          notes: body.lead_notes || null,
          created_at: now,
          updated_at: now,
          ...(leadStage === "replied" ? { last_contacted_at: now } : {}),
        })
        .select()
        .single();
      if (leadError) {
        return NextResponse.json({ error: leadError.message }, { status: 500 });
      }
      leadId = newLead.id;
    }

    // --- Step 4: Log chat history (both directions) ---
    if (body.chat_history) {
      const parsed = parseChatHistory(body.chat_history);
      const ownerName = "Mishael";

      const { data: existingInteractions } = await admin
        .from("larkspur_interactions")
        .select("reply_content")
        .eq("lead_id", leadId);

      const existingContents = new Set((existingInteractions ?? []).map((i: any) => i.reply_content?.trim()).filter(Boolean));

      const newMessages = parsed.filter((m) => {
        const content = m.content.trim();
        if (!content || existingContents.has(content)) return false;
        return true;
      });

      const insertRows = newMessages.map((m) => {
        const isFromOwner = m.sender && m.sender.toLowerCase().includes(ownerName.toLowerCase());
        return {
          lead_id: leadId,
          type: isFromOwner ? "whatsapp_sent" : "whatsapp_reply",
          reply_content: m.content,
          replied_at: m.timestamp || now,
          message_content: isFromOwner
            ? `WhatsApp message sent to ${m.sender || "contact"}`
            : `WhatsApp reply received from ${m.sender || "contact"}`,
        };
      });

      if (insertRows.length > 0) {
        const { error } = await admin.from("larkspur_interactions").insert(insertRows);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({
      success: true,
      leadId,
      companyId,
      contactId,
      stage: leadStage,
      message: "Lead restored successfully",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}