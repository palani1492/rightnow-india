"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpIcon,
  BellRingingIcon,
  BuildingsIcon,
  CheckCircleIcon,
  ListChecksIcon,
  MicrophoneIcon,
  PencilSimpleIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { applyFactUpdate, getNextQuestions, planMission } from "@/lib/mission-engine";
import type { CasePlan } from "@/lib/agent/schemas";
import type { FactKey, FactValue, LanguageCode, MissionId, PreparedAction } from "@/lib/types";
import {
  clearHousehold,
  createEmptyHousehold,
  loadHousehold,
  saveHousehold,
  type InboxAction,
  type StoredHousehold,
} from "@/client/storage";
import { factLabels, formatFact, HouseholdDialog } from "./household-dialog";
import { ReviewDialog } from "./review-dialog";
import { ConsentDialog } from "./consent-dialog";
import { detectSensitiveInput } from "@/lib/security/input-safety";

type ConversationMessage = { id: string; role: "user" | "assistant"; text: string; note?: string };

type AgentResponse = {
  language: LanguageCode;
  missionId: MissionId | null;
  facts: Array<{ key: FactKey; value: FactValue }>;
  reply: string;
  casePlan: CasePlan | null;
  mode: "model" | "fallback";
  fallbackReason?: string;
};

type MockSubmission = {
  actionId: string;
  reference: string;
  status: "simulated";
  timeline: ReadonlyArray<{ label: string; at: string }>;
};

const examplePrompts = [
  "My passport expired",
  "I am moving states",
  "A certificate has an error",
  "I lost my job",
  "My parent needs support",
  "I want to start a shop",
] as const;

const copyByLanguage: Record<LanguageCode, { headline: string; tagline: string; placeholder: string }> = {
  en: {
    headline: "Tell us what changed.",
    tagline: "One conversation. Every public service.",
    placeholder: "For example, my passport expired and I need to travel...",
  },
  hi: {
    headline: "बताइए, क्या बदला है।",
    tagline: "एक बातचीत। हर सार्वजनिक सेवा।",
    placeholder: "जैसे, मैंने घर से काम करना शुरू किया है...",
  },
  ta: {
    headline: "என்ன மாறியது என்று சொல்லுங்கள்.",
    tagline: "ஒரே உரையாடல். அனைத்து பொதுச் சேவைகளும்.",
    placeholder: "உதாரணமாக, நான் வீட்டிலிருந்து வேலை செய்யத் தொடங்கினேன்...",
  },
};

function mergeInbox(current: readonly InboxAction[], actions: readonly PreparedAction[]): InboxAction[] {
  const existing = new Set(current.map(({ id }) => id));
  const additions = actions
    .filter(({ id }) => !existing.has(id))
    .map((action): InboxAction => ({ ...action, status: "prepared" }));
  return [...current, ...additions];
}

function messageId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function caseActionId(householdId: string): string {
  const nonce = globalThis.crypto?.randomUUID?.().slice(0, 8) ?? String(Date.now());
  return `${householdId}-${nonce}:general-case-simulation`;
}

export function RightNowApp() {
  const [household, setHousehold] = useState<StoredHousehold>(() => createEmptyHousehold());
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [activeMission, setActiveMission] = useState<MissionId | null>(null);
  const [preparedActions, setPreparedActions] = useState<PreparedAction[]>([]);
  const [casePlan, setCasePlan] = useState<CasePlan | null>(null);
  const [casePlanMode, setCasePlanMode] = useState<"model" | "fallback" | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [householdOpen, setHouseholdOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [working, setWorking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const transcriptEnd = useRef<HTMLDivElement>(null);
  const casePlanTarget = useRef<HTMLElement>(null);
  const questionTarget = useRef<HTMLDivElement>(null);
  const preparedTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const storedHousehold = loadHousehold(window.localStorage);
    window.queueMicrotask(() => {
      if (!active) return;
      setHousehold(storedHousehold);
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (hydrated) saveHousehold(window.localStorage, household);
  }, [household, hydrated]);

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const currentQuestion = useMemo(
    () => (activeMission ? getNextQuestions(activeMission, household.profile)[0] ?? null : null),
    [activeMission, household.profile],
  );
  const languageCopy = copyByLanguage[household.profile.preferredLanguage];

  useEffect(() => {
    const target = casePlanTarget.current ?? questionTarget.current ?? preparedTarget.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [casePlan, currentQuestion, preparedActions]);

  function updateProfile(nextProfile: StoredHousehold["profile"]): void {
    setHousehold((current) => ({ ...current, profile: nextProfile }));
  }

  function prepareMission(missionId: MissionId, profile = household.profile): void {
    const plan = planMission(missionId, profile);
    if (plan.nextQuestions.length === 0) {
      setPreparedActions(plan.actions);
      setSelectedIds(plan.actions.map(({ id }) => id));
      const preparedText = plan.actions.length > 0
        ? `I found ${plan.actions.length} services and prepared a simulation plan. Nothing has been sent.`
        : "I do not have enough information to prepare a plan. Try editing the saved details.";
      setMessages((current) => [...current, { id: messageId(), role: "assistant", text: preparedText }]);
    }
  }

  function prepareGeneralCasePlan(
    plan: CasePlan,
    mode: "model" | "fallback",
    profile = household.profile,
  ): void {
    const action: PreparedAction = {
      id: caseActionId(profile.id),
      serviceId: "general-case-simulation",
      missionId: "general",
      title: plan.title,
      summary: plan.summary,
      status: "prepared",
      eligibility: {
        status: "needs_information",
        reason: mode === "model"
          ? "AI-generated planning brief only. RightNow has not determined official eligibility."
          : "Generic fallback planning brief only. RightNow has not determined official eligibility.",
        missingFacts: [],
        evidence: [],
      },
      requiredDocuments: plan.steps.map(({ title }) => title),
      reviewItems: [],
      sources: [],
      lastVerified: new Date().toISOString().slice(0, 10),
      disclaimer: "Independent prototype. This is a generated simulation plan, not an official process or application.",
    };
    setPreparedActions([action]);
    setSelectedIds([action.id]);
  }

  async function interpretMessage(message: string, aiConsent: boolean): Promise<void> {
    setWorking(true);
    setError(null);
    setPreparedActions([]);
    setSelectedIds([]);
    setCasePlan(null);
    setCasePlanMode(null);
    setMessages((current) => [...current, { id: messageId(), role: "user", text: message }]);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          locale: household.profile.preferredLanguage,
          aiConsent,
        }),
      });
      const payload = await response.json() as AgentResponse & { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "RightNow could not safely read that message.");

      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: payload.reply,
          note: payload.mode === "fallback"
            ? payload.fallbackReason === "consent-declined"
              ? "Guided mode. No description was sent to an AI provider."
              : "AI was unavailable, so RightNow used a safe fallback simulation."
            : "AI-routed simulation. Review before saving any mock record.",
        },
      ]);

      if (!payload.missionId) {
        setActiveMission(null);
        setCasePlan(payload.casePlan);
        setCasePlanMode(payload.casePlan ? payload.mode : null);
        if (payload.casePlan) prepareGeneralCasePlan(payload.casePlan, payload.mode);
        return;
      }
      setCasePlan(null);
      setCasePlanMode(null);
      const extracted = Object.fromEntries(payload.facts.map(({ key, value }) => [key, value]));
      const nextProfile = applyFactUpdate(
        { ...household.profile, preferredLanguage: payload.language },
        { ...extracted, lifeEvent: payload.missionId },
      );
      setActiveMission(payload.missionId);
      updateProfile(nextProfile);
      if (getNextQuestions(payload.missionId, nextProfile).length === 0) {
        prepareMission(payload.missionId, nextProfile);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "RightNow could not read that safely.");
    } finally {
      setWorking(false);
    }
  }

  function requestInterpretation(message: string): void {
    const clean = message.trim();
    if (!hydrated || !clean || working) return;
    const sensitive = detectSensitiveInput(clean);
    if (sensitive) {
      setInput("");
      setError(`Remove the ${sensitive.kind} value. This prototype never needs identity or account numbers.`);
      return;
    }
    setInput("");
    if (household.aiConsent === null) {
      setPendingMessage(clean);
      setConsentOpen(true);
      return;
    }
    void interpretMessage(clean, household.aiConsent);
  }

  function chooseAiMode(aiConsent: boolean): void {
    setConsentOpen(false);
    setHousehold((current) => ({ ...current, aiConsent }));
    const message = pendingMessage;
    setPendingMessage(null);
    if (message) void interpretMessage(message, aiConsent);
  }

  function answerQuestion(value: FactValue, label: string): void {
    if (!hydrated || !activeMission || !currentQuestion) return;
    const nextProfile = applyFactUpdate(household.profile, { [currentQuestion.factKey]: value });
    setMessages((current) => [...current, { id: messageId(), role: "user", text: label }]);
    updateProfile(nextProfile);
    const remaining = getNextQuestions(activeMission, nextProfile);
    if (remaining.length === 0) prepareMission(activeMission, nextProfile);
  }

  function removeFact(key: FactKey): void {
    const nextFacts = Object.fromEntries(
      Object.entries(household.profile.facts).filter(([factKey]) => factKey !== key),
    );
    setHousehold((current) => ({
      ...current,
      profile: { ...current.profile, facts: nextFacts, updatedAt: new Date().toISOString() },
    }));
    setPreparedActions([]);
  }

  function changeLanguage(preferredLanguage: LanguageCode): void {
    setHousehold((current) => ({
      ...current,
      profile: { ...current.profile, preferredLanguage, updatedAt: new Date().toISOString() },
    }));
  }

  function changeAiConsent(aiConsent: boolean | null): void {
    setHousehold((current) => ({ ...current, aiConsent }));
  }

  function clearAll(): void {
    setHousehold(clearHousehold(window.localStorage));
    setMessages([]);
    setPreparedActions([]);
    setCasePlan(null);
    setCasePlanMode(null);
    setConsentOpen(false);
    setPendingMessage(null);
    setSelectedIds([]);
    setActiveMission(null);
    setHouseholdOpen(false);
  }

  function toggleSelected(id: string): void {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function submitSelected(): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      const prepareResponse = await fetch("/api/mock-gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "prepare", actionIds: selectedIds }),
      });
      const prepared = await prepareResponse.json() as { approvalToken?: string; error?: { message?: string } };
      if (!prepareResponse.ok || !prepared.approvalToken) {
        throw new Error(prepared.error?.message ?? "Could not create a safe review token.");
      }

      const submitResponse = await fetch("/api/mock-gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "submit", actionIds: selectedIds, approvalToken: prepared.approvalToken }),
      });
      const result = await submitResponse.json() as { submissions?: MockSubmission[]; error?: { message?: string } };
      if (!submitResponse.ok || !result.submissions) {
        throw new Error(result.error?.message ?? "The mock gateway could not finish.");
      }

      const byId = new Map(result.submissions.map((submission) => [submission.actionId, submission]));
      const approvedActions = preparedActions.filter(({ id }) => selectedIds.includes(id));
      setHousehold((current) => ({
        ...current,
        inbox: mergeInbox(current.inbox, approvedActions).map((item) => {
          const submission = byId.get(item.id);
          return submission ? { ...item, ...submission } : item;
        }),
      }));
      setReviewOpen(false);
      setPreparedActions([]);
      setSelectedIds([]);
      setCasePlan(null);
      setCasePlanMode(null);
      setMessages((current) => [
        ...current,
        { id: messageId(), role: "assistant", text: "Your simulated plan is now in your civic inbox. Nothing was sent." },
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The mock gateway could not finish.");
    } finally {
      setSubmitting(false);
    }
  }

  function startListening(): void {
    if (!hydrated) return;
    type Recognition = new () => {
      lang: string;
      start: () => void;
      onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void;
      onend: () => void;
      onerror: () => void;
    };
    const browserWindow = window as typeof window & { SpeechRecognition?: Recognition; webkitSpeechRecognition?: Recognition };
    const RecognitionApi = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!RecognitionApi) {
      setError("Voice input is not available in this browser. You can type instead.");
      return;
    }
    const recognition = new RecognitionApi();
    recognition.lang = household.profile.preferredLanguage === "hi" ? "hi-IN" : household.profile.preferredLanguage === "ta" ? "ta-IN" : "en-IN";
    recognition.onresult = (event) => setInput(event.results[0]?.[0]?.transcript ?? "");
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      setError("Voice input stopped. You can type your message instead.");
    };
    setIsListening(true);
    recognition.start();
  }

  return (
    <main className="app-shell">
      <section className="main-stage">
        <header className="brand-row">
          <div className="brand-mark">
            <span className="brand-symbol"><BuildingsIcon aria-hidden="true" size={18} weight="fill" /></span>
            RightNow India
          </div>
          <div className="utility-actions">
            <div className="language-switcher" aria-label="Choose language">
              {(["en", "hi", "ta"] as const).map((language) => (
                <button
                  type="button"
                  key={language}
                  aria-pressed={household.profile.preferredLanguage === language}
                  onClick={() => changeLanguage(language)}
                >
                  {language === "en" ? "EN" : language === "hi" ? "हिं" : "த"}
                </button>
              ))}
            </div>
            <button className="text-button" type="button" onClick={() => setHouseholdOpen(true)}>What RightNow knows</button>
            <button className="icon-button" type="button" onClick={() => setHouseholdOpen(true)} aria-label="Open household profile">
              <UserCircleIcon aria-hidden="true" size={22} />
            </button>
          </div>
        </header>

        <section className="service-finder" aria-labelledby="hero-title">
          <div className="finder-heading">
            <h1 id="hero-title">Whatever changed, start here</h1>
            <p>Describe any life situation. AI routes it into a reviewable simulation, while verified demo connectors add detail when they fit. Nothing is submitted.</p>
          </div>
          <form className="composer" onSubmit={(event) => { event.preventDefault(); requestInterpretation(input); }}>
            <button
              className="icon-button"
              type="button"
              onClick={startListening}
              disabled={!hydrated}
              aria-label={isListening ? "Listening" : "Use voice input"}
              title="Use voice input"
            >
              <MicrophoneIcon aria-hidden="true" size={20} weight={isListening ? "fill" : "regular"} />
            </button>
            <label className="sr-only" htmlFor="life-change">Tell us what changed</label>
            <textarea
              id="life-change"
              rows={1}
              value={input}
              maxLength={1000}
              disabled={!hydrated}
              placeholder={languageCopy.placeholder}
              onChange={(event) => setInput(event.target.value)}
            />
            <button className="send-button" type="submit" disabled={!hydrated || !input.trim() || working} aria-label="Send message">
              <ArrowUpIcon aria-hidden="true" size={21} weight="bold" />
            </button>
          </form>
          <p className="demo-notice">
            <CheckCircleIcon aria-hidden="true" size={16} weight="fill" />
            Do not include names, exact addresses, ID or account numbers, OTPs, or personal records.
            <span className="ai-mode-chip">
              {household.aiConsent === true ? "AI routing on" : household.aiConsent === false ? "Guided mode" : "AI asks first"}
            </span>
          </p>
        </section>

        <section className="mission-section" aria-labelledby="mission-title">
          <div className="section-heading">
            <h2 id="mission-title">Examples, not limits</h2>
            <p>Try one of these or describe anything else in your own words.</p>
          </div>

          <div className="prompt-grid" aria-label="Example requests">
            {examplePrompts.map((example) => (
                <button
                  className="prompt-chip"
                  type="button"
                  key={example}
                  aria-label={example}
                  disabled={!hydrated}
                  onClick={() => requestInterpretation(example)}
                >
                  <span className="prompt-copy">
                    <strong>{example}</strong>
                    <small>Try this</small>
                  </span>
                  <ArrowUpIcon className="prompt-arrow" aria-hidden="true" size={17} weight="bold" />
                </button>
              ))}
          </div>
        </section>

        <section className="workspace" aria-live="polite" aria-label="RightNow conversation">
          {messages.length > 0 ? (
            <div className="conversation">
              {messages.map((message) => (
                <div className={`message ${message.role}`} key={message.id}>
                  {message.text}
                  {message.note ? <small>{message.note}</small> : null}
                </div>
              ))}
              <div ref={transcriptEnd} />
            </div>
          ) : null}

          {working ? <div className="question-panel"><p>Finding services and next steps that may help...</p></div> : null}
          {error ? <div className="error-callout" role="alert">{error}</div> : null}

          {casePlan ? (
            <section ref={casePlanTarget} className="question-panel generated-plan" aria-labelledby="case-plan-title">
              <span className="plan-eyebrow">
                {casePlanMode === "model" ? "AI-generated simulation" : "Safe fallback simulation"}
              </span>
              <h2 id="case-plan-title">{casePlan.title}</h2>
              <p>{casePlan.summary}</p>
              <ol>
                {casePlan.steps.map((step) => <li key={step.title}><strong>{step.title}.</strong> {step.description}</li>)}
              </ol>
              <p className="simulation-disclaimer">
                {casePlanMode === "model" ? "AI-generated" : "Generic fallback"} simulation, not verified official guidance. Review it before saving a mock record. RightNow will not contact a government office, person or service.
              </p>
            </section>
          ) : null}

          {activeMission === "safety" ? (
            <section className="emergency-panel" aria-labelledby="safety-plan-title">
              <h2 id="safety-plan-title">Immediate support plan</h2>
              <p><strong>If anyone may still be in danger, call 112 now.</strong> Move to a safe place. Do not confront anyone or disturb the area.</p>
              <ol>
                <li>Use 112 for urgent police, fire or medical support.</li>
                <li>When safe, note the time, place, people involved and items affected.</li>
                <li>Keep photos, messages or other evidence only if it is safe to do so.</li>
              </ol>
              <p className="simulation-disclaimer">This demo has not contacted 112, police or anyone else.</p>
            </section>
          ) : null}

          {currentQuestion ? (
            <div ref={questionTarget} className="question-panel">
              <h2>{currentQuestion.prompt}</h2>
              {currentQuestion.help ? <p>{currentQuestion.help}</p> : <p>Choose a synthetic answer for this public demo.</p>}
              <div className="answer-grid">
                {currentQuestion.options?.map((option) => (
                  <button className="answer-button" type="button" key={`${currentQuestion.factKey}-${String(option.value)}`} disabled={!hydrated} onClick={() => answerQuestion(option.value, option.label)}>
                    {option.label}
                  </button>
                ))}
                {currentQuestion.input === "boolean" && !currentQuestion.options ? (
                  <>
                    <button className="answer-button" type="button" disabled={!hydrated} onClick={() => answerQuestion(true, "Yes")}>Yes</button>
                    <button className="answer-button" type="button" disabled={!hydrated} onClick={() => answerQuestion(false, "No")}>No</button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          {preparedActions.length > 0 ? (
            <div ref={preparedTarget} className="prepared-panel">
              <h2>
                {preparedActions.every(({ missionId }) => missionId === "general")
                  ? "Plan ready to simulate"
                  : `${preparedActions.length} ${preparedActions.length === 1 ? "service" : "services"} ready to simulate`}
              </h2>
              <p>Review what RightNow would prepare. It stops before contacting an official service.</p>
              <div className="prepared-list">
                {preparedActions.map((action) => (
                  <div className="prepared-row" key={action.id}>
                    <span>{action.title}</span>
                    <span className="status-badge"><CheckCircleIcon aria-hidden="true" size={13} weight="fill" /> Ready</span>
                  </div>
                ))}
              </div>
              <button className="primary-button" type="button" onClick={() => setReviewOpen(true)}>
                <ListChecksIcon aria-hidden="true" size={19} /> Review your plan
              </button>
            </div>
          ) : null}
        </section>
      </section>

      <aside className="side-rail" aria-label="Household and civic inbox">
        <section className="rail-intro">
          <h2>Your account</h2>
          <p>Facts you choose to save stay in this browser and can be reused when they help.</p>
        </section>

        <section className="rail-section">
          <div className="rail-title">
            <h2>What RightNow knows</h2>
            <button className="icon-button compact" type="button" onClick={() => setHouseholdOpen(true)} aria-label="Edit household facts">
              <PencilSimpleIcon aria-hidden="true" size={15} />
            </button>
          </div>
          {Object.keys(household.profile.facts).length === 0 ? (
            <div className="empty-state">Facts you share appear here and can be reused across missions.</div>
          ) : (
            <div className="fact-list">
              {(Object.entries(household.profile.facts) as Array<[FactKey, FactValue]>).slice(0, 6).map(([key, value]) => (
                <div className="fact-row" key={key}><span>{factLabels[key] ?? key}</span><strong>{formatFact(value)}</strong></div>
              ))}
            </div>
          )}
        </section>

        <section className="rail-section">
          <div className="rail-title">
            <h2>Civic inbox</h2>
            <span className="rail-count">{household.inbox.length}</span>
          </div>
          {household.inbox.length === 0 ? (
            <div className="empty-state">Plans you approve will appear here as simulations.</div>
          ) : (
            <div className="inbox-list">
              {household.inbox.slice().reverse().slice(0, 8).map((item) => (
                <div className="inbox-item" key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.status === "submitted" || item.status === "simulated" ? "Simulation recorded" : "Ready to simulate"}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rail-section">
          <div className="rail-title"><h2>Service check</h2><BuildingsIcon aria-hidden="true" size={18} /></div>
          <div className="empty-state">
            <BellRingingIcon aria-hidden="true" size={17} /> Each saved change is checked against the services in this demo.
          </div>
        </section>
      </aside>

      <HouseholdDialog
        open={householdOpen}
        profile={household.profile}
        aiConsent={household.aiConsent}
        onOpenChange={setHouseholdOpen}
        onRemoveFact={removeFact}
        onLanguageChange={changeLanguage}
        onAiConsentChange={changeAiConsent}
        onClear={clearAll}
      />
      <ReviewDialog
        open={reviewOpen}
        actions={preparedActions}
        selectedIds={selectedIds}
        submitting={submitting}
        error={error}
        onOpenChange={setReviewOpen}
        onToggle={toggleSelected}
        onSubmit={() => void submitSelected()}
      />
      <ConsentDialog open={consentOpen} onChoose={chooseAiMode} />
    </main>
  );
}
