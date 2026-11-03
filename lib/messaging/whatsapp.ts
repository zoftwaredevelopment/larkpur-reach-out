export function normalizeWhatsAppNumber(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // Google Places returns Nigerian numbers in national format (080…).
  // Also tolerate international numbers written as +234 (0) 80….
  if (digits.startsWith("0") && digits.length === 11) {
    digits = `234${digits.slice(1)}`;
  } else if (digits.startsWith("2340") && digits.length === 14) {
    digits = `234${digits.slice(4)}`;
  }

  // wa.me expects an international number without + or punctuation.
  if (!/^[1-9]\d{7,14}$/.test(digits)) {
    return null;
  }

  return digits;
}

export function buildWhatsAppUrl(
  phone: string,
  message?: string | null,
): string | null {
  const number = normalizeWhatsAppNumber(phone);
  if (!number) return null;

  const text = message?.trim();
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
