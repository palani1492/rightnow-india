import { createHmac, timingSafeEqual } from "node:crypto";

type ApprovalPayload = Readonly<{
  actionIds: readonly string[];
  expiresAt: number;
}>;

function sortedUnique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function createApprovalToken(
  actionIds: readonly string[],
  secret: string,
  now = Date.now(),
  ttlMs = 5 * 60_000,
): string {
  const payload: ApprovalPayload = {
    actionIds: sortedUnique(actionIds),
    expiresAt: now + ttlMs,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function verifyApprovalToken(
  token: string,
  actionIds: readonly string[],
  secret: string,
  now = Date.now(),
): boolean {
  try {
    const [encodedPayload, receivedSignature, extra] = token.split(".");
    if (!encodedPayload || !receivedSignature || extra) return false;

    const expectedSignature = sign(encodedPayload, secret);
    const expected = Buffer.from(expectedSignature);
    const received = Buffer.from(receivedSignature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      return false;
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as ApprovalPayload;

    return (
      Number.isFinite(payload.expiresAt) &&
      now <= payload.expiresAt &&
      JSON.stringify(payload.actionIds) === JSON.stringify(sortedUnique(actionIds))
    );
  } catch {
    return false;
  }
}
