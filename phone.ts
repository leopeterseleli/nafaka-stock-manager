/** Normalize a Tanzanian phone number to E.164 without the plus, e.g. 255712345678 */
export function normalizePhone(input: string): string {
  const digits = (input || "").replace(/\D/g, "");
  if (digits.startsWith("255")) return digits;
  if (digits.startsWith("0")) return `255${digits.slice(1)}`;
  if (digits.length === 9) return `255${digits}`;
  return digits;
}

export function isValidPhone(input: string): boolean {
  const p = normalizePhone(input);
  return /^255\d{9}$/.test(p);
}

/** Auth credentials require an email, so we derive a deterministic one from the phone. */
export function phoneToEmail(input: string): string {
  return `${normalizePhone(input)}@nafaka.app`;
}

export const displayPhone = (input: string) => `+${normalizePhone(input)}`;
