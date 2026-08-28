export type LanguageCode = "en" | "hi" | "ta";

export type MissionId =
  | "pregnancy"
  | "college"
  | "work"
  | "job-loss"
  | "business"
  | "grievance";

export type ServiceId =
  | "pmmvy"
  | "jsy"
  | "jssk"
  | "birth-registration"
  | "national-scholarship"
  | "digilocker"
  | "academic-bank"
  | "pan-readiness"
  | "income-tax-readiness"
  | "epfo-enrolment"
  | "esic-enrolment"
  | "epfo-claim"
  | "esic-unemployment"
  | "national-career-service"
  | "udyam"
  | "gst-readiness"
  | "pmegp-mudra"
  | "cpgrams"
  | "consumer-helpline";

export type FactKey =
  | "lifeEvent"
  | "state"
  | "residenceType"
  | "incomeBand"
  | "annualIncomeBand"
  | "childOrder"
  | "deliveryStatus"
  | "hasBankAccount"
  | "studyLevel"
  | "studentStatus"
  | "hasAcademicRecords"
  | "workType"
  | "hasPan"
  | "employerType"
  | "previousCoverage"
  | "jobStatus"
  | "hasUan"
  | "businessStage"
  | "businessType"
  | "annualTurnoverBand"
  | "grievanceType"
  | "previousAttempt";

export type FactValue = string | number | boolean | readonly string[];

export interface HouseholdProfile {
  id: string;
  displayName?: string;
  preferredLanguage: LanguageCode;
  facts: Partial<Record<FactKey, FactValue>>;
  updatedAt: string;
}

export type EligibilityStatus = "eligible" | "needs_information" | "not_eligible";

export interface EligibilityResult {
  status: EligibilityStatus;
  reason: string;
  missingFacts: FactKey[];
  evidence: FactKey[];
}

export interface OfficialSource {
  label: string;
  url: string;
}

export interface ReviewItem {
  factKey: FactKey;
  label: string;
  value: string;
}

export interface PreparedAction {
  id: string;
  serviceId: ServiceId;
  missionId: MissionId;
  title: string;
  summary: string;
  status: "prepared";
  eligibility: EligibilityResult;
  requiredDocuments: readonly string[];
  reviewItems: ReviewItem[];
  sources: readonly OfficialSource[];
  lastVerified: string;
  disclaimer: string;
}

export interface ServiceConnector {
  id: ServiceId;
  missionIds: readonly MissionId[];
  title: string;
  shortTitle: string;
  description: string;
  requiredFacts: readonly FactKey[];
  requiredDocuments: readonly string[];
  evaluate(profile: HouseholdProfile): EligibilityResult;
  prepare(profile: HouseholdProfile, missionId: MissionId): PreparedAction;
  sources: readonly OfficialSource[];
  lastVerified: string;
}

export interface QuestionOption {
  value: FactValue;
  label: string;
}

export interface AdaptiveQuestion {
  factKey: FactKey;
  prompt: string;
  help?: string;
  input: "choice" | "text" | "number" | "boolean";
  options?: readonly QuestionOption[];
}

export interface MissionDefinition {
  id: MissionId;
  title: string;
  prompt: string;
  summary: string;
  serviceIds: readonly ServiceId[];
  questions: readonly AdaptiveQuestion[];
  examples: Record<LanguageCode, readonly string[]>;
}

export interface MissionPlan {
  mission: MissionDefinition;
  evaluations: ReadonlyArray<{ serviceId: ServiceId; result: EligibilityResult }>;
  actions: PreparedAction[];
  nextQuestions: AdaptiveQuestion[];
}

export interface AutopilotResult {
  scannedCount: number;
  discoveredActions: PreparedAction[];
  needsInformation: ReadonlyArray<{ serviceId: ServiceId; result: EligibilityResult }>;
  notEligible: ReadonlyArray<{ serviceId: ServiceId; result: EligibilityResult }>;
}

export type FactUpdate = Partial<Record<FactKey, FactValue>>;
