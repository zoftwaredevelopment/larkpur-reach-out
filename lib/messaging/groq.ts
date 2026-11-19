const GROQ_MODEL = "openai/gpt-oss-120b";

export interface GeneratedMessage {
  content: string;
  variant: string;
}

export interface GroqCallResult {
  message: GeneratedMessage;
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

const WHATSAPP_SYSTEM = `You are Mishael, a recruitment consultant at Larkspur (never "Larkspur Resourcing").
Larkspur ONLY helps Nigerian companies hire: sales, business development, customer service, and administrative talent (e.g. executive assistants).
Larkspur does NOT place tax auditors, specialist accountants, lawyers, marine/petroleum engineers, doctors, nurses, or other licensed professional specialists.
Every outreach message (except a pure breakup) MUST explicitly name those role types so the recipient knows what Larkspur does. Vague "hiring needs" without role types is invalid.
Never imply Larkspur staffs industry-specific professional roles (e.g. auditors for audit firms, engineers for oil & gas).
Keep messages concise, friendly, Nigerian English. Prefer under 320 characters.
Never use "accounting firms like [X]" or "[industry] companies like [X]" — use "Nigerian businesses" if needed.
Return JSON: { "content": string, "variant": string }.`;

const EMAIL_SYSTEM = `You are Mishael, a recruitment consultant at Larkspur (never "Larkspur Resourcing") writing plain-text cold emails.
Larkspur ONLY places: business development, sales, customer service, and administrative roles (e.g. executive assistants).
Do NOT place specialist professionals (auditors, lawyers, engineers, clinicians, etc.).
The email body MUST explicitly list the role types Larkspur hires for. Vague "recruitment support" is invalid.
Do not invent client relationships, case studies, or company facts.
The recipient's email app already adds a signature — do not add Best regards/name/title/phone/web or any signature block.
Return JSON: { "subject": string, "body": string } with plain-text body.`;

/**
 * Server-only call to the Groq API free tier (OpenAI-compatible chat
 * completions). Generates personalized WhatsApp outreach messages.
 */
export async function generateMessage(prompt: string): Promise<GroqCallResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: WHATSAPP_SYSTEM },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq API returned ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq API returned no content");
  }

  const message = JSON.parse(content) as GeneratedMessage;
  return { message, usage: data.usage ?? {} };
}

export interface GeneratedEmail {
  subject: string;
  body: string;
}

export interface GroqEmailCallResult {
  email: GeneratedEmail;
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export async function generateEmail(prompt: string): Promise<GroqEmailCallResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: EMAIL_SYSTEM },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq API returned ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq API returned no content");
  const parsed = JSON.parse(content);
  if (
    typeof parsed.subject !== "string" ||
    typeof parsed.body !== "string" ||
    !parsed.subject.trim() ||
    !parsed.body.trim()
  ) {
    throw new Error("Groq returned an invalid email draft");
  }

  return {
    email: { subject: parsed.subject.trim(), body: parsed.body.trim() },
    usage: data.usage ?? {},
  };
}

export { GROQ_MODEL };
