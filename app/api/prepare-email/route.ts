import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findPublicEmail } from "@/lib/messaging/email-finder";
import { generateEmail } from "@/lib/messaging/groq";
import { buildEmailPrompt } from "@/lib/messaging/prompts";
import type { Company, Contact } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type EmailDraft = { email: string; subject: string; body: string; sourceUrl?: string };

function parseDraft(content: string): EmailDraft | null {
  try {
    const draft = JSON.parse(content);
    if (
      typeof draft.email === "string" && typeof draft.subject === "string" &&
      typeof draft.body === "string" && draft.email && draft.subject && draft.body
    ) return draft;
  } catch { /* Ignore old or malformed cached drafts. */ }
  return null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { lead_id, refresh = false } = await request.json() as { lead_id: string; refresh?: boolean };
    if (!lead_id) return NextResponse.json({ error: "lead_id is required" }, { status: 400 });

    const { data: lead, error: leadError } = await supabase
      .from("larkspur_leads")
      .select("id, larkspur_companies(*), larkspur_contacts(*)")
      .eq("id", lead_id)
      .single();
    if (leadError || !lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    if (!refresh) {
      const { data: cached } = await supabase
        .from("larkspur_messages")
        .select("content, variant, generated_at")
        .eq("lead_id", lead_id)
        .eq("stage", "initial")
        .in("variant", ["email", "email_not_found"])
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached?.variant === "email") {
        const draft = parseDraft(cached.content);
        if (draft) return NextResponse.json({ draft });
      }
      if (
        cached?.variant === "email_not_found" &&
        Date.now() - new Date(cached.generated_at).getTime() < 7 * 24 * 60 * 60 * 1000
      ) {
        return NextResponse.json({ error: "No public email found" }, { status: 404 });
      }
    }

    const company = lead.larkspur_companies as unknown as Company;
    const contact = lead.larkspur_contacts as unknown as Contact | null;
    const contactEmail = typeof contact?.email === "string" ? contact.email.trim().toLowerCase() : "";
    let recipient = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) ? contactEmail : null;
    let sourceUrl: string | undefined;

    if (!recipient && company?.website) {
      const found = await findPublicEmail(company.website);
      if (found) {
        recipient = found.email;
        sourceUrl = found.sourceUrl;
      }
    }

    if (!recipient) {
      await supabase.from("larkspur_messages").insert({
        lead_id, stage: "initial", variant: "email_not_found", content: "No public email found",
      });
      return NextResponse.json({ error: "No public email found" }, { status: 404 });
    }

    const result = await generateEmail(buildEmailPrompt(company, contact));
    const draft: EmailDraft = {
      email: recipient,
      subject: result.email.subject,
      body: result.email.body,
      sourceUrl,
    };

    const { error: saveError } = await supabase.from("larkspur_messages").insert({
      lead_id,
      stage: "initial",
      variant: "email",
      content: JSON.stringify(draft),
    });
    if (saveError) console.error("Could not cache email draft:", saveError.message);

    return NextResponse.json({ draft });
  } catch (error) {
    console.error("Email preparation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not prepare email" },
      { status: 500 },
    );
  }
}
