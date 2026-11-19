import type { Company, Contact, MessageStage } from "@/lib/types";

/** Short form for WhatsApp (fits ~280–320 chars). */
const ROLES_SHORT = "sales, business development, customer service, and admin (e.g. EA)";

/** Full form for email. */
const ROLES_FULL =
  "business development, sales, customer service, and administrative roles (e.g. executive assistants)";

/** Bump when prompt product rules change so email cache regenerates. */
export const MESSAGING_PROMPT_VERSION = "2026-11-19-roles-v3";

export function buildMessagePrompt(
  company: Company,
  contact: Contact | null,
  stage: MessageStage,
  conversationHistory?: string,
): string {
  const contactName = contact?.name || "there";
  const contactRole = contact?.role || "decision-maker";
  const industry = company.industry || "business";

  const stageContext = {
    initial: `First outreach. Introduce Mishael from Larkspur. MUST say Larkspur helps hire ${ROLES_SHORT}. Ask if they need any of those roles.`,
    follow_up_1: `Follow-up 1 week after initial. MUST still name roles (${ROLES_SHORT}). Remind value briefly.`,
    follow_up_2: `Follow-up 1 week after first follow-up. MUST name roles (${ROLES_SHORT}). Optional light hiring pain (sales coverage / CS capacity / admin support). No invented case studies.`,
    follow_up_3: `Final follow-up. Brief. MUST still mention at least sales/BD/CS/admin.`,
    breakup: "Breakup after no response. Polite close; door open. Roles optional if space is tight.",
    re_engagement: `Re-engagement after 2+ weeks. MUST restate roles (${ROLES_SHORT}) and ask about those needs only.`,
  };

  const historySection = conversationHistory
    ? `\nPrevious conversation:\nThe lead replied: "${conversationHistory}"\nUse their actual response to craft a relevant, personalized reply. Do not ignore what they said.\n`
    : "";

  return `Generate a WhatsApp message for ${contactName} (${contactRole}) at ${company.name}, a ${industry} company in ${company.city || "Lagos"}.

Stage: ${stage}
Context: ${stageContext[stage]}
${historySection}What to say (positive framing only):
- Larkspur helps Nigerian companies hire ${ROLES_SHORT}.
- Unless stage is "breakup", the message body MUST include a clear phrase about sales, business development, customer service, and/or admin (EA) hiring. Vague "hiring needs" alone is NOT enough.
- Do not list what Larkspur does not do. Let the named roles imply the focus.
- Industry (${industry}) is tone only. Do not pitch specialist professional hiring for that industry.

Example shape (do not copy verbatim; adapt names):
"Goodday! I'm Mishael from Larkspur. We help Nigerian businesses hire sales, BD, customer service, and admin talent (like EAs). Are you open to a quick chat if ${company.name} needs any of those roles?"

Style (human, not AI):
- NEVER use em dashes (—), en dashes (–), or double hyphens (--) as punctuation. Use a period, comma, or new sentence instead.
- Prefer under 320 characters (hard max 400). Prioritize naming the roles over filler.
- Friendly, professional Nigerian English
- Always say "Larkspur", NEVER "Larkspur Resourcing"
- Introduce as "Mishael" from Larkspur in the body. No "-Mishael" sign-off
- Greet with "Goodday!". Never "Hi Sir" or gendered salutations
- Clear CTA about those specific roles
- No "I hope this message finds you well"
- Do NOT invent claims about their team growth or open roles
- Do NOT say "accounting firms like [X]" / "[industry] companies like [X]" / "We help [industry] firms like [X]". Prefer "Nigerian businesses" if needed
- Keep company name exactly as given
- Natural conversational tone; no phone-number templates

Return JSON: { "content": "message text", "variant": "A" }`;
}

export function buildEmailPrompt(company: Company, contact: Contact | null): string {
  const contactName = contact?.name || "there";
  const industry = company.industry || "business";

  return `Write an initial recruitment outreach email to ${contactName} at ${company.name}, a ${industry} company in ${company.city || "Lagos"}.

What to say (positive framing only):
- Larkspur helps companies hire ${ROLES_FULL}.
- The body MUST explicitly list those role types. "Hiring support" or "recruitment help" alone is NOT enough.
- Do not list what Larkspur does not do. The named roles are enough.
- Industry (${industry}) is context only. Do not pitch specialist professional staffing for that industry.

Requirements:
- Subject: clear, natural, under 70 characters; may reference sales/CS/admin hiring
- Body: 80–120 words, plain text
- Greet with "Goodday!" and introduce Mishael from Larkspur
- One sentence must name: business development, sales, customer service, and administrative (EA) roles
- Ask about needs for those roles; low-pressure CTA
- Do not invent growth, vacancies, or case studies
- Company name exactly as supplied
- Nigerian English conventions
- NEVER use em dashes (—), en dashes (–), or double hyphens (--) as punctuation. Use periods or commas.

Signature rules (strict):
- Email app already adds signature. Do NOT add any signature block.
- No name/title/company/phone/web lines at the end
- No "Best regards," / "Kind regards," / "Sincerely," + name
- End after CTA with at most: "Looking forward to hearing from you."

Return JSON: { "subject": "email subject", "body": "plain text email body" }`;
}

/** True if a draft body already states our role targets. */
export function draftNamesHiringRoles(text: string): boolean {
  const t = text.toLowerCase();
  const hasSales = t.includes("sales");
  const hasBd =
    t.includes("business development") ||
    t.includes("bd") ||
    t.includes("biz dev");
  const hasCs =
    t.includes("customer service") ||
    t.includes("customer support") ||
    t.includes("cs ") ||
    t.includes(" cs");
  const hasAdmin =
    t.includes("admin") ||
    t.includes("executive assistant") ||
    t.includes(" ea") ||
    t.includes("ea)");
  // Need at least two role families so it is not a single token coincidence
  return [hasSales, hasBd, hasCs, hasAdmin].filter(Boolean).length >= 2;
}
