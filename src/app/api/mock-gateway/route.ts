import { randomBytes } from "node:crypto";

import { createApprovalToken, verifyApprovalToken } from "@/lib/security/approval-token";
import { mockGatewayRequestSchema } from "@/lib/security/mock-gateway";
import { MemoryRateLimiter, requestClientKey } from "@/lib/security/rate-limit";
import { readLimitedJson } from "@/lib/security/request-body";

export const runtime = "nodejs";

const limiter = new MemoryRateLimiter({ limit: 20, windowMs: 60_000 });
const transientDevelopmentSecret = randomBytes(32).toString("base64url");
const responseHeaders = { "Cache-Control": "no-store" } as const;

function gatewaySecret(): string | null {
  if ((process.env.MOCK_GATEWAY_SECRET?.length ?? 0) >= 32) {
    return process.env.MOCK_GATEWAY_SECRET ?? null;
  }
  return process.env.NODE_ENV === "production" ? null : transientDevelopmentSecret;
}

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status, headers: responseHeaders });
}

function mockReference(): string {
  return `MOCK-RNI-${new Date().getUTCFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function POST(request: Request): Promise<Response> {
  const rate = limiter.check(`gateway:${requestClientKey(request)}`);
  if (!rate.allowed) {
    return Response.json(
      { error: { code: "rate-limited", message: "Please wait before trying again." } },
      {
        status: 429,
        headers: { ...responseHeaders, "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  const bodyResult = await readLimitedJson(request, 16_384);
  if (!bodyResult.ok && bodyResult.reason === "too-large") {
    return errorResponse(413, "request-too-large", "The review request is too large.");
  }
  if (!bodyResult.ok) {
    return errorResponse(400, "invalid-request", "The request must be valid JSON.");
  }

  const parsed = mockGatewayRequestSchema.safeParse(bodyResult.value);
  if (!parsed.success) {
    return errorResponse(400, "invalid-request", "Only prepared demo actions can be reviewed.");
  }

  const secret = gatewaySecret();
  if (!secret) {
    return errorResponse(
      503,
      "gateway-unconfigured",
      "Mock submission is temporarily unavailable.",
    );
  }

  if (parsed.data.operation === "prepare") {
    const expiresAt = Date.now() + 5 * 60_000;
    return Response.json(
      {
        approvalToken: createApprovalToken(parsed.data.actionIds, secret, Date.now()),
        expiresAt: new Date(expiresAt).toISOString(),
      },
      { headers: responseHeaders },
    );
  }

  if (
    !verifyApprovalToken(
      parsed.data.approvalToken,
      parsed.data.actionIds,
      secret,
    )
  ) {
    return errorResponse(
      403,
      "approval-invalid",
      "That consolidated approval expired or no longer matches the selected actions.",
    );
  }

  const now = Date.now();
  return Response.json(
    {
      submissions: parsed.data.actionIds.map((actionId, index) => ({
        actionId,
        reference: mockReference(),
        status: "simulated" as const,
        timeline: [
          { label: "Reviewed together", at: new Date(now).toISOString() },
          {
            label: "Simulation record created",
            at: new Date(now + (index + 1) * 1_000).toISOString(),
          },
          {
            label: "Demo status check scheduled",
            at: new Date(now + 24 * 60 * 60_000).toISOString(),
          },
        ],
      })),
      disclosure: "Synthetic demo only. Nothing was sent to a government system.",
    },
    { headers: responseHeaders },
  );
}
