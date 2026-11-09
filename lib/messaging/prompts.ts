import type { Company, Contact, MessageStage } from "@/lib/types";

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
    initial: "This is the first outreach. Introduce Larkspur (never say 'Larkspur Resourcing' — always just 'Larkspur') and ask about their hiring needs.",
    follow_up_1: "Follow-up message sent 1 week (7 days) after initial outreach. Remind them of the value proposition.",
    follow_up_2: "Follow-up message sent 1 week (7 days) after first follow-up. Add a specific pain point relevant to their industry. Do NOT invent case studies or claim/imply Larkspur has worked with specific companies — generic references like 'Nigerian businesses like [X]' are fine.",
    follow_up_3: "Final follow-up after 1 week. Keep it brief and professional.",
    breakup: "Breakup message after no response. Politely close the conversation and leave the door open.",
    re_engagement: "Re-engagement message after 2+ weeks of silence. Reference a new service or insight.",
  };

  const historySection = conversationHistory
    ? `\nPrevious conversation:\nThe lead replied: "${conversationHistory}"\nUse their actual response to craft a relevant, personalized reply. Do not ignore what they said.\n`
    : "";

  return `Generate a WhatsApp message for ${contactName} (${contactRole}) at ${company.name}, a ${industry} company in ${company.city || "Lagos"}.

Stage: ${stage}
Context: ${stageContext[stage]}
${historySection}Requirements:
- Keep it under 280 characters
- Friendly, professional tone
- Reference their industry (${industry})
- Mention Larkspur — always say "Larkspur", NEVER "Larkspur Resourcing"
- Introduce yourself as "Mishael" from Larkspur within the message body — do NOT add a "-Mishael" signature at the end
- Greet with "Goodday!" — never use "Hi Sir" or gendered salutations
- Include a clear call-to-action
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

Requirements:
- Subject: clear, natural, under 70 characters, with no clickbait or false urgency
- Body: 80–120 words of plain text, friendly and professional
- Greet with "Goodday!" and introduce Mishael from Larkspur
- Ask about their current hiring needs and include a clear, low-pressure call-to-action
- Reference their industry without claiming Larkspur has clients in that industry
- Do not invent growth, vacancies, case studies, or other facts about the company
- Write the company name exactly as supplied, without adding emphasis or changing its capitalization
- Use Nigerian English conventions
- End with a simple sign-off (no signature line — your email app handles that)

Return JSON: { "subject": "email subject", "body": "plain text email body" }`;
}