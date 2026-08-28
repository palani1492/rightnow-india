"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpIcon,
  BabyIcon,
  BellRingingIcon,
  BriefcaseIcon,
  BuildingsIcon,
  CheckCircleIcon,
  GraduationCapIcon,
  HandCoinsIcon,
  ListChecksIcon,
  MicrophoneIcon,
  PencilSimpleIcon,
  SparkleIcon,
  StorefrontIcon,
  UserCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { missionCatalog } from "@/lib/catalog";
import { applyFactUpdate, getNextQuestions, planMission, scanHousehold } from "@/lib/mission-engine";
import type { FactKey, FactValue, LanguageCode, MissionId, PreparedAction } from "@/lib/types";
import {
  clearHousehold,
  createEmptyHousehold,
  loadHousehold,
  saveHousehold,
  type InboxAction,
  type StoredHousehold,
} from "@/client/storage";
import { ConsentDialog } from "./consent-dialog";
import { factLabels, formatFact, HouseholdDialog } from "./household-dialog";
import { ReviewDialog } from "./review-dialog";

type ConversationMessage = { id: string; role: "user" | "assistant"; text: string; note?: string };

type AgentResponse = {
  language: LanguageCode;
  missionId: MissionId | null;
  facts: Array<{ key: FactKey; value: FactValue }>;
  reply: string;
  mode: "model" | "fallback";
  fallbackReason?: string;
};

type MockSubmission = {
  actionId: string;
  reference: string;
  status: "submitted";
  timeline: ReadonlyArray<{ label: string; at: string }>;
};

const missionIcons: Record<MissionId, Icon> = {
  pregnancy: BabyIcon,
  college: GraduationCapIcon,
  work: BriefcaseIcon,
  "job-loss": HandCoinsIcon,
  business: StorefrontIcon,
  grievance: WarningCircleIcon,
};

const missionLabels: Record<MissionId, string> = {
  pregnancy: "I am expecting a child",
  college: "I am starting college",
  work: "I started earning",
  "job-loss": "I lost my job",
  business: "I want to start a business",
  grievance: "I have a public service problem",
};

const copyByLanguage: Record<LanguageCode, { headline: string; tagline: string; placeholder: string }> = {
  en: {
    headline: "Tell us what changed.",
    tagline: "One conversation. Every public service.",
    placeholder: "For example, I started freelancing from home...",
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

export function RightNowApp() {
  const [household, setHousehold] = useState<StoredHousehold>(() => createEmptyHousehold());
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [activeMission, setActiveMission] = useState<MissionId | null>(null);
  const [preparedActions, setPreparedActions] = useState<PreparedAction[]>([]);
  const [unsupported, setUnsupported] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [householdOpen, setHouseholdOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const transcriptEnd = useRef<HTMLDivElement>(null);

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

  function updateProfile(nextProfile: StoredHousehold["profile"]): void {
    setHousehold((current) => {
      const discovered = scanHousehold(nextProfile, current.inbox.map(({ id }) => id)).discoveredActions;
      return { ...current, profile: nextProfile, inbox: mergeInbox(current.inbox, discovered) };
    });
  }

  function prepareMission(missionId: MissionId, profile = household.profile): void {
    const plan = planMission(missionId, profile);
    if (plan.nextQuestions.length === 0) {
      setPreparedActions(plan.actions);
      setSelectedIds(plan.actions.map(({ id }) => id));
      setHousehold((current) => ({ ...current, inbox: mergeInbox(current.inbox, plan.actions) }));
      const preparedText = plan.actions.length > 0
        ? `I prepared ${plan.actions.length} actions for one review. Nothing has been submitted.`
        : "I do not have enough rule-based evidence to prepare an action. Try editing the household facts.";
      setMessages((current) => [...current, { id: messageId(), role: "assistant", text: preparedText }]);
    }
  }

  async function interpretMessage(message: string, consent: boolean): Promise<void> {
    setWorking(true);
    setError(null);
    setMessages((current) => [...current, { id: messageId(), role: "user", text: message }]);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          locale: household.profile.preferredLanguage,
          aiConsent: consent,
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
          note: payload.mode === "fallback" ? "Private deterministic interpretation" : "Interpreted by Luna, checked by fixed rules",
        },
      ]);

      if (!payload.missionId) {
        setUnsupported(true);
        return;
      }
      setUnsupported(false);
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
    setInput("");
    if (household.aiConsent === null) {
      setPendingMessage(clean);
      setConsentOpen(true);
      return;
    }
    void interpretMessage(clean, household.aiConsent);
  }

  function chooseConsent(consent: boolean): void {
    setHousehold((current) => ({ ...current, aiConsent: consent }));
    setConsentOpen(false);
    if (pendingMessage) {
      const message = pendingMessage;
      setPendingMessage(null);
      void interpretMessage(message, consent);
    }
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
    setUnsupported(false);
  }

  function changeLanguage(preferredLanguage: LanguageCode): void {
    setHousehold((current) => ({
      ...current,
      profile: { ...current.profile, preferredLanguage, updatedAt: new Date().toISOString() },
    }));
  }

  function clearAll(): void {
    setHousehold(clearHousehold(window.localStorage));
    setMessages([]);
    setPreparedActions([]);
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
      setHousehold((current) => ({
        ...current,
        inbox: current.inbox.map((item) => {
          const submission = byId.get(item.id);
          return submission ? { ...item, ...submission } : item;
        }),
      }));
      setReviewOpen(false);
      setMessages((current) => [
        ...current,
        { id: messageId(), role: "assistant", text: `${result.submissions?.length ?? 0} mock applications are now in your civic inbox.` },
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
            <span className="brand-symbol"><SparkleIcon aria-hidden="true" size={17} weight="fill" /></span>
            RightNow India
          </div>
          <div className="utility-actions">
            <button className="text-button" type="button" onClick={() => setHouseholdOpen(true)}>What RightNow knows</button>
            <button className="icon-button" type="button" onClick={() => setHouseholdOpen(true)} aria-label="Open household profile">
              <UserCircleIcon aria-hidden="true" size={22} />
            </button>
          </div>
        </header>

        <div className="hero-copy">
          <h1>{languageCopy.headline}</h1>
          <p>{languageCopy.tagline}</p>
        </div>

        <div className="composer-wrap">
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

          <div className="prompt-grid" aria-label="Life mission suggestions">
            {missionCatalog.map((mission) => {
              const MissionIcon = missionIcons[mission.id];
              return (
                <button className="prompt-chip" type="button" key={mission.id} disabled={!hydrated} onClick={() => requestInterpretation(missionLabels[mission.id])}>
                  <MissionIcon aria-hidden="true" size={18} weight="duotone" />
                  {mission.title}
                </button>
              );
            })}
          </div>
        </div>

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

          {working ? <div className="question-panel"><p>Connecting your life change to the right mission...</p></div> : null}
          {error ? <div className="error-callout" role="alert">{error}</div> : null}

          {unsupported ? (
            <div className="handoff-panel">
              <strong>This service is outside the six demo missions.</strong>
              <p>Continue through an official discovery entry point. RightNow will not pretend it can complete an unsupported service.</p>
              <div className="answer-grid">
                <a href="https://web.umang.gov.in/landing" target="_blank" rel="noreferrer">Open official UMANG</a>
                <a href="https://www.myscheme.gov.in/" target="_blank" rel="noreferrer">Explore official myScheme</a>
              </div>
            </div>
          ) : null}

          {currentQuestion ? (
            <div className="question-panel">
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
            <div className="prepared-panel">
              <h2>{preparedActions.length} actions, one review</h2>
              <p>RightNow checked fixed demo rules, assembled the required facts and stopped before submission.</p>
              <div className="prepared-list">
                {preparedActions.map((action) => (
                  <div className="prepared-row" key={action.id}>
                    <span>{action.title}</span>
                    <span className="status-badge"><CheckCircleIcon aria-hidden="true" size={13} weight="fill" /> Prepared</span>
                  </div>
                ))}
              </div>
              <button className="primary-button" type="button" onClick={() => setReviewOpen(true)}>
                <ListChecksIcon aria-hidden="true" size={19} /> Review all actions
              </button>
            </div>
          ) : null}
        </section>
      </section>

      <aside className="side-rail" aria-label="Household and civic inbox">
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
            <div className="empty-state">Prepared actions, mock references and future reminders will appear here.</div>
          ) : (
            <div className="inbox-list">
              {household.inbox.slice().reverse().slice(0, 8).map((item) => (
                <div className="inbox-item" key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.status === "submitted" ? item.reference : "Ready for consolidated review"}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rail-section">
          <div className="rail-title"><h2>Autopilot</h2><BuildingsIcon aria-hidden="true" size={18} /></div>
          <div className="empty-state">
            <BellRingingIcon aria-hidden="true" size={17} /> Every saved change is scanned against all 19 demo connectors.
          </div>
        </section>
      </aside>

      <ConsentDialog open={consentOpen} onChoose={chooseConsent} />
      <HouseholdDialog
        open={householdOpen}
        profile={household.profile}
        onOpenChange={setHouseholdOpen}
        onRemoveFact={removeFact}
        onLanguageChange={changeLanguage}
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
    </main>
  );
}
