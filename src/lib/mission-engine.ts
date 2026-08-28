import { missionCatalog, serviceConnectors } from "./catalog";
import type {
  AdaptiveQuestion,
  AutopilotResult,
  FactUpdate,
  HouseholdProfile,
  MissionDefinition,
  MissionId,
  MissionPlan,
  PreparedAction,
  ServiceConnector,
  ServiceId,
} from "./types";

const connectorsById = new Map<ServiceId, ServiceConnector>(
  serviceConnectors.map((connector) => [connector.id, connector]),
);

const missionsById = new Map<MissionId, MissionDefinition>(
  missionCatalog.map((mission) => [mission.id, mission]),
);

export const getConnector = (serviceId: ServiceId): ServiceConnector => {
  const connector = connectorsById.get(serviceId);
  if (!connector) throw new Error(`Unknown service: ${serviceId}`);
  return connector;
};

export const getMission = (missionId: MissionId): MissionDefinition => {
  const mission = missionsById.get(missionId);
  if (!mission) throw new Error(`Unknown mission: ${missionId}`);
  return mission;
};

export const evaluateConnector = (serviceId: ServiceId, profile: HouseholdProfile) =>
  getConnector(serviceId).evaluate(profile);

export const prepareConnector = (
  serviceId: ServiceId,
  profile: HouseholdProfile,
  missionId: MissionId,
): PreparedAction => {
  const connector = getConnector(serviceId);
  if (!connector.missionIds.includes(missionId)) {
    throw new Error(`Service ${serviceId} does not support mission ${missionId}`);
  }
  return connector.prepare(profile, missionId);
};

export const getNextQuestions = (
  missionId: MissionId,
  profile: HouseholdProfile,
  limit = Number.POSITIVE_INFINITY,
): AdaptiveQuestion[] =>
  getMission(missionId)
    .questions.filter(({ factKey }) => profile.facts[factKey] === undefined)
    .slice(0, Math.max(0, limit));

export const planMission = (missionId: MissionId, profile: HouseholdProfile): MissionPlan => {
  const mission = getMission(missionId);
  const evaluations = mission.serviceIds.map((serviceId) => ({
    serviceId,
    result: evaluateConnector(serviceId, profile),
  }));
  const actions = evaluations
    .filter(({ result }) => result.status === "eligible")
    .map(({ serviceId }) => prepareConnector(serviceId, profile, missionId));

  return {
    mission,
    evaluations,
    actions,
    nextQuestions: getNextQuestions(missionId, profile),
  };
};

export const scanHousehold = (
  profile: HouseholdProfile,
  existingActionIds: readonly string[] = [],
): AutopilotResult => {
  const existing = new Set(existingActionIds);
  const discoveredActions: PreparedAction[] = [];
  const needsInformation: AutopilotResult["needsInformation"][number][] = [];
  const notEligible: AutopilotResult["notEligible"][number][] = [];

  for (const connector of serviceConnectors) {
    const result = connector.evaluate(profile);
    if (result.status === "eligible") {
      const actionId = `${profile.id}:${connector.id}`;
      if (!existing.has(actionId)) {
        discoveredActions.push(connector.prepare(profile, connector.missionIds[0]));
      }
    } else if (result.status === "needs_information") {
      needsInformation.push({ serviceId: connector.id, result });
    } else {
      notEligible.push({ serviceId: connector.id, result });
    }
  }

  return {
    scannedCount: serviceConnectors.length,
    discoveredActions,
    needsInformation,
    notEligible,
  };
};

export const applyFactUpdate = (
  profile: HouseholdProfile,
  update: FactUpdate,
  updatedAt = new Date().toISOString(),
): HouseholdProfile => ({
  ...profile,
  facts: { ...profile.facts, ...update },
  updatedAt,
});
