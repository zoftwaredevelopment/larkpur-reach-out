import type { Company, Contact, MessageStage } from "@/lib/types";

/** Roles Larkspur actually places — always state these; never imply specialist professional hiring. */
const ROLES_WE_HIRE_FOR =
  "business development, sales, customer service, and administrative roles (e.g. executive assistants)";

const ROLES_WE_DO_NOT_HIRE_FOR =
  "tax auditors, accountants (as a specialty placement), lawyers, legal counsel, marine engineers, petroleum engineers, doctors, nurses, or other licensed professional/technical specialists";

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
    initial: `This is the first outreach. Introduce Larkspur (never say 'Larkspur Resourcing' — always just 'Larkspur'). Clearly state that Larkspur helps companies hire ${ROLES_WE_HIRE_FOR}. Ask whether they are hiring for any of those roles. Do not imply Larkspur staffs specialist professional roles.`,
    follow_up_1: `Follow-up message sent 1 week (7 days) after initial outreach. Remind them Larkspur places ${ROLES_WE_HIRE_FOR} — not specialist professional hires.`,
    follow_up_2: `Follow-up message sent 1 week (7 days) after first follow-up. Tie a practical hiring pain (e.g. sales coverage, CS capacity, admin support) to ${ROLES_WE_HIRE_FOR}. Do NOT invent case studies or claim/imply Larkspur has worked with specific companies — generic references like 'Nigerian businesses like [X]' are fine.`,
    follow_up_3: "Final follow-up after 1 week. Keep it brief and professional. Reiterate only the roles Larkspur places.",
    breakup: "Breakup message after no response. Politely close the conversation and leave the door open.",
    re_engagement: `Re-engagement message after 2+ weeks of silence. Re-state that Larkspur places ${ROLES_WE_HIRE_FOR} and ask about current needs for those roles only.`,
  };

  const historySection = conversationHistory
    ? `\nPrevious conversation:\nThe lead replied: "${conversationHistory}"\nUse their actual response to craft a relevant, personalized reply. Do not ignore what they said.\n`
    : "";

  return `Generate a WhatsApp message for ${contactName} (${contactRole}) at ${company.name}, a ${industry} company in ${company.city || "Lagos"}.

Stage: ${stage}
Context: ${stageContext[stage]}
${historySection}What Larkspur does:
- Larkspur helps Nigerian companies hire ${ROLES_WE_HIRE_FOR}.
- Larkspur does NOT place ${ROLES_WE_DO_NOT_HIRE_FOR}.
- Industry (${industry}) is only context for tone/relevance. Never imply we staff that industry's specialist professional roles (e.g. auditors at audit firms, engineers in oil & gas).

Requirements:
- Keep it under 280 characters
- Friendly, professional tone
- In the first outreach especially, name the roles we hire for so the recipient is not confused about what Larkspur does
- You may reference their industry (${industry}) lightly, but only in service of the roles above
- Mention Larkspur — always say "Larkspur", NEVER "Larkspur Resourcing"
- Introduce yourself as "Mishael" from Larkspur within the message body — do NOT add a "-Mishael" signature at the end
- Greet with "Goodday!" — never use "Hi Sir" or gendered salutations
- Include a clear call-to-action about hiring needs for those roles
- Avoid generic phrases like "I hope this message finds you well"
- Do NOT invent unverified claims like "I heard you're growing your [X] team" — only reference what you actually know
- Do NOT use phrases like "accounting firms like [X]", "[industry] companies like [X]", or "We help [industry] firms like [X]" — these imply we've worked with their industry, and we may not have. Use "Nigerian businesses like [X]" instead
- Write company names exactly as they appear — do NOT capitalize, title-case, or ALL CAPS them for emphasis — keep it natural
- Do NOT use numbered templates or phone number templates like "call 08xxx" — keep it natural and conversational
- Use Nigerian English conventions

Return JSON: { "content": "message text", "variant": "A" }`;
}

export function buildEmailPrompt(company: Company, contact: Contact | null): string {
  const contactName = contact?.name || "there";
  const industry = company.industry || "business";

  return `Write an initial recruitment outreach email to ${contactName} at ${company.name}, a ${industry} company in ${company.city || "Lagos"}.

What Larkspur does:
- Larkspur helps Nigerian companies hire ${ROLES_WE_HIRE_FOR}.
- Larkspur does NOT place ${ROLES_WE_DO_NOT_HIRE_FOR}.
- Industry (${industry}) is context only — never imply we staff that industry's specialist professional roles.

Requirements:
- Subject: clear, natural, under 70 characters, with no clickbait or false urgency; may mention hiring for sales/CS/admin/BD if it fits
- Body: 80–120 words of plain text, friendly and professional
- Greet with "Goodday!" and introduce Mishael from Larkspur in the opening paragraph
- Explicitly state the roles Larkspur hires for (${ROLES_WE_HIRE_FOR}) so the recipient is not confused
- Ask about their current needs for those roles and include a clear, low-pressure call-to-action
- Reference their industry only lightly, without claiming Larkspur has clients in that industry
- Do not invent growth, vacancies, case studies, or other facts about the company
- Write the company name exactly as supplied, without adding emphasis or changing its capitalization
- Use Nigerian English conventions

Signature / closing rules (strict):
- The sender's email app already appends a full signature. Do NOT add any signature block.
- Do NOT end with name, title, company, phone, website, address, or "Mishael / Larkspur" lines.
- Do NOT use closings like "Best regards,", "Kind regards,", "Sincerely,", "Warm regards," followed by a name.
- End after the call-to-action paragraph with at most a single short line such as "Looking forward to hearing from you." — nothing after that.

Return JSON: { "subject": "email subject", "body": "plain text email body" }`;
}
