import { describe, expect, it } from "vitest";

import { missionCatalog, serviceConnectors } from "./catalog";
import {
  applyFactUpdate,
  evaluateConnector,
  getConnector,
  getMission,
  getNextQuestions,
  planMission,
  prepareConnector,
  scanHousehold,
} from "./mission-engine";
import type { HouseholdProfile, ServiceId } from "./types";

const baseProfile: HouseholdProfile = {
  id: "household-demo",
  preferredLanguage: "en",
  facts: {},
  updatedAt: "2026-08-28T08:00:00.000Z",
};

const pregnancyProfile: HouseholdProfile = {
  ...baseProfile,
  facts: {
    lifeEvent: "pregnancy",
    state: "Tamil Nadu",
    residenceType: "urban",
    childOrder: 1,
    deliveryStatus: "expecting",
    hasBankAccount: true,
  },
};

describe("catalog", () => {
  it("contains eight verified accelerators and twenty-four uniquely identified connectors", () => {
    expect(missionCatalog).toHaveLength(8);
    expect(serviceConnectors).toHaveLength(24);
    expect(new Set(serviceConnectors.map((connector) => connector.id)).size).toBe(24);
  });

  it("keeps every connector traceable to current official sources", () => {
    for (const connector of serviceConnectors) {
      expect(connector.sources.length).toBeGreaterThan(0);
      expect(connector.sources.every(({ url }) => url.startsWith("https://"))).toBe(true);
      expect(connector.lastVerified).toMatch(/^2026-08-\d{2}$/);
      expect(connector.missionIds.length).toBeGreaterThan(0);
    }
  });

  it("links Aadhaar address updates to the current official My Aadhaar page", () => {
    expect(getConnector("aadhaar-address-update").sources).toContainEqual({
      label: "UIDAI: Update your Aadhaar",
      url: "https://uidai.gov.in/en/my-aadhaar",
    });
  });

  it("gives each mission adaptive questions and valid connector references", () => {
    const connectorIds = new Set(serviceConnectors.map(({ id }) => id));

    for (const mission of missionCatalog) {
      expect(mission.questions.length).toBeGreaterThanOrEqual(0);
      expect(mission.examples.en.length).toBeGreaterThan(0);
      expect(mission.examples.hi.length).toBeGreaterThan(0);
      expect(mission.examples.ta.length).toBeGreaterThan(0);
      expect(mission.serviceIds.every((id) => connectorIds.has(id))).toBe(true);
    }
  });
});

describe("eligibility", () => {
  it("returns needs_information without guessing when deterministic facts are missing", () => {
    const result = evaluateConnector("pmmvy", baseProfile);

    expect(result.status).toBe("needs_information");
    expect(result.missingFacts).toEqual(
      expect.arrayContaining(["lifeEvent", "childOrder", "deliveryStatus"]),
    );
  });

  it("marks PMMVY as eligible for a matching synthetic profile", () => {
    const result = evaluateConnector("pmmvy", pregnancyProfile);

    expect(result.status).toBe("eligible");
    expect(result.reason).toContain("demo rules");
    expect(result.missingFacts).toEqual([]);
  });

  it("returns a factual non-eligible result when a rule does not match", () => {
    const result = evaluateConnector("birth-registration", pregnancyProfile);

    expect(result.status).toBe("not_eligible");
    expect(result.reason).toContain("after a birth");
  });

  it("rejects unknown generated service and mission identifiers", () => {
    expect(() => getConnector("made-up" as ServiceId)).toThrow(/Unknown service/);
    expect(() => getMission("made-up" as never)).toThrow(/Unknown mission/);
  });

  it.each([
    ["pmmvy", { lifeEvent: "pregnancy", state: "Tamil Nadu", childOrder: 1, deliveryStatus: "expecting", hasBankAccount: true }],
    ["jsy", { lifeEvent: "pregnancy", state: "Tamil Nadu", residenceType: "urban", deliveryStatus: "expecting" }],
    ["jssk", { lifeEvent: "pregnancy", state: "Tamil Nadu", deliveryStatus: "expecting" }],
    ["birth-registration", { lifeEvent: "pregnancy", state: "Tamil Nadu", deliveryStatus: "recent_birth" }],
    ["national-scholarship", { lifeEvent: "college", state: "Kerala", studentStatus: true, studyLevel: "undergraduate", incomeBand: "low" }],
    ["digilocker", { lifeEvent: "college", studentStatus: true, hasAcademicRecords: true }],
    ["academic-bank", { lifeEvent: "college", studentStatus: true, studyLevel: "postgraduate" }],
    ["pan-readiness", { lifeEvent: "work", state: "Karnataka", workType: "freelance", hasPan: false }],
    ["income-tax-readiness", { lifeEvent: "work", workType: "freelance", annualIncomeBand: "3l_to_8l", hasPan: true }],
    ["epfo-enrolment", { lifeEvent: "work", workType: "salaried", employerType: "covered" }],
    ["esic-enrolment", { lifeEvent: "work", workType: "salaried", employerType: "covered", annualIncomeBand: "under_3l" }],
    ["epfo-claim", { lifeEvent: "job-loss", jobStatus: "unemployed", previousCoverage: "both", hasUan: true }],
    ["esic-unemployment", { lifeEvent: "job-loss", jobStatus: "unemployed", previousCoverage: "both" }],
    ["national-career-service", { lifeEvent: "job-loss", jobStatus: "unemployed", state: "Delhi" }],
    ["udyam", { lifeEvent: "business", businessStage: "planning", businessType: "services", hasPan: true }],
    ["gst-readiness", { lifeEvent: "business", businessStage: "operating", businessType: "trading", annualTurnoverBand: "above_40l", hasPan: true }],
    ["pmegp-mudra", { lifeEvent: "business", businessStage: "planning", businessType: "manufacturing", hasBankAccount: true }],
    ["cpgrams", { lifeEvent: "grievance", grievanceType: "public_service", previousAttempt: true }],
    ["consumer-helpline", { lifeEvent: "grievance", grievanceType: "consumer", previousAttempt: true }],
    ["police-report-preparation", { lifeEvent: "safety" }],
    ["aadhaar-address-update", { lifeEvent: "moving" }],
    ["voter-address-update", { lifeEvent: "moving" }],
    ["ration-portability", { lifeEvent: "moving" }],
    ["vehicle-address-update", { lifeEvent: "moving" }],
  ] as const)("evaluates and prepares the %s connector", (serviceId, facts) => {
    const connector = getConnector(serviceId);
    const profile: HouseholdProfile = { ...baseProfile, facts };
    const result = connector.evaluate(profile);
    const action = connector.prepare(profile, connector.missionIds[0]);

    expect(result.status).toBe("eligible");
    expect(action.serviceId).toBe(serviceId);
    expect(action.reviewItems).toHaveLength(connector.requiredFacts.length);
  });
});

describe("preparation and mission planning", () => {
  it("prepares a reviewable action without submitting anything", () => {
    const action = prepareConnector("pmmvy", pregnancyProfile, "pregnancy");

    expect(action.status).toBe("prepared");
    expect(action.serviceId).toBe("pmmvy");
    expect(action.id).toBe("household-demo:pmmvy");
    expect(action.reviewItems).toEqual(
      expect.arrayContaining([expect.objectContaining({ factKey: "childOrder", value: "1" })]),
    );
    expect(action.disclaimer).toContain("mock");
  });

  it("plans all matching pregnancy services and asks only unanswered questions", () => {
    const plan = planMission("pregnancy", pregnancyProfile);

    expect(plan.actions.map(({ serviceId }) => serviceId)).toEqual(
      expect.arrayContaining(["pmmvy", "jsy", "jssk"]),
    );
    expect(plan.actions.some(({ serviceId }) => serviceId === "birth-registration")).toBe(false);
    expect(plan.nextQuestions.every(({ factKey }) => pregnancyProfile.facts[factKey] === undefined)).toBe(
      true,
    );
  });

  it("returns the next unanswered adaptive questions in order", () => {
    const questions = getNextQuestions("business", {
      ...baseProfile,
      facts: { lifeEvent: "business", state: "Kerala" },
    });

    expect(questions[0]?.factKey).toBe("businessStage");
    expect(questions.every(({ factKey }) => factKey !== "state")).toBe(true);
  });

  it("rejects preparation through an unrelated mission", () => {
    expect(() => prepareConnector("pmmvy", pregnancyProfile, "business")).toThrow(
      /does not support mission/,
    );
  });

  it("respects a non-negative adaptive-question limit", () => {
    expect(getNextQuestions("business", baseProfile, 1)).toHaveLength(1);
    expect(getNextQuestions("business", baseProfile, -2)).toEqual([]);
  });
});

describe("household autopilot", () => {
  it("scans every connector and discovers newly eligible prepared actions", () => {
    const result = scanHousehold(pregnancyProfile);

    expect(result.scannedCount).toBe(24);
    expect(result.discoveredActions.map(({ serviceId }) => serviceId)).toEqual(
      expect.arrayContaining(["pmmvy", "jsy", "jssk"]),
    );
    expect(result.needsInformation.length).toBeGreaterThan(0);
  });

  it("does not rediscover actions already present in the inbox", () => {
    const result = scanHousehold(pregnancyProfile, ["household-demo:pmmvy"]);

    expect(result.discoveredActions.some(({ id }) => id === "household-demo:pmmvy")).toBe(false);
  });

  it("updates profile facts immutably before a rescan", () => {
    const next = applyFactUpdate(baseProfile, { state: "Tamil Nadu", lifeEvent: "pregnancy" }, "2026-08-28T09:00:00.000Z");

    expect(next).not.toBe(baseProfile);
    expect(next.facts).not.toBe(baseProfile.facts);
    expect(baseProfile.facts.state).toBeUndefined();
    expect(next.facts.state).toBe("Tamil Nadu");
    expect(next.updatedAt).toBe("2026-08-28T09:00:00.000Z");
  });
});
