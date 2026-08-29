import type {
  AdaptiveQuestion,
  EligibilityResult,
  FactKey,
  FactValue,
  HouseholdProfile,
  MissionDefinition,
  MissionId,
  OfficialSource,
  PreparedAction,
  ServiceConnector,
  ServiceId,
} from "./types";

const LAST_VERIFIED = "2026-08-28";

const factLabels: Record<FactKey, string> = {
  lifeEvent: "Life change",
  state: "State or Union Territory",
  residenceType: "Area",
  incomeBand: "Household income range",
  annualIncomeBand: "Annual income range",
  childOrder: "Child number",
  deliveryStatus: "Pregnancy stage",
  hasBankAccount: "Bank account available",
  studyLevel: "Study level",
  studentStatus: "Currently studying",
  hasAcademicRecords: "Academic records available",
  workType: "Work type",
  hasPan: "PAN available",
  employerType: "Employer coverage",
  previousCoverage: "Previous social-security coverage",
  jobStatus: "Work status",
  hasUan: "UAN available",
  businessStage: "Business stage",
  businessType: "Business activity",
  annualTurnoverBand: "Annual turnover range",
  grievanceType: "Problem type",
  previousAttempt: "Previous resolution attempt",
};

const displayValue = (value: FactValue): string => {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return String(value).replaceAll("_", " ");
};

interface ConnectorDefinition {
  id: ServiceId;
  missionIds: readonly MissionId[];
  title: string;
  shortTitle: string;
  description: string;
  requiredFacts: readonly FactKey[];
  requiredDocuments: readonly string[];
  matches(profile: HouseholdProfile): boolean;
  nonEligibleReason: string;
  sources: readonly OfficialSource[];
}

const createConnector = (definition: ConnectorDefinition): ServiceConnector => ({
  ...definition,
  lastVerified: LAST_VERIFIED,
  evaluate(profile) {
    const missingFacts = definition.requiredFacts.filter(
      (key) => profile.facts[key] === undefined || profile.facts[key] === "",
    );
    const evidence = definition.requiredFacts.filter((key) => !missingFacts.includes(key));

    if (missingFacts.length > 0) {
      return {
        status: "needs_information",
        reason: "RightNow needs a few more non-sensitive details to check this service.",
        missingFacts: [...missingFacts],
        evidence,
      } satisfies EligibilityResult;
    }

    if (!definition.matches(profile)) {
      return {
        status: "not_eligible",
        reason: definition.nonEligibleReason,
        missingFacts: [],
        evidence,
      } satisfies EligibilityResult;
    }

    return {
      status: "eligible",
      reason:
        "Based on what you've shared, this service looks relevant to your situation. The official service makes the final decision.",
      missingFacts: [],
      evidence,
    } satisfies EligibilityResult;
  },
  prepare(profile, missionId) {
    const eligibility = this.evaluate(profile);
    if (eligibility.status !== "eligible") {
      throw new Error(`Cannot prepare ${definition.id}: ${eligibility.status}`);
    }

    return {
      id: `${profile.id}:${definition.id}`,
      serviceId: definition.id,
      missionId,
      title: definition.title,
      summary: definition.description,
      status: "prepared",
      eligibility,
      requiredDocuments: definition.requiredDocuments,
      reviewItems: definition.requiredFacts.map((factKey) => ({
        factKey,
        label: factLabels[factKey],
        value: displayValue(profile.facts[factKey] as FactValue),
      })),
      sources: definition.sources,
      lastVerified: LAST_VERIFIED,
      disclaimer: "This is a preparation checklist, not a government application. Nothing has been submitted.",
    } satisfies PreparedAction;
  },
});

const isLifeEvent = (profile: HouseholdProfile, value: string) =>
  profile.facts.lifeEvent === value;

export const serviceConnectors: readonly ServiceConnector[] = [
  createConnector({
    id: "pmmvy",
    missionIds: ["pregnancy"],
    title: "Pradhan Mantri Matru Vandana Yojana readiness",
    shortTitle: "PMMVY",
    description: "Prepare the facts and document checklist used for maternity-benefit review.",
    requiredFacts: ["lifeEvent", "state", "childOrder", "deliveryStatus", "hasBankAccount"],
    requiredDocuments: ["Identity proof", "Bank proof", "Maternity record"],
    matches: (profile) =>
      isLifeEvent(profile, "pregnancy") &&
      Number(profile.facts.childOrder) <= 2 &&
      ["expecting", "recent_birth"].includes(String(profile.facts.deliveryStatus)) &&
      profile.facts.hasBankAccount === true,
    nonEligibleReason:
      "RightNow prepares PMMVY only for an expecting or recent mother, for the first two children, with a bank account.",
    sources: [
      {
        label: "PMMVY official FAQs",
        url: "https://www.spniwcd.wcd.gov.in/pradhan-mantri-matru-vandana-yojna/faqs",
      },
    ],
  }),
  createConnector({
    id: "jsy",
    missionIds: ["pregnancy"],
    title: "Janani Suraksha Yojana readiness",
    shortTitle: "JSY",
    description: "Prepare a state-aware institutional-delivery assistance checklist.",
    requiredFacts: ["lifeEvent", "state", "residenceType", "deliveryStatus"],
    requiredDocuments: ["Identity proof", "Pregnancy record", "Address proof"],
    matches: (profile) =>
      isLifeEvent(profile, "pregnancy") &&
      ["expecting", "recent_birth"].includes(String(profile.facts.deliveryStatus)),
    nonEligibleReason: "This applies only to a current pregnancy or recent delivery.",
    sources: [
      {
        label: "National Health Mission: JSY",
        url: "https://www.nhm.gov.in/index1.php?lang=1&level=3&lid=309&sublinkid=841",
      },
    ],
  }),
  createConnector({
    id: "jssk",
    missionIds: ["pregnancy"],
    title: "Janani Shishu Suraksha Karyakram readiness",
    shortTitle: "JSSK",
    description: "Explain and prepare access to free public-facility maternity entitlements.",
    requiredFacts: ["lifeEvent", "state", "deliveryStatus"],
    requiredDocuments: ["Pregnancy or discharge record"],
    matches: (profile) =>
      isLifeEvent(profile, "pregnancy") &&
      ["expecting", "recent_birth"].includes(String(profile.facts.deliveryStatus)),
    nonEligibleReason: "This applies only to pregnancy and recent-birth support.",
    sources: [
      {
        label: "National Health Mission: JSSK",
        url: "https://www.nhm.gov.in/index4.php?lang=1&level=0&lid=171&linkid=150",
      },
    ],
  }),
  createConnector({
    id: "birth-registration",
    missionIds: ["pregnancy"],
    title: "Birth-registration preparation",
    shortTitle: "Birth registration",
    description: "Prepare a local birth-registration checklist after delivery.",
    requiredFacts: ["lifeEvent", "state", "deliveryStatus"],
    requiredDocuments: ["Hospital birth record", "Parent identity proof"],
    matches: (profile) =>
      isLifeEvent(profile, "pregnancy") && profile.facts.deliveryStatus === "recent_birth",
    nonEligibleReason: "Birth-registration preparation becomes relevant after a birth.",
    sources: [{ label: "Civil Registration System", url: "https://dc.crsorgi.gov.in/crs/" }],
  }),
  createConnector({
    id: "national-scholarship",
    missionIds: ["college"],
    title: "National Scholarship Portal readiness",
    shortTitle: "Scholarships",
    description: "Match your student profile to scholarship application readiness.",
    requiredFacts: ["lifeEvent", "state", "studentStatus", "studyLevel", "incomeBand"],
    requiredDocuments: ["Marksheet", "Admission proof", "Income record"],
    matches: (profile) =>
      isLifeEvent(profile, "college") &&
      profile.facts.studentStatus === true &&
      ["low", "middle"].includes(String(profile.facts.incomeBand)),
    nonEligibleReason:
      "RightNow checks scholarship readiness for current students in the low or middle household-income ranges.",
    sources: [{ label: "National Scholarship Portal", url: "https://scholarships.gov.in/" }],
  }),
  createConnector({
    id: "digilocker",
    missionIds: ["college"],
    title: "DigiLocker academic-document readiness",
    shortTitle: "DigiLocker",
    description: "Prepare a safe checklist for locating academic documents in DigiLocker.",
    requiredFacts: ["lifeEvent", "studentStatus", "hasAcademicRecords"],
    requiredDocuments: ["Institution and passing-year details"],
    matches: (profile) =>
      isLifeEvent(profile, "college") &&
      profile.facts.studentStatus === true &&
      profile.facts.hasAcademicRecords === true,
    nonEligibleReason: "Academic-document discovery needs a current student and existing academic records.",
    sources: [{ label: "DigiLocker", url: "https://www.digilocker.gov.in/" }],
  }),
  createConnector({
    id: "academic-bank",
    missionIds: ["college"],
    title: "Academic Bank of Credits readiness",
    shortTitle: "Academic credits",
    description: "Prepare the details needed to explore an Academic Bank of Credits account.",
    requiredFacts: ["lifeEvent", "studentStatus", "studyLevel"],
    requiredDocuments: ["Institution record", "Enrolment record"],
    matches: (profile) =>
      isLifeEvent(profile, "college") &&
      profile.facts.studentStatus === true &&
      ["undergraduate", "postgraduate"].includes(String(profile.facts.studyLevel)),
    nonEligibleReason: "This applies only to current higher-education students.",
    sources: [{ label: "Academic Bank of Credits", url: "https://www.abc.gov.in/" }],
  }),
  createConnector({
    id: "pan-readiness",
    missionIds: ["work"],
    title: "PAN application readiness",
    shortTitle: "PAN",
    description: "Prepare a non-sensitive PAN application checklist for a new worker.",
    requiredFacts: ["lifeEvent", "state", "workType", "hasPan"],
    requiredDocuments: ["Identity proof", "Date-of-birth proof", "Address proof"],
    matches: (profile) => isLifeEvent(profile, "work") && profile.facts.hasPan === false,
    nonEligibleReason: "A new PAN application is not prepared when the profile says one already exists.",
    sources: [
      {
        label: "Income Tax Department: Instant e-PAN FAQs",
        url: "https://www.incometax.gov.in/iec/foportal/help/e-filing-generate-instant-e-pan-faq",
      },
    ],
  }),
  createConnector({
    id: "income-tax-readiness",
    missionIds: ["work"],
    title: "Income-tax filing readiness",
    shortTitle: "Income tax",
    description: "Prepare a first-year income and record checklist without making a tax conclusion.",
    requiredFacts: ["lifeEvent", "workType", "annualIncomeBand", "hasPan"],
    requiredDocuments: ["Income summary", "Tax-deduction record"],
    matches: (profile) =>
      isLifeEvent(profile, "work") &&
      profile.facts.hasPan === true &&
      profile.facts.annualIncomeBand !== "none",
    nonEligibleReason: "This needs existing PAN readiness and reported work income.",
    sources: [
      {
        label: "Income Tax Department: file ITR online",
        url: "https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/file-itr-2-online",
      },
    ],
  }),
  createConnector({
    id: "epfo-enrolment",
    missionIds: ["work"],
    title: "EPFO enrolment readiness",
    shortTitle: "EPFO",
    description: "Prepare questions to raise with an employer about provident-fund enrolment.",
    requiredFacts: ["lifeEvent", "workType", "employerType"],
    requiredDocuments: ["Offer letter", "Employer details"],
    matches: (profile) =>
      isLifeEvent(profile, "work") &&
      profile.facts.workType === "salaried" &&
      profile.facts.employerType === "covered",
    nonEligibleReason: "RightNow prepares EPFO enrolment only for a covered salaried workplace.",
    sources: [{ label: "Employees' Provident Fund Organisation", url: "https://www.epfindia.gov.in/site_en/index.php" }],
  }),
  createConnector({
    id: "esic-enrolment",
    missionIds: ["work"],
    title: "ESIC enrolment readiness",
    shortTitle: "ESIC",
    description: "Prepare employer and wage details for an ESIC coverage conversation.",
    requiredFacts: ["lifeEvent", "workType", "employerType", "annualIncomeBand"],
    requiredDocuments: ["Wage record", "Employer details"],
    matches: (profile) =>
      isLifeEvent(profile, "work") &&
      profile.facts.workType === "salaried" &&
      profile.facts.employerType === "covered" &&
      ["under_3l", "3l_to_8l"].includes(String(profile.facts.annualIncomeBand)),
    nonEligibleReason: "RightNow prepares ESIC only for a covered salaried workplace in its sample wage ranges.",
    sources: [{ label: "Employees' State Insurance Corporation", url: "https://www.esic.gov.in/" }],
  }),
  createConnector({
    id: "epfo-claim",
    missionIds: ["job-loss"],
    title: "EPFO claim readiness",
    shortTitle: "EPFO claim",
    description: "Prepare a provident-fund claim checklist after a job loss.",
    requiredFacts: ["lifeEvent", "jobStatus", "previousCoverage", "hasUan"],
    requiredDocuments: ["UAN status", "Bank record", "Last-employment record"],
    matches: (profile) =>
      isLifeEvent(profile, "job-loss") &&
      profile.facts.jobStatus === "unemployed" &&
      ["epfo", "both"].includes(String(profile.facts.previousCoverage)) &&
      profile.facts.hasUan === true,
    nonEligibleReason: "This needs prior EPFO coverage, unemployment and UAN readiness.",
    sources: [{ label: "Employees' Provident Fund Organisation", url: "https://www.epfindia.gov.in/site_en/index.php" }],
  }),
  createConnector({
    id: "esic-unemployment",
    missionIds: ["job-loss"],
    title: "ESIC unemployment-assistance readiness",
    shortTitle: "ESIC assistance",
    description: "Prepare a prior-coverage checklist for ESIC unemployment support exploration.",
    requiredFacts: ["lifeEvent", "jobStatus", "previousCoverage"],
    requiredDocuments: ["Insurance record", "Last-employment record"],
    matches: (profile) =>
      isLifeEvent(profile, "job-loss") &&
      profile.facts.jobStatus === "unemployed" &&
      ["esic", "both"].includes(String(profile.facts.previousCoverage)),
    nonEligibleReason: "This needs unemployment and prior ESIC coverage.",
    sources: [{ label: "Employees' State Insurance Corporation", url: "https://www.esic.gov.in/" }],
  }),
  createConnector({
    id: "national-career-service",
    missionIds: ["job-loss"],
    title: "National Career Service readiness",
    shortTitle: "Career services",
    description: "Prepare a profile for job-search and career-service discovery.",
    requiredFacts: ["lifeEvent", "jobStatus", "state"],
    requiredDocuments: ["Education and work summary"],
    matches: (profile) =>
      isLifeEvent(profile, "job-loss") && profile.facts.jobStatus === "unemployed",
    nonEligibleReason: "This is prepared for a person currently seeking work.",
    sources: [{ label: "National Career Service", url: "https://www.ncs.gov.in/" }],
  }),
  createConnector({
    id: "udyam",
    missionIds: ["business"],
    title: "Udyam registration readiness",
    shortTitle: "Udyam",
    description: "Prepare a micro, small or medium enterprise registration checklist.",
    requiredFacts: ["lifeEvent", "businessStage", "businessType", "hasPan"],
    requiredDocuments: ["PAN status", "Business activity summary"],
    matches: (profile) =>
      isLifeEvent(profile, "business") &&
      ["planning", "operating"].includes(String(profile.facts.businessStage)) &&
      profile.facts.hasPan === true,
    nonEligibleReason: "This needs a planned or operating business and PAN readiness.",
    sources: [{ label: "Udyam Registration", url: "https://udyamregistration.gov.in/" }],
  }),
  createConnector({
    id: "gst-readiness",
    missionIds: ["business"],
    title: "GST registration readiness",
    shortTitle: "GST",
    description: "Prepare a turnover and business-activity checklist for GST review.",
    requiredFacts: ["lifeEvent", "businessStage", "businessType", "annualTurnoverBand", "hasPan"],
    requiredDocuments: ["PAN status", "Business address", "Turnover summary"],
    matches: (profile) =>
      isLifeEvent(profile, "business") &&
      profile.facts.businessStage === "operating" &&
      ["20l_to_40l", "above_40l"].includes(String(profile.facts.annualTurnoverBand)) &&
      profile.facts.hasPan === true,
    nonEligibleReason:
      "RightNow flags GST readiness only for an operating business above this turnover range; official thresholds vary.",
    sources: [
      { label: "GST Portal", url: "https://www.gst.gov.in/" },
      { label: "CBIC GST FAQs", url: "https://cbic-gst.gov.in/faq.html" },
    ],
  }),
  createConnector({
    id: "pmegp-mudra",
    missionIds: ["business"],
    title: "PMEGP or MUDRA finance readiness",
    shortTitle: "Business finance",
    description: "Prepare a comparison-ready project and banking checklist for official finance routes.",
    requiredFacts: ["lifeEvent", "businessStage", "businessType", "hasBankAccount"],
    requiredDocuments: ["Project outline", "Cost estimate", "Bank status"],
    matches: (profile) =>
      isLifeEvent(profile, "business") &&
      ["planning", "operating"].includes(String(profile.facts.businessStage)) &&
      profile.facts.hasBankAccount === true,
    nonEligibleReason: "This needs a planned or operating business and bank readiness.",
    sources: [
      { label: "PMEGP ePortal", url: "https://www.kviconline.gov.in/pmegpeportal/pmegponlineapp/index.jsp" },
      { label: "MUDRA", url: "https://www.mudra.org.in/" },
    ],
  }),
  createConnector({
    id: "cpgrams",
    missionIds: ["grievance"],
    title: "CPGRAMS grievance preparation",
    shortTitle: "CPGRAMS",
    description: "Structure a public-service grievance and evidence checklist for review.",
    requiredFacts: ["lifeEvent", "grievanceType", "previousAttempt"],
    requiredDocuments: ["Timeline", "Correspondence or receipt"],
    matches: (profile) =>
      isLifeEvent(profile, "grievance") &&
      profile.facts.grievanceType === "public_service" &&
      profile.facts.previousAttempt === true,
    nonEligibleReason: "CPGRAMS preparation is used for a public-service grievance after an earlier resolution attempt.",
    sources: [{ label: "Centralised Public Grievance Redress and Monitoring System", url: "https://pgportal.gov.in/" }],
  }),
  createConnector({
    id: "consumer-helpline",
    missionIds: ["grievance"],
    title: "National Consumer Helpline preparation",
    shortTitle: "Consumer helpline",
    description: "Structure a consumer complaint, remedy and evidence checklist.",
    requiredFacts: ["lifeEvent", "grievanceType", "previousAttempt"],
    requiredDocuments: ["Purchase record", "Complaint timeline"],
    matches: (profile) =>
      isLifeEvent(profile, "grievance") &&
      profile.facts.grievanceType === "consumer" &&
      profile.facts.previousAttempt === true,
    nonEligibleReason: "Consumer-helpline preparation is used for a consumer dispute after contacting the seller or provider.",
    sources: [{ label: "National Consumer Helpline", url: "https://consumerhelpline.gov.in/" }],
  }),
  createConnector({
    id: "police-report-preparation",
    missionIds: ["safety"],
    title: "Police-report preparation",
    shortTitle: "Police report",
    description: "Prepare a clear incident timeline, item list and evidence checklist for a future report to the relevant police service.",
    requiredFacts: ["lifeEvent"],
    requiredDocuments: ["Incident timeline", "Item and property list", "Photos or other evidence if it is safe to collect them"],
    matches: (profile) => isLifeEvent(profile, "safety"),
    nonEligibleReason: "Police-report preparation is only used when an urgent safety need is described.",
    sources: [{ label: "Ministry of Home Affairs: Digital Police", url: "https://digitalpolice.gov.in/" }],
  }),
  createConnector({
    id: "aadhaar-address-update",
    missionIds: ["moving"],
    title: "Aadhaar address-update preparation",
    shortTitle: "Address update",
    description: "Prepare a proof-of-address checklist and a request checklist for the new residence.",
    requiredFacts: ["lifeEvent"],
    requiredDocuments: ["Proof of new address", "Registered-mobile status"],
    matches: (profile) => isLifeEvent(profile, "moving"),
    nonEligibleReason: "Address-update preparation is only used after an address change.",
    sources: [{ label: "UIDAI: Update your Aadhaar", url: "https://uidai.gov.in/en/my-aadhaar" }],
  }),
  createConnector({
    id: "voter-address-update",
    missionIds: ["moving"],
    title: "Voter address-update preparation",
    shortTitle: "Voter address",
    description: "Prepare a residence-shift request and an address-proof checklist for the electoral roll.",
    requiredFacts: ["lifeEvent"],
    requiredDocuments: ["Proof of new address", "Voter-registration status"],
    matches: (profile) => isLifeEvent(profile, "moving"),
    nonEligibleReason: "Voter address preparation is only used after an address change.",
    sources: [{ label: "Election Commission: Form 8", url: "https://voters.eci.gov.in/formspdf/Form_8_English.pdf" }],
  }),
  createConnector({
    id: "ration-portability",
    missionIds: ["moving"],
    title: "Ration-card portability preparation",
    shortTitle: "Ration portability",
    description: "Prepare a portability check for food-grain entitlements at the new location, if applicable.",
    requiredFacts: ["lifeEvent"],
    requiredDocuments: ["Ration-card status", "Household-member summary"],
    matches: (profile) => isLifeEvent(profile, "moving"),
    nonEligibleReason: "Ration portability preparation is only used after an interstate move.",
    sources: [{ label: "National Food Security Act: One Nation One Ration Card", url: "https://nfsa.gov.in/" }],
  }),
  createConnector({
    id: "vehicle-address-update",
    missionIds: ["moving"],
    title: "Vehicle address-update preparation",
    shortTitle: "Vehicle address",
    description: "Prepare an address-change checklist for a registered vehicle, if one is in the household.",
    requiredFacts: ["lifeEvent"],
    requiredDocuments: ["Registration certificate", "Proof of new address", "Insurance status"],
    matches: (profile) => isLifeEvent(profile, "moving"),
    nonEligibleReason: "Vehicle address preparation is only used after an address change.",
    sources: [{ label: "Parivahan Sewa: Change of Address", url: "https://mparivahan.parivahan.gov.in/mstatic/english/rc-info-address-change.html" }],
  }),
] as const;

const question = (
  factKey: FactKey,
  prompt: string,
  options: readonly { value: FactValue; label: string }[],
  help?: string,
): AdaptiveQuestion => ({ factKey, prompt, help, input: "choice", options });

const stateQuestion = question(
  "state",
  "Which state or Union Territory do you live in?",
  [
    { value: "Tamil Nadu", label: "Tamil Nadu" },
    { value: "Kerala", label: "Kerala" },
    { value: "Karnataka", label: "Karnataka" },
    { value: "Delhi", label: "Delhi" },
    { value: "Other", label: "Another state or UT" },
  ],
  "State rules and delivery routes can differ.",
);

export const missionCatalog: readonly MissionDefinition[] = [
  {
    id: "pregnancy",
    title: "Pregnancy or a new baby",
    prompt: "I am pregnant or recently had a baby",
    summary: "Prepare maternity benefits, public-facility support and birth-registration steps together.",
    serviceIds: ["pmmvy", "jsy", "jssk", "birth-registration"],
    questions: [
      stateQuestion,
      question("residenceType", "Do you live in an urban or rural area?", [
        { value: "urban", label: "Urban" },
        { value: "rural", label: "Rural" },
      ]),
      question("childOrder", "Which child is this?", [
        { value: 1, label: "First" },
        { value: 2, label: "Second" },
        { value: 3, label: "Third or later" },
      ]),
      question("deliveryStatus", "Where are you in the journey?", [
        { value: "expecting", label: "Currently pregnant" },
        { value: "recent_birth", label: "Baby was recently born" },
      ]),
      question("hasBankAccount", "Do you have a bank account available for benefits?", [
        { value: true, label: "Yes" },
        { value: false, label: "Not yet" },
      ]),
    ],
    examples: {
      en: ["I am expecting my first baby"],
      hi: ["मैं गर्भवती हूँ"],
      ta: ["நான் கர்ப்பமாக இருக்கிறேன்"],
    },
  },
  {
    id: "college",
    title: "Starting or continuing college",
    prompt: "I am joining college",
    summary: "Prepare scholarships and academic-document access without visiting separate portals.",
    serviceIds: ["national-scholarship", "digilocker", "academic-bank"],
    questions: [
      stateQuestion,
      question("studentStatus", "Are you currently admitted or enrolling?", [
        { value: true, label: "Yes" },
        { value: false, label: "Not yet" },
      ]),
      question("studyLevel", "What level are you studying?", [
        { value: "school", label: "School" },
        { value: "undergraduate", label: "Undergraduate" },
        { value: "postgraduate", label: "Postgraduate" },
      ]),
      question("incomeBand", "What is the household income range?", [
        { value: "low", label: "Lower range" },
        { value: "middle", label: "Middle range" },
        { value: "high", label: "Higher range" },
      ]),
      question("hasAcademicRecords", "Are academic records already available?", [
        { value: true, label: "Yes" },
        { value: false, label: "Not yet" },
      ]),
    ],
    examples: {
      en: ["I got into college and need help"],
      hi: ["मेरा कॉलेज में दाखिला हुआ है"],
      ta: ["நான் கல்லூரியில் சேர்கிறேன்"],
    },
  },
  {
    id: "work",
    title: "Starting work or earning remotely",
    prompt: "I started my first job or remote work",
    summary: "Prepare PAN, tax and workplace social-security readiness from one profile.",
    serviceIds: ["pan-readiness", "income-tax-readiness", "epfo-enrolment", "esic-enrolment"],
    questions: [
      stateQuestion,
      question("workType", "How are you earning?", [
        { value: "salaried", label: "Salaried job" },
        { value: "freelance", label: "Freelance or remote" },
        { value: "gig", label: "Gig work" },
      ]),
      question("annualIncomeBand", "What annual income range do you expect?", [
        { value: "under_3l", label: "Under ₹3 lakh" },
        { value: "3l_to_8l", label: "₹3 to ₹8 lakh" },
        { value: "above_8l", label: "Above ₹8 lakh" },
      ]),
      question("hasPan", "Do you already have a PAN?", [
        { value: true, label: "Yes" },
        { value: false, label: "No" },
      ]),
      question("employerType", "Does the employer say the workplace is covered by EPFO or ESIC?", [
        { value: "covered", label: "Yes" },
        { value: "not_covered", label: "No" },
        { value: "unknown", label: "I do not know" },
      ]),
    ],
    examples: {
      en: ["I started earning from remote work"],
      hi: ["मैंने नई नौकरी शुरू की है"],
      ta: ["நான் புதிய வேலை தொடங்கியுள்ளேன்"],
    },
  },
  {
    id: "job-loss",
    title: "Losing a job",
    prompt: "I lost my job",
    summary: "Prepare social-security claims and career-service support in one recovery plan.",
    serviceIds: ["epfo-claim", "esic-unemployment", "national-career-service"],
    questions: [
      stateQuestion,
      question("jobStatus", "What is your work status now?", [
        { value: "unemployed", label: "Not working" },
        { value: "notice_period", label: "In notice period" },
        { value: "working", label: "Working" },
      ]),
      question("previousCoverage", "Which coverage did your last workplace provide?", [
        { value: "epfo", label: "EPFO" },
        { value: "esic", label: "ESIC" },
        { value: "both", label: "Both" },
        { value: "neither", label: "Neither or unknown" },
      ]),
      question("hasUan", "Do you have access to your UAN?", [
        { value: true, label: "Yes" },
        { value: false, label: "No" },
      ]),
    ],
    examples: {
      en: ["I was laid off last week"],
      hi: ["मेरी नौकरी चली गई"],
      ta: ["நான் வேலை இழந்துவிட்டேன்"],
    },
  },
  {
    id: "business",
    title: "Starting a small business",
    prompt: "I want to start a small business",
    summary: "Prepare registration, tax readiness and official finance routes together.",
    serviceIds: ["udyam", "gst-readiness", "pmegp-mudra"],
    questions: [
      stateQuestion,
      question("businessStage", "What stage is the business in?", [
        { value: "planning", label: "Planning" },
        { value: "operating", label: "Already operating" },
      ]),
      question("businessType", "What kind of activity is it?", [
        { value: "services", label: "Services" },
        { value: "trading", label: "Trading" },
        { value: "manufacturing", label: "Manufacturing" },
      ]),
      question("annualTurnoverBand", "What annual turnover range do you expect?", [
        { value: "under_20l", label: "Under ₹20 lakh" },
        { value: "20l_to_40l", label: "₹20 to ₹40 lakh" },
        { value: "above_40l", label: "Above ₹40 lakh" },
      ]),
      question("hasPan", "Is PAN ready for the owner or enterprise?", [
        { value: true, label: "Yes" },
        { value: false, label: "Not yet" },
      ]),
      question("hasBankAccount", "Is a bank account available?", [
        { value: true, label: "Yes" },
        { value: false, label: "Not yet" },
      ]),
    ],
    examples: {
      en: ["I want to open a tailoring business"],
      hi: ["मैं छोटा व्यवसाय शुरू करना चाहता हूँ"],
      ta: ["நான் சிறு தொழில் தொடங்க விரும்புகிறேன்"],
    },
  },
  {
    id: "grievance",
    title: "Fixing a public-service problem",
    prompt: "A public service is not working for me",
    summary: "Turn a difficult problem into a structured grievance with the right official route.",
    serviceIds: ["cpgrams", "consumer-helpline"],
    questions: [
      question("grievanceType", "What kind of problem is this?", [
        { value: "public_service", label: "Government or public service" },
        { value: "consumer", label: "Product, seller or private service" },
      ]),
      question("previousAttempt", "Have you already contacted the responsible office or seller?", [
        { value: true, label: "Yes" },
        { value: false, label: "Not yet" },
      ]),
    ],
    examples: {
      en: ["A public office has not resolved my complaint"],
      hi: ["सरकारी सेवा में मेरी समस्या हल नहीं हुई"],
      ta: ["அரசு சேவையில் என் பிரச்சனை தீரவில்லை"],
    },
  },
  {
    id: "safety",
    title: "Report a crime or get urgent help",
    prompt: "Someone broke into my house",
    summary: "Show immediate safety actions and prepare a police-report checklist for later review.",
    serviceIds: ["police-report-preparation"],
    questions: [],
    examples: {
      en: ["Someone broke into my house"],
      hi: ["मेरे घर में चोरी हुई है"],
      ta: ["என் வீட்டில் திருட்டு நடந்துள்ளது"],
    },
  },
  {
    id: "moving",
    title: "Moving to another state",
    prompt: "I am moving to a different state",
    summary: "Prepare the common address, voter, ration portability and vehicle-update steps in one plan.",
    serviceIds: ["aadhaar-address-update", "voter-address-update", "ration-portability", "vehicle-address-update"],
    questions: [],
    examples: {
      en: ["I am moving to a different state"],
      hi: ["मैं दूसरे राज्य में जा रहा हूँ"],
      ta: ["நான் வேறு மாநிலத்திற்கு குடிபெயர்கிறேன்"],
    },
  },
] as const;
