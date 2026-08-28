import { z } from "zod";

export const supportedServiceIds = [
  "pmmvy",
  "jsy",
  "jssk",
  "birth-registration",
  "national-scholarship",
  "digilocker",
  "academic-bank",
  "pan-readiness",
  "income-tax-readiness",
  "epfo-enrolment",
  "esic-enrolment",
  "epfo-claim",
  "esic-unemployment",
  "national-career-service",
  "udyam",
  "gst-readiness",
  "pmegp-mudra",
  "cpgrams",
  "consumer-helpline",
] as const;

const serviceSet = new Set<string>(supportedServiceIds);

export const preparedActionIdSchema = z
  .string()
  .min(3)
  .max(130)
  .refine((value) => {
    const [householdId, serviceId, extra] = value.split(":");
    return (
      !extra &&
      /^[a-z0-9-]{1,64}$/u.test(householdId ?? "") &&
      serviceSet.has(serviceId ?? "")
    );
  }, "Unknown prepared action ID");

const actionIdsSchema = z
  .array(preparedActionIdSchema)
  .min(1)
  .max(supportedServiceIds.length)
  .refine((values) => new Set(values).size === values.length, "Duplicate action IDs");

export const mockGatewayRequestSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("prepare"), actionIds: actionIdsSchema }).strict(),
  z
    .object({
      operation: z.literal("submit"),
      actionIds: actionIdsSchema,
      approvalToken: z.string().min(3).max(2_000),
    })
    .strict(),
]);
