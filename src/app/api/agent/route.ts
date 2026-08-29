import { callOpenCodeAgent, AgentProviderError } from "@/lib/agent/provider";
import { deterministicInterpretation } from "@/lib/agent/fallback";
import { agentRequestSchema } from "@/lib/agent/schemas";
import { detectSensitiveInput } from "@/lib/security/input-safety";
import { MemoryRateLimiter, requestClientKey } from "@/lib/security/rate-limit";
import { readLimitedJson } from "@/lib/security/request-body";

export const runtime = "nodejs";

const limiter = new MemoryRateLimiter({ limit: 15, windowMs: 60_000 });
const responseHeaders = { "Cache-Control": "no-store" } as const;

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status, headers: responseHeaders });
}

export async function POST(request: Request): Promise<Response> {
  const rate = limiter.check(`agent:${requestClientKey(request)}`);
  if (!rate.allowed) {
    return Response.json(
      {
        error: {
          code: "rate-limited",
          message: "Please wait a moment before trying another message.",
        },
      },
      {
        status: 429,
        headers: { ...responseHeaders, "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  const bodyResult = await readLimitedJson(request, 16_384);
  if (!bodyResult.ok && bodyResult.reason === "too-large") {
    return errorResponse(413, "request-too-large", "Keep the message under 1,000 characters.");
  }
  if (!bodyResult.ok) {
    return errorResponse(400, "invalid-request", "The request must be valid JSON.");
  }

  const parsed = agentRequestSchema.safeParse(bodyResult.value);
  if (!parsed.success) {
    return errorResponse(400, "invalid-request", "Check the message and try again.");
  }

  const sensitive = detectSensitiveInput(parsed.data.message);
  if (sensitive) {
    return errorResponse(
      422,
      "sensitive-input",
      `Remove the ${sensitive.kind} value. RightNow never needs identity or account numbers.`,
    );
  }

  if (!parsed.data.aiConsent) {
    return Response.json(
      deterministicInterpretation(
        parsed.data.message,
        parsed.data.locale,
        "consent-declined",
      ),
      { headers: responseHeaders },
    );
  }

  const apiKey = process.env.AI_API_KEY;
  if (process.env.AI_PROVIDER !== "opencode-go" || !apiKey) {
    return Response.json(
      deterministicInterpretation(parsed.data.message, parsed.data.locale, "unconfigured"),
      { headers: responseHeaders },
    );
  }

  try {
    const result = await callOpenCodeAgent(parsed.data, {
      apiKey,
      baseUrl: process.env.AI_BASE_URL,
      model: process.env.AI_MODEL,
    });
    return Response.json(result, { headers: responseHeaders });
  } catch (error) {
    const reason =
      error instanceof AgentProviderError ? error.code : ("provider-error" as const);
    return Response.json(
      deterministicInterpretation(parsed.data.message, parsed.data.locale, reason),
      { headers: responseHeaders },
    );
  }
}
