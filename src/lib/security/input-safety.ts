export type SensitiveInputKind =
  | "aadhaar"
  | "pan"
  | "otp"
  | "bank-account"
  | "phone"
  | "email";

const rules: readonly Readonly<{
  kind: SensitiveInputKind;
  pattern: RegExp;
}>[] = [
  {
    kind: "bank-account",
    pattern: /(?:account|a\/c|खाता|கணக்கு)\D{0,16}\d{9,18}\b/iu,
  },
  {
    kind: "email",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu,
  },
  {
    kind: "phone",
    pattern: /(?:\+?91[ -]?)?[6-9]\d{4}[ -]?\d{5}\b/u,
  },
  { kind: "aadhaar", pattern: /\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/u },
  { kind: "pan", pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/iu },
  {
    kind: "otp",
    pattern: /(?:otp|one[ -]?time password|ओटीपी|ஒருமுறை கடவுச்சொல்)\D{0,12}\d{4,8}\b/iu,
  },
] as const;

export function detectSensitiveInput(
  message: string,
): Readonly<{ kind: SensitiveInputKind }> | null {
  const match = rules.find(({ pattern }) => pattern.test(message));
  return match ? { kind: match.kind } : null;
}
