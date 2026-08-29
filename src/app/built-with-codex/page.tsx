import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  CircleDashed,
  Code,
  FlowArrow,
  GitBranch,
  ShieldCheck,
  UserFocus,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Built with Codex | RightNow India",
  description:
    "The architecture, build trail, responsibility boundary and verification record behind the RightNow India prototype.",
};

const architecture = [
  {
    eyebrow: "Citizen",
    title: "One life change",
    text: "A plain-language message in English, Hindi or Tamil. No department names required.",
  },
  {
    eyebrow: "Understanding",
    title: "Intent, not eligibility",
    text: "AI can route any safe description into a simulation. A schema gate keeps model output inside a bounded planning contract.",
  },
  {
    eyebrow: "Rules",
    title: "Deterministic planner",
    text: "Code evaluates the household against versioned connector rules and official source links.",
  },
  {
    eyebrow: "Consent",
    title: "One clear review",
    text: "Every prepared action is shown together. Nothing moves until the citizen approves the set.",
  },
  {
    eyebrow: "Demo output",
    title: "Mock gateway and inbox",
    text: "A clearly marked simulation record in the civic inbox proves the journey without a live submission.",
  },
] as const;

const milestones = [
  {
    number: "01",
    title: "Problem framing",
    copy: "The builder defined the central tension: public benefits may be valuable, but people avoid unfamiliar government navigation.",
    evidence: "Open-ended product brief and verified accelerators",
  },
  {
    number: "02",
    title: "Source verification",
    copy: "Official program and portal pages were collected as connector metadata, keeping the product explanation one step away from its public source.",
    evidence: "Official URLs and a shared last-verified date",
  },
  {
    number: "03",
    title: "Boundary design",
    copy: "Codex translated that brief into a connector contract where language interpretation never decides eligibility.",
    evidence: "Typed connector interface and rule engine",
  },
  {
    number: "04",
    title: "Test-led implementation",
    copy: "Expected mission matches, rejected language output, privacy boundaries and simulated-action states were specified as tests alongside the build.",
    evidence: "Vitest, Testing Library and Playwright suites",
  },
  {
    number: "05",
    title: "Product construction",
    copy: "Codex assembled the multilingual conversation, household memory, consolidated review, civic inbox and guarded service matcher.",
    evidence: "Next.js application and mocked routes",
  },
  {
    number: "06",
    title: "Debugging and resilience",
    copy: "Unavailable language interpretation, malformed output and sensitive-input patterns are handled as explicit states with a deterministic fallback.",
    evidence: "Boundary tests and user-visible fallback states",
  },
  {
    number: "07",
    title: "Review and release",
    copy: "Type, coverage, production build and desktop/mobile journeys were recorded from final command output.",
    evidence: "88 automated tests and 26 browser journeys",
  },
] as const;

const promptEvidence = [
  {
    prompt: "Design one connector boundary that works for many public services without letting the model invent eligibility.",
    result: "A typed ServiceConnector contract with deterministic evaluate and prepare functions, source metadata and a last-verified date.",
    artifact: "Connector engine",
  },
  {
    prompt: "Prove that an unknown service ID, malformed JSON or unsupported fact cannot enter the planner.",
    result: "Schema validation and fallback tests at the model boundary, with an allow-list for missions, services and facts.",
    artifact: "Agent route tests",
  },
  {
    prompt: "Make the final action understandable to someone who has never used a government portal.",
    result: "A consolidated review that shows what is prepared, what information is used and that every submission is simulated.",
    artifact: "Review experience",
  },
] as const;

const responsibilities = [
  {
    label: "Builder decided",
    icon: UserFocus,
    items: [
      "The citizen problem and all-in-one direction",
      "The open-ended citizen experience and example prompts",
      "The trust, privacy and synthetic-data boundaries",
      "Which trade-offs were accepted for the hackathon build",
      "The final product narrative and submission",
    ],
  },
  {
    label: "Codex produced and reviewed",
    icon: Code,
    items: [
      "The schema-driven connector architecture",
      "Frontend, simulated backend and configurable service matcher",
      "Unit, integration and end-to-end test suites",
      "Accessibility, code-quality and security review checklists",
      "Architecture notes and a sanitized build record",
    ],
  },
] as const;

const verification = [
  {
    name: "Static correctness",
    command: "npm run typecheck + npm run lint",
    status: "Typecheck and lint passed",
    verified: true,
  },
  {
    name: "Unit and integration tests",
    command: "npm run test:coverage",
    status: "88 passed · 92.5% statements · 100% functions",
    verified: true,
  },
  {
    name: "Production bundle",
    command: "npm run build",
    status: "Next.js production build passed",
    verified: true,
  },
  {
    name: "Critical browser flows",
    command: "npm run test:e2e",
    status: "26 passed · desktop Chromium + mobile WebKit",
    verified: true,
  },
  {
    name: "Live quality scores",
    command: "Lighthouse production run",
    status: "Attach or link the current report before citing scores",
    verified: false,
  },
  {
    name: "Accessibility and security",
    command: "Manual review + automated checks",
    status: "Attach review evidence before claiming a pass",
    verified: false,
  },
] as const;

export default function BuiltWithCodexPage() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main-content">
        Skip to evidence
      </a>

      <header className={styles.header}>
        <Link className={styles.backLink} href="/">
          <ArrowLeft aria-hidden="true" size={18} weight="bold" />
          RightNow India
        </Link>
        <p className={styles.prototypeLabel}>
          <span aria-hidden="true" /> Independent prototype
        </p>
      </header>

      <main id="main-content">
        <section className={styles.hero} aria-labelledby="page-title">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Built with Codex</p>
            <h1 id="page-title">A traceable build, not a black box.</h1>
            <p className={styles.lede}>
              RightNow India began with a citizen problem and became a working
              service-planning prototype through a human-led, Codex-assisted
              build. This page shows the boundary between product judgment,
              generated implementation and runtime AI.
            </p>
          </div>
          <aside className={styles.truthCard} aria-label="Prototype disclosure">
            <WarningCircle aria-hidden="true" size={26} weight="duotone" />
            <div>
              <strong>What this build does not do</strong>
              <p>
                It does not contact government systems, verify identity, process
                payments or submit real applications. Every person, document,
                status and reference number in the demo is synthetic.
              </p>
            </div>
          </aside>
        </section>

        <section className={styles.problemSection} aria-labelledby="problem-title">
          <div>
            <p className={styles.sectionLabel}>The problem</p>
            <h2 id="problem-title">Public services are organised like institutions. Life is not.</h2>
          </div>
          <div className={styles.problemCopy}>
            <p>
              A pregnancy, first job or business launch can touch several
              departments at once. The person is expected to know the service
              names, eligibility rules and document sequence before they begin.
            </p>
            <p>
              The product bet is simple: start with what changed in a household,
              then let a transparent planner assemble the relevant next actions.
            </p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="architecture-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionLabel}>Architecture</p>
              <h2 id="architecture-title">Language can be probabilistic. Entitlements cannot.</h2>
            </div>
            <FlowArrow aria-hidden="true" size={36} weight="duotone" />
          </div>

          <div className={styles.architectureFlow}>
            {architecture.map((step, index) => (
              <div className={styles.flowStep} key={step.title}>
                <article className={styles.flowCard}>
                  <p>{step.eyebrow}</p>
                  <h3>{step.title}</h3>
                  <span>{step.text}</span>
                </article>
                {index < architecture.length - 1 ? (
                  <span className={styles.flowArrow} aria-hidden="true">
                    <ArrowRight size={18} weight="bold" />
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          <div className={styles.guardrails}>
            <ShieldCheck aria-hidden="true" size={26} weight="duotone" />
            <p>
              <strong>The language layer has a narrow job.</strong> It detects language,
              maps a message to a known mission and extracts allow-listed facts.
              Connector code alone evaluates eligibility, and the citizen alone
              approves the simulated next steps.
            </p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="timeline-title">
          <div className={styles.sectionHeading}>
            <div>
            <p className={styles.sectionLabel}>Sanitized build trail</p>
              <h2 id="timeline-title">From an uncertain idea to a reviewable system.</h2>
            </div>
            <GitBranch aria-hidden="true" size={34} weight="duotone" />
          </div>
          <ol className={styles.timeline}>
            {milestones.map((milestone) => (
              <li key={milestone.number}>
                <span className={styles.timelineNumber}>{milestone.number}</span>
                <div>
                  <h3>{milestone.title}</h3>
                  <p>{milestone.copy}</p>
                  <span className={styles.evidence}>{milestone.evidence}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section} aria-labelledby="prompts-title">
          <div className={styles.sectionHeading}>
            <div>
            <p className={styles.sectionLabel}>Prompt to proof</p>
              <h2 id="prompts-title">The useful unit is an artifact that can be inspected.</h2>
            </div>
            <Code aria-hidden="true" size={34} weight="duotone" />
          </div>
          <p className={styles.sectionIntro}>
            These are condensed, sanitized build prompts. Private conversation,
            credentials and personal data are excluded.
          </p>
          <div className={styles.promptGrid}>
            {promptEvidence.map((item, index) => (
              <article className={styles.promptCard} key={item.artifact}>
                <div className={styles.promptTopline}>
                  <span>Prompt {String(index + 1).padStart(2, "0")}</span>
                  <span>{item.artifact}</span>
                </div>
                <blockquote>{item.prompt}</blockquote>
                <div className={styles.result}>
                  <ArrowRight aria-hidden="true" size={18} weight="bold" />
                  <p>{item.result}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="roles-title">
          <div className={styles.sectionHeading}>
            <div>
            <p className={styles.sectionLabel}>Responsibility</p>
              <h2 id="roles-title">Codex accelerated the work. The builder owned the product.</h2>
            </div>
          </div>
          <div className={styles.responsibilityGrid}>
            {responsibilities.map(({ label, icon: Icon, items }) => (
              <article className={styles.responsibilityCard} key={label}>
                <div className={styles.responsibilityTitle}>
                  <Icon aria-hidden="true" size={28} weight="duotone" />
                  <h3>{label}</h3>
                </div>
                <ul>
                  {items.map((item) => (
                    <li key={item}>
                      <CheckCircle aria-hidden="true" size={18} weight="fill" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="runtime-title">
          <div className={styles.runtimePanel}>
            <div>
            <p className={styles.sectionLabel}>Two different roles</p>
              <h2 id="runtime-title">Codex built it. Runtime AI opens the front door.</h2>
              <p>
                Codex was used at build time for planning, implementation, tests,
                debugging and review. At runtime, guarded AI routes any safe
                description into a simulation or a verified accelerator. If it is
                unavailable, deterministic routing and a safe fallback keep every request moving.
              </p>
            </div>
            <div className={styles.runtimeBoundaries}>
              <div>
                <span>Build time</span>
                <strong>Codex</strong>
                <p>Architecture, code, tests, documentation and review</p>
              </div>
              <ArrowRight aria-hidden="true" size={20} weight="bold" />
              <div>
                <span>Run time</span>
                <strong>AI router plus schema gate</strong>
                <p>Language detection, mission mapping and fact extraction only</p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="verification-title">
          <div className={styles.sectionHeading}>
            <div>
            <p className={styles.sectionLabel}>Verification</p>
              <h2 id="verification-title">Claims turn green only after the evidence exists.</h2>
            </div>
            <CircleDashed aria-hidden="true" size={34} weight="duotone" />
          </div>
          <p className={styles.sectionIntro}>
            This checklist is intentionally conservative. No pass result or score
            is shown until the final command output or review record is available.
          </p>
          <div className={styles.verificationTable} role="table" aria-label="Release verification checklist">
            <div className={styles.tableHeader} role="row">
              <span role="columnheader">Check</span>
              <span role="columnheader">Evidence command</span>
              <span role="columnheader">Current status</span>
            </div>
            {verification.map((item) => (
              <div className={styles.tableRow} role="row" key={item.name}>
                <strong role="cell">{item.name}</strong>
                <code role="cell">{item.command}</code>
                <span className={item.verified ? styles.passed : styles.pending} role="cell">
                  {item.verified ? (
                    <CheckCircle aria-hidden="true" size={16} weight="fill" />
                  ) : (
                    <CircleDashed aria-hidden="true" size={16} weight="bold" />
                  )}
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.closing} aria-labelledby="closing-title">
          <p className={styles.sectionLabel}>Independent by design</p>
          <h2 id="closing-title">A civic interface should earn trust before it asks for data.</h2>
          <p>
            RightNow India is not affiliated with or endorsed by the Government of
            India. It is a time-boxed demonstration of how a life-event layer could
            make public services easier to discover and prepare.
          </p>
          <Link className={styles.primaryLink} href="/">
            Explore the prototype
            <ArrowRight aria-hidden="true" size={18} weight="bold" />
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>RightNow India · Synthetic data only · Independent prototype</p>
        <a href="#main-content">Back to top</a>
      </footer>
    </div>
  );
}
