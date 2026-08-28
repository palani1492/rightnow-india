import { z } from "zod";
import type { HouseholdProfile, PreparedAction } from "@/lib/types";

export interface InboxAction extends Omit<PreparedAction, "status"> {
  status: "prepared" | "submitted" | "completed";
  reference?: string;
  timeline?: ReadonlyArray<{ label: string; at: string }>;
}

export interface StoredHousehold {
  version: 1;
  profile: HouseholdProfile;
  inbox: InboxAction[];
  aiConsent: boolean | null;
}

const factKeySchema = z.enum([
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

const missionIdSchema = z.enum([
  "pregnancy",
  "college",
  "work",
  "job-loss",
  "business",
  "grievance",
]);

const serviceIdSchema = z.enum([
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
]);

const factValueSchema = z.union([
  z.string().max(200),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().max(120)).max(20),
]);

const inboxActionSchema = z
  .object({
    id: z.string().min(3).max(130),
    serviceId: serviceIdSchema,
    missionId: missionIdSchema,
    title: z.string().min(1).max(200),
    summary: z.string().min(1).max(1_000),
    status: z.enum(["prepared", "submitted", "completed"]),
    eligibility: z
      .object({
        status: z.enum(["eligible", "needs_information", "not_eligible"]),
        reason: z.string().min(1).max(1_000),
        missingFacts: z.array(factKeySchema).max(30),
        evidence: z.array(factKeySchema).max(30),
      })
      .strict(),
    requiredDocuments: z.array(z.string().max(200)).max(30),
    reviewItems: z
      .array(
        z
          .object({
            factKey: factKeySchema,
            label: z.string().max(120),
            value: z.string().max(200),
          })
          .strict(),
      )
      .max(30),
    sources: z
      .array(
        z
          .object({
            label: z.string().max(200),
            url: z.url().max(2_000),
          })
          .strict(),
      )
      .max(10),
    lastVerified: z.string().max(40),
    disclaimer: z.string().max(1_000),
    reference: z.string().max(120).optional(),
    timeline: z
      .array(
        z
          .object({ label: z.string().max(200), at: z.string().max(40) })
          .strict(),
      )
      .max(20)
      .optional(),
  })
  .strict();

const storageSchema = z
  .object({
    version: z.literal(1),
    profile: z
      .object({
        id: z.string().max(80),
        displayName: z.string().max(80).optional(),
        preferredLanguage: z.enum(["en", "hi", "ta"]),
        facts: z.partialRecord(factKeySchema, factValueSchema),
        updatedAt: z.string().max(40),
      })
      .strict(),
    inbox: z.array(inboxActionSchema).max(60),
    aiConsent: z.boolean().nullable(),
  })
  .strict();

export const STORAGE_KEY = "rightnow-india:household:v1";

export function createEmptyHousehold(now = new Date().toISOString()): StoredHousehold {
  return {
    version: 1,
    profile: {
      id: "synthetic-household",
      displayName: "Demo household",
      preferredLanguage: "en",
      facts: {},
      updatedAt: now,
    },
    inbox: [],
    aiConsent: null,
  };
}

export function loadHousehold(storage: Pick<Storage, "getItem">): StoredHousehold {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return createEmptyHousehold();

  try {
    const parsed = storageSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return createEmptyHousehold();
    return parsed.data as StoredHousehold;
  } catch {
    return createEmptyHousehold();
  }
}

export function saveHousehold(
  storage: Pick<Storage, "setItem">,
  household: StoredHousehold,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(household));
}

export function clearHousehold(storage: Pick<Storage, "removeItem">): StoredHousehold {
  storage.removeItem(STORAGE_KEY);
  return createEmptyHousehold();
}
