import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEY, createEmptyHousehold, type StoredHousehold } from "@/client/storage";
import { deterministicInterpretation } from "@/lib/agent/fallback";
import { RightNowApp } from "./right-now-app";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function installFetchMock() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const requestBody = JSON.parse(String(init?.body ?? "{}")) as {
      message?: string;
      locale?: "en" | "hi" | "ta";
      aiConsent?: boolean;
      operation?: "prepare" | "submit";
      actionIds?: string[];
    };

    if (url === "/api/agent") {
      return jsonResponse(
        deterministicInterpretation(
          requestBody.message ?? "",
          requestBody.locale,
          requestBody.aiConsent ? "unconfigured" : "consent-declined",
        ),
      );
    }

    if (url === "/api/mock-gateway" && requestBody.operation === "prepare") {
      return jsonResponse({
        approvalToken: "rtl-approval-token",
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      });
    }

    if (url === "/api/mock-gateway" && requestBody.operation === "submit") {
      return jsonResponse({
        submissions: (requestBody.actionIds ?? []).map((actionId, index) => ({
          actionId,
          reference: `MOCK-RNI-TEST-${String(index + 1).padStart(4, "0")}`,
          status: "simulated",
          timeline: [{ label: "Mock submission created", at: new Date().toISOString() }],
        })),
      });
    }

    return jsonResponse({ error: { message: "Unexpected test request" } }, 500);
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function waitForHydration(): Promise<void> {
  await waitFor(() => {
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });
}

describe("RightNowApp citizen journeys", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    Element.prototype.scrollIntoView = vi.fn();
    installFetchMock();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("gives citizens a straightforward service finder without a marketing-style walkthrough", async () => {
    render(<RightNowApp />);

    await waitForHydration();
    expect(
      screen.getByRole("heading", {
        name: "Whatever changed, start here",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Examples, not limits")).toBeInTheDocument();
    expect(screen.getByText(/Do not include names, exact addresses/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your account" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Mission control" })).not.toBeInTheDocument();

    for (const example of [
      "My passport expired",
      "I am moving states",
      "A certificate has an error",
      "I lost my job",
      "My parent needs support",
      "I want to start a shop",
    ]) {
      expect(screen.getByRole("button", { name: example })).toBeEnabled();
    }

    expect(screen.getByText("Examples, not limits")).toBeInTheDocument();
  });

  it("gets explicit consent before using AI for an open-ended request", async () => {
    const user = userEvent.setup();
    const fetchMock = installFetchMock();
    render(<RightNowApp />);

    await waitForHydration();
    await user.type(screen.getByLabelText("Tell us what changed"), "I need help renewing my passport");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    const consentDialog = screen.getByRole("dialog", { name: "Choose how RightNow routes descriptions" });
    expect(within(consentDialog).getByText(/sent to OpenCode Go/i)).toBeInTheDocument();
    await user.click(within(consentDialog).getByRole("button", { name: "Always use AI routing" }));

    expect(await screen.findByRole("heading", { name: "Your situation plan" })).toBeInTheDocument();
    expect(screen.getByText("Safe fallback simulation")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/agent",
      expect.objectContaining({ body: expect.stringContaining('"aiConsent":true') }),
    );
    expect(screen.getByText("AI routing on")).toBeInTheDocument();
  });

  it("creates an immediate simulated support plan for a robbery without contacting emergency services", async () => {
    const user = userEvent.setup();
    render(<RightNowApp />);

    await waitForHydration();
    await user.type(screen.getByLabelText("Tell us what changed"), "Someone broke into my house");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await user.click(screen.getByRole("button", { name: "Use guided mode" }));

    expect(await screen.findByRole("heading", { name: "Immediate support plan" })).toBeInTheDocument();
    expect(screen.getByText(/If anyone may still be in danger, call 112 now/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "1 service ready to simulate" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review your plan" }));

    const reviewDialog = screen.getByRole("dialog", { name: "Review your plan" });
    expect(
      within(reviewDialog).getByText(
        "Select the steps to simulate. Nothing is submitted to any government service or portal.",
      ),
    ).toBeInTheDocument();
    expect(within(reviewDialog).queryByText(/Emergency 112 support preparation/i)).not.toBeInTheDocument();
    await user.click(within(reviewDialog).getByRole("button", { name: "Simulate 1 next step" }));

    expect(await screen.findByText("Your simulated plan is now in your civic inbox. Nothing was sent.")).toBeInTheDocument();
  });

  it("turns an interstate move into a reviewable simulated service plan", async () => {
    const user = userEvent.setup();
    render(<RightNowApp />);

    await waitForHydration();
    await user.type(screen.getByLabelText("Tell us what changed"), "I am moving to a different state");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await user.click(screen.getByRole("button", { name: "Use guided mode" }));

    expect(await screen.findByRole("heading", { name: "4 services ready to simulate" })).toBeInTheDocument();
    expect(screen.getAllByText("Aadhaar address-update preparation")).toHaveLength(1);
    expect(screen.queryByText(/This service is not included in the current demo/i)).not.toBeInTheDocument();
  });

  it("turns an unlisted need into an AI-generated plan that can be simulated", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body ?? "{}")) as { operation?: string; actionIds?: string[] };
      if (String(input) === "/api/agent") {
        return jsonResponse({
          language: "en",
          missionId: null,
          confidence: 0.88,
          facts: [],
          reply: "I prepared a reviewable simulation plan based on what you shared.",
          casePlan: {
            title: "Passport renewal plan",
            summary: "A simulated checklist for preparing a renewal request.",
            steps: [
              { title: "Check the renewal path", description: "Confirm which renewal route applies before reviewing the plan." },
              { title: "Prepare the checklist", description: "List the records that you will need before any official step." },
            ],
          },
          mode: "model",
        });
      }
      if (request.operation === "prepare") return jsonResponse({ approvalToken: "rtl-case-token" });
      if (request.operation === "submit") {
        return jsonResponse({
          submissions: [{
            actionId: request.actionIds?.[0],
            reference: "MOCK-RNI-CASE-0001",
            status: "simulated",
            timeline: [{ label: "Mock submission created", at: new Date().toISOString() }],
          }],
        });
      }
      return jsonResponse({ error: { message: "Unexpected test request" } }, 500);
    }));
    render(<RightNowApp />);

    await waitForHydration();
    await user.type(screen.getByLabelText("Tell us what changed"), "I need to renew my passport");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await user.click(screen.getByRole("button", { name: "Always use AI routing" }));

    expect(await screen.findByRole("heading", { name: "Passport renewal plan" })).toBeInTheDocument();
    expect(screen.getByText("AI-generated simulation")).toBeInTheDocument();
    expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ behavior: "smooth", block: "start" });
    expect(screen.getByText("Check the renewal path.")).toBeInTheDocument();
    expect(screen.getByText(/generated simulation, not verified official guidance/i)).toBeInTheDocument();
    expect(screen.getByText("Plans you approve will appear here as simulations.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review your plan" }));
    expect(screen.getByRole("dialog", { name: "Review your plan" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Simulate 1 next step" }));
    expect(await screen.findByText("Your simulated plan is now in your civic inbox. Nothing was sent.")).toBeInTheDocument();
  });

  it("clears saved facts, inbox actions and consent from this browser", async () => {
    const user = userEvent.setup();
    const household: StoredHousehold = {
      ...createEmptyHousehold("2026-08-28T00:00:00.000Z"),
      aiConsent: false,
      profile: {
        ...createEmptyHousehold("2026-08-28T00:00:00.000Z").profile,
        facts: { lifeEvent: "college", state: "Tamil Nadu" },
      },
      inbox: [],
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(household));

    render(<RightNowApp />);
    expect(await screen.findByText("Tamil Nadu")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open household profile" }));
    await user.click(screen.getByRole("button", { name: "Clear household" }));

    expect(await screen.findByText("Facts you share appear here and can be reused across missions.")).toBeInTheDocument();
    expect(screen.getByText("Plans you approve will appear here as simulations.")).toBeInTheDocument();
    await waitFor(() => {
      const persisted = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as StoredHousehold;
      expect(persisted.profile.facts).toEqual({});
      expect(persisted.inbox).toEqual([]);
      expect(persisted.aiConsent).toBeNull();
    });
  });

  it("authorizes prepared grievance actions together and updates the civic inbox", async () => {
    const user = userEvent.setup();
    const household = { ...createEmptyHousehold(), aiConsent: false } satisfies StoredHousehold;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(household));
    const fetchMock = installFetchMock();

    render(<RightNowApp />);
    await screen.findByRole("heading", {
      name: "Whatever changed, start here",
    });
    await user.type(screen.getByLabelText("Tell us what changed"), "I have a public service problem");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await user.click(await screen.findByRole("button", { name: "Government or public service" }));
    await user.click(await screen.findByRole("button", { name: /^Yes$/ }));

    expect(await screen.findByRole("heading", { name: "1 service ready to simulate" })).toBeInTheDocument();
    expect(screen.getAllByText("CPGRAMS grievance preparation")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Review your plan" }));

    const reviewDialog = screen.getByRole("dialog", { name: "Review your plan" });
    expect(
      within(reviewDialog).getByText(
        "Select the steps to simulate. Nothing is submitted to any government service or portal.",
      ),
    ).toBeInTheDocument();
    await user.click(within(reviewDialog).getByRole("button", { name: "Simulate 1 next step" }));

    expect(await screen.findByText("Your simulated plan is now in your civic inbox. Nothing was sent.")).toBeInTheDocument();
    expect(screen.getByText("Simulation recorded")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/mock-gateway",
      expect.objectContaining({ body: expect.stringContaining('"operation":"prepare"') }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/mock-gateway",
      expect.objectContaining({ body: expect.stringContaining('"operation":"submit"') }),
    );
  });
});
