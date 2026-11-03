import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BLOCKED_DOMAINS = new Set([
  "example.com", "example.org", "domain.com", "yourdomain.com",
  "sentry.io", "wixpress.com", "shopify.com", "cloudflare.com",
  "wix.com", "squarespace.com", "webflow.com", "weebly.com", "wordpress.com",
]);

function validEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  const domain = email.split("@")[1] || "";
  if (
    email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    BLOCKED_DOMAINS.has(domain) ||
    /^(?:your|you|name|username|noreply|no-reply|donotreply)@/.test(email) ||
    /\.(?:png|jpe?g|gif|webp|svg)$/.test(email)
  ) return null;
  return email;
}

function decodeCloudflareEmails(html: string): string[] {
  const emails: string[] = [];
  for (const match of html.matchAll(/data-cfemail=["']([a-f0-9]+)["']/gi)) {
    try {
      const key = parseInt(match[1].slice(0, 2), 16);
      let decoded = "";
      for (let i = 2; i < match[1].length; i += 2) {
        decoded += String.fromCharCode(parseInt(match[1].slice(i, i + 2), 16) ^ key);
      }
      emails.push(decoded);
    } catch { /* Ignore malformed obfuscated addresses. */ }
  }
  return emails;
}

export function extractEmailsFromHtml(html: string, pageUrl: string): string[] {
  const decoded = html
    .replace(/&amp;/gi, "&").replace(/&commat;/gi, "@")
    .replace(/&period;/gi, ".").replace(/&#0*64;/g, "@").replace(/&#0*46;/g, ".");
  const cleaned = decoded
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
  const visibleText = cleaned.replace(/<[^>]+>/g, " ")
    .replace(/\s*(?:\[at\]|\(at\))\s*/gi, "@")
    .replace(/\s*(?:\[dot\]|\(dot\))\s*/gi, ".");
  const mailtos = [...cleaned.matchAll(/mailto:([^"'?>\s]+)/gi)].map((match) => {
    try { return decodeURIComponent(match[1]); } catch { return match[1]; }
  });
  const candidates = [
    ...(cleaned.match(EMAIL_PATTERN) || []), ...(visibleText.match(EMAIL_PATTERN) || []),
    ...mailtos, ...decodeCloudflareEmails(cleaned),
  ];
  const hostname = new URL(pageUrl).hostname.replace(/^www\./, "").toLowerCase();

  return [...new Set(candidates.map(validEmail).filter((email): email is string => !!email))]
    .sort((a, b) => scoreEmail(b, hostname, mailtos) - scoreEmail(a, hostname, mailtos));
}

function scoreEmail(email: string, hostname: string, mailtos: string[]): number {
  const [local, domain] = email.split("@");
  let score = mailtos.some((value) => value.toLowerCase().includes(email)) ? 15 : 0;
  if (hostname === domain || hostname.endsWith(`.${domain}`) || domain.endsWith(`.${hostname}`)) score += 100;
  if (/^(?:info|contact|hello|enquiries|inquiries|sales|admin)$/.test(local)) score += 30;
  return score;
}

function isPrivateAddress(address: string): boolean {
  const ip = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (ip.startsWith("::ffff:")) return isPrivateAddress(ip.slice(7));
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  return ip === "::" || ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") ||
    ip.startsWith("fe8") || ip.startsWith("fe9") || ip.startsWith("fea") ||
    ip.startsWith("feb") || ip.startsWith("ff");
}

async function publicUrl(input: string, base?: string): Promise<URL> {
  const url = base ? new URL(input, base) : new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  const hostname = url.hostname.toLowerCase();
  if (
    !["http:", "https:"].includes(url.protocol) || url.username || url.password ||
    (url.port && !["80", "443"].includes(url.port)) || hostname === "localhost" ||
    hostname.endsWith(".local") || hostname.endsWith(".internal")
  ) throw new Error("Unsupported website URL");
  const addresses = await lookup(hostname.replace(/^\[|\]$/g, ""), { all: true });
  if (addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("Private website addresses are not allowed");
  return url;
}

async function fetchPublicHtml(input: string): Promise<{ html: string; url: string } | null> {
  try {
    const deadline = Date.now() + 15000;
    let current = input;
    for (let redirects = 0; redirects < 4; redirects++) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) return null;
      const url = await publicUrl(current);
      const response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(remaining),
        headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "LarkspurLeadResearch/1.0" },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return null;
        current = new URL(location, url).toString();
        continue;
      }
      if (!response.ok) return null;
      const contentType = response.headers.get("content-type") || "";
      if (contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType)) return null;
      return { html: (await response.text()).slice(0, 1_000_000), url: url.toString() };
    }
  } catch { /* Dead, blocked, and invalid websites simply produce no email. */ }
  return null;
}

function contactLinks(html: string, pageUrl: string): string[] {
  const base = new URL(pageUrl);
  const links = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    if (!/contact|support/i.test(`${match[1]} ${match[2].replace(/<[^>]+>/g, " ")}`)) continue;
    try {
      const url = new URL(match[1], base);
      if (url.hostname === base.hostname && ["http:", "https:"].includes(url.protocol)) links.add(url.toString());
    } catch { /* Ignore malformed links. */ }
    if (links.size === 2) break;
  }
  return [...links];
}

export async function findPublicEmail(website: string): Promise<{ email: string; sourceUrl: string } | null> {
  const homepage = await fetchPublicHtml(website);
  if (!homepage) return null;
  const homepageEmails = extractEmailsFromHtml(homepage.html, homepage.url);
  if (homepageEmails[0]) return { email: homepageEmails[0], sourceUrl: homepage.url };

  const contactPages = await Promise.all(
    contactLinks(homepage.html, homepage.url).map((link) => fetchPublicHtml(link)),
  );
  for (const page of contactPages) {
    if (!page) continue;
    const emails = extractEmailsFromHtml(page.html, page.url);
    if (emails[0]) return { email: emails[0], sourceUrl: page.url };
  }
  return null;
}
