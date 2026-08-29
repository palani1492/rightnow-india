import {
  agentResponseSchema,
  modelInterpretationSchema,
  modelOutputJsonSchema,
  type AgentRequest,
  type AgentResponse,
} from "./schemas";
import { casePlanReply, safeMissionReply } from "./fallback";
import { detectSensitiveInput } from "../security/input-safety";
import { hasUnsafeGeneratedPlan } from "../security/output-safety";

export type ProviderFailureCode =
  | "timeout"
  | "invalid-output"
  | "provider-error";

export class AgentProviderError extends Error {
  readonly code: ProviderFailureCode;

  constructor(code: ProviderFailureCode) {
    super(code);
    this.name = "AgentProviderError";
    this.code = code;
  }
}

type ProviderOptions = Readonly<{
  apiKey: string;
  baseUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}>;

const systemInstruction = `You classify a citizen's message for the independent RightNow India synthetic prototype.
Return only the required JSON schema. You may map one of eight mission IDs and extract only explicitly stated, non-sensitive facts from the allowed fact keys.
Use only these exact domain values when relevant: businessStage planning|operating; workType salaried|freelance|gig; deliveryStatus expecting|recent_birth; studyLevel school|undergraduate|postgraduate; incomeBand low|middle|high; annualIncomeBand under_3l|3l_to_8l|above_8l; jobStatus unemployed|notice_period|working; previousCoverage epfo|esic|both|neither; grievanceType public_service|consumer. Boolean facts must be true or false and childOrder must be 1, 2, or 3. Use safety for a robbery, break-in, theft in progress, or urgent need for police support. Use moving for moving, relocating or shifting residence to a different state.
Never infer eligibility, invent facts, repeat personal identifiers, request identifiers, claim a submission happened, or give medical, legal or financial conclusions.
For one of the eight verified demo accelerators, casePlan must be null. For every other non-sensitive situation, however unusual or outside a government-service catalogue, set missionId to null, facts to [], and create a casePlan with two to four specific, reviewable preparation steps. Do not refuse merely because the request is outside the fixed catalogue. A casePlan is a simulation brief, not an official procedure: do not name unverified schemes, links, phone numbers, fees, deadlines, doses or eligibility rules; do not repeat names or personal details from the input; and do not claim to contact anyone or complete anything. Prefer neutral preparation verbs such as clarify, list, gather, identify and verify. For medical, legal, financial or immediate-danger situations, make the plan conservative and direct the person to appropriate urgent professional or emergency help when needed. Reply briefly in the detected language.`;

const OPEN_CODE_GO_BASE_URL = "https://opencode.ai/zen/go/v1";

function safeProviderBaseUrl(candidate?: string): string {
  const value = (candidate ?? OPEN_CODE_GO_BASE_URL).replace(/\/+$/u, "");
  if (value !== OPEN_CODE_GO_BASE_URL) throw new AgentProviderError("provider-error");
  return value;
}

function outputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const response = payload as {
    output_text?: unknown;
    output?: readonly {
      type?: unknown;
      content?: readonly { type?: unknown; text?: unknown }[];
    }[];
  };
  if (typeof response.output_text === "string") return response.output_text;

  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }
  return null;
}

export async function callOpenCodeAgent(
  request: Pick<AgentRequest, "message" | "locale">,
  options: ProviderOptions,
): Promise<AgentResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8_000);

  try {
    const baseUrl = safeProviderBaseUrl(options.baseUrl);
    const response = await (options.fetchImpl ?? fetch)(`${baseUrl}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model ?? "gpt-5.6-luna",
        store: false,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: systemInstruction }],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
                  message: request.message,
                  locale: request.locale,
                }),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "rightnow_intent",
            strict: true,
            schema: modelOutputJsonSchema,
          },
        },
      }),
      signal: controller.signal,
      redirect: "error",
    });

    if (!response.ok) throw new AgentProviderError("provider-error");

    let responsePayload: unknown;
    try {
      responsePayload = await response.json();
    } catch {
      throw new AgentProviderError("invalid-output");
    }
    const text = outputText(responsePayload);
    if (!text) throw new AgentProviderError("invalid-output");

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new AgentProviderError("invalid-output");
    }

    const validated = modelInterpretationSchema.safeParse(parsed);
    if (!validated.success) throw new AgentProviderError("invalid-output");
    if (validated.data.casePlan && hasUnsafeGeneratedPlan(validated.data.casePlan)) {
      throw new AgentProviderError("invalid-output");
    }
    if (
      validated.data.facts.some(
        ({ value }) => typeof value === "string" && detectSensitiveInput(value),
      )
    ) {
      throw new AgentProviderError("invalid-output");
    }

    const extractedFacts = validated.data.facts.filter(({ key }) => key !== "lifeEvent");
    const facts = validated.data.missionId
      ? [
          ...extractedFacts.slice(0, 7),
          { key: "lifeEvent" as const, value: validated.data.missionId },
        ]
      : [];

    const reply = validated.data.missionId
      ? safeMissionReply(validated.data.missionId, validated.data.language)
      : validated.data.casePlan
        ? casePlanReply(validated.data.language)
        : safeMissionReply(null, validated.data.language);

    return agentResponseSchema.parse({
      ...validated.data,
      facts,
      reply,
      mode: "model",
    });
  } catch (error) {
    if (error instanceof AgentProviderError) throw error;
    if (controller.signal.aborted) throw new AgentProviderError("timeout");
    throw new AgentProviderError("provider-error");
  } finally {
    clearTimeout(timeout);
  }
}
