import { z } from "zod";

export const languageSchema = z.enum(["en", "hi", "ta"]);

export const missionIdSchema = z.enum([
  "pregnancy",
  "college",
  "work",
  "job-loss",
  "business",
  "grievance",
  "safety",
  "moving",
]);

export const factKeySchema = z.enum([
  "lifeEvent",
  "state",
  "residenceType",
  "incomeBand",
  "annualIncomeBand",
  "childOrder",
  "deliveryStatus",
  "hasBankAccount",
  "studyLevel",
  "studentStatus",
  "hasAcademicRecords",
  "workType",
  "hasPan",
  "employerType",
  "previousCoverage",
  "jobStatus",
  "hasUan",
  "businessStage",
  "businessType",
  "annualTurnoverBand",
  "grievanceType",
  "previousAttempt",
]);

const factValueSchema = z.union([
  z.string().trim().min(1).max(80),
  z.number().int().min(0).max(10),
  z.boolean(),
]);

const allowedValues: Readonly<
  Partial<Record<z.infer<typeof factKeySchema>, readonly (string | number | boolean)[]>>
> = {
  lifeEvent: missionIdSchema.options,
  state: ["Tamil Nadu", "Kerala", "Karnataka", "Delhi", "Other"],
  residenceType: ["urban", "rural"],
  incomeBand: ["low", "middle", "high"],
  annualIncomeBand: ["under_3l", "3l_to_8l", "above_8l"],
  childOrder: [1, 2, 3],
  deliveryStatus: ["expecting", "recent_birth"],
  hasBankAccount: [true, false],
  studyLevel: ["school", "undergraduate", "postgraduate"],
  studentStatus: [true, false],
  hasAcademicRecords: [true, false],
  workType: ["salaried", "freelance", "gig"],
  hasPan: [true, false],
  employerType: ["covered", "not_covered", "unknown"],
  previousCoverage: ["epfo", "esic", "both", "neither"],
  jobStatus: ["unemployed", "notice_period", "working"],
  hasUan: [true, false],
  businessStage: ["planning", "operating"],
  businessType: ["services", "trading", "manufacturing"],
  annualTurnoverBand: ["under_20l", "20l_to_40l", "above_40l"],
  grievanceType: ["public_service", "consumer"],
  previousAttempt: [true, false],
};

export const extractedFactSchema = z
  .object({ key: factKeySchema, value: factValueSchema })
  .strict()
  .superRefine(({ key, value }, context) => {
    if (!allowedValues[key]?.includes(value)) {
      context.addIssue({
        code: "custom",
        message: `Unsupported value for ${key}`,
        path: ["value"],
      });
    }
  });

const missionFactKeys: Readonly<
  Record<z.infer<typeof missionIdSchema>, readonly z.infer<typeof factKeySchema>[]>
> = {
  pregnancy: ["lifeEvent", "state", "residenceType", "childOrder", "deliveryStatus", "hasBankAccount"],
  college: ["lifeEvent", "state", "studentStatus", "studyLevel", "incomeBand", "hasAcademicRecords"],
  work: ["lifeEvent", "state", "workType", "annualIncomeBand", "hasPan", "employerType"],
  "job-loss": ["lifeEvent", "state", "jobStatus", "previousCoverage", "hasUan"],
  business: ["lifeEvent", "state", "businessStage", "businessType", "annualTurnoverBand", "hasPan", "hasBankAccount"],
  grievance: ["lifeEvent", "grievanceType", "previousAttempt"],
  safety: ["lifeEvent"],
  moving: ["lifeEvent"],
};

export const casePlanSchema = z
  .object({
    title: z.string().trim().min(3).max(100),
    summary: z.string().trim().min(8).max(280),
    steps: z
      .array(
        z
          .object({
            title: z.string().trim().min(3).max(100),
            description: z.string().trim().min(8).max(220),
          })
          .strict(),
      )
      .min(2)
      .max(4),
  })
  .strict();

export const modelInterpretationSchema = z
  .object({
    language: languageSchema,
    missionId: missionIdSchema.nullable(),
    confidence: z.number().min(0).max(1),
    facts: z.array(extractedFactSchema).max(8),
    reply: z.string().trim().min(1).max(320),
    casePlan: casePlanSchema.nullable(),
  })
  .strict()
  .superRefine(({ missionId, facts, casePlan }, context) => {
    const keys = facts.map(({ key }) => key);
    if (new Set(keys).size !== keys.length) {
      context.addIssue({ code: "custom", message: "Duplicate fact keys", path: ["facts"] });
    }
    if (!missionId && facts.length > 0) {
      context.addIssue({ code: "custom", message: "Unsupported missions cannot extract facts", path: ["facts"] });
      return;
    }
    if (!missionId && !casePlan) {
      context.addIssue({ code: "custom", message: "Open-ended requests require a case plan", path: ["casePlan"] });
    }
    if (missionId && casePlan) {
      context.addIssue({ code: "custom", message: "Fixed missions cannot include a general case plan", path: ["casePlan"] });
    }
    if (missionId) {
      const allowed = new Set(missionFactKeys[missionId]);
      facts.forEach(({ key }, index) => {
        if (!allowed.has(key)) {
          context.addIssue({
            code: "custom",
            message: `Fact ${key} does not belong to ${missionId}`,
            path: ["facts", index, "key"],
          });
        }
      });
    }
  });

export const agentRequestSchema = z
  .object({
    message: z.string().trim().min(2).max(1_000),
    locale: languageSchema.optional(),
    aiConsent: z.boolean().optional().default(false),
  })
  .strict();

export const agentResponseSchema = modelInterpretationSchema.extend({
  mode: z.enum(["model", "fallback"]),
  fallbackReason: z
    .enum(["consent-declined", "unconfigured", "timeout", "invalid-output", "provider-error"])
    .optional(),
});

export type AgentRequest = z.infer<typeof agentRequestSchema>;
export type AgentResponse = z.infer<typeof agentResponseSchema>;
export type Language = z.infer<typeof languageSchema>;
export type MissionId = z.infer<typeof missionIdSchema>;
export type CasePlan = z.infer<typeof casePlanSchema>;

export const modelOutputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["language", "missionId", "confidence", "facts", "reply", "casePlan"],
  properties: {
    language: { type: "string", enum: languageSchema.options },
    missionId: {
      anyOf: [
        { type: "string", enum: missionIdSchema.options },
        { type: "null" },
      ],
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    facts: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "value"],
        properties: {
          key: { type: "string", enum: factKeySchema.options },
          value: {
            anyOf: [
              { type: "string", minLength: 1, maxLength: 80 },
              { type: "integer", minimum: 0, maximum: 10 },
              { type: "boolean" },
            ],
          },
        },
      },
    },
    reply: { type: "string", minLength: 1, maxLength: 320 },
    casePlan: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: ["title", "summary", "steps"],
          properties: {
            title: { type: "string", minLength: 3, maxLength: 100 },
            summary: { type: "string", minLength: 8, maxLength: 280 },
            steps: {
              type: "array",
              minItems: 2,
              maxItems: 4,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["title", "description"],
                properties: {
                  title: { type: "string", minLength: 3, maxLength: 100 },
                  description: { type: "string", minLength: 8, maxLength: 220 },
                },
              },
            },
          },
        },
      ],
    },
  },
} as const;
