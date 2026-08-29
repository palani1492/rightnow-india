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
          reference: `RNI-TEST-${String(index + 1).padStart(4, "0")}`,
          status: "simulated",
          timeline: [{ label: "Request prepared", at: new Date().toISOString() }],
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

  it("routes an open-ended request automatically without asking the citizen to choose a routing method", async () => {
    const user = userEvent.setup();
    const fetchMock = installFetchMock();
    render(<RightNowApp />);

    await waitForHydration();
    await user.type(screen.getByLabelText("Tell us what changed"), "I need help renewing my passport");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "A plan for your situation" })).toBeInTheDocument();
    expect(screen.getByText("Your action plan")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/agent",
      expect.objectContaining({ body: expect.stringContaining('"aiConsent":true') }),
    );
    expect(screen.queryByText(/OpenCode|GPT|AI provider|AI routing/i)).not.toBeInTheDocument();
  });

  it("creates an immediate safety plan for a robbery without contacting emergency services", async () => {
    const user = userEvent.setup();
    render(<RightNowApp />);

    await waitForHydration();
    await user.type(screen.getByLabelText("Tell us what changed"), "Someone broke into my house");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByRole("heading", { name: "Your safety comes first" })).toBeInTheDocument();
    expect(screen.getByText(/move somewhere safe if possible and call/i)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "1 service identified" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review your request" }));

    const reviewDialog = screen.getByRole("dialog", { name: "Review your request" });
    expect(
      within(reviewDialog).getByText(
        "Select the services to continue with. Nothing is submitted to any government service or portal.",
      ),
    ).toBeInTheDocument();
    await user.click(within(reviewDialog).getByRole("button", { name: "Prepare 1 service" }));

    expect(
      await screen.findByText("Added to Your requests. Continue to the official service when you're ready."),
    ).toBeInTheDocument();
  });

  it("turns an interstate move into a reviewable service plan", async () => {
    const user = userEvent.setup();
    render(<RightNowApp />);

    await waitForHydration();
    await user.type(screen.getByLabelText("Tell us what changed"), "I am moving to a different state");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByRole("heading", { name: "4 services identified" })).toBeInTheDocument();
    expect(screen.getAllByText("Aadhaar address-update preparation")).toHaveLength(1);
  });

  it("turns an unlisted need into an AI-prepared plan that can be reviewed", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body ?? "{}")) as { operation?: string; actionIds?: string[] };
      if (String(input) === "/api/agent") {
        return jsonResponse({
          language: "en",
          missionId: null,
          confidence: 0.88,
          facts: [],
          reply: "Based on what you shared, I've put together an action plan for you.",
          casePlan: {
            title: "Passport renewal plan",
            summary: "A checklist for preparing a renewal request.",
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
            reference: "RNI-CASE-0001",
            status: "simulated",
            timeline: [{ label: "Request prepared", at: new Date().toISOString() }],
          }],
        });
      }
      return jsonResponse({ error: { message: "Unexpected test request" } }, 500);
    }));
    render(<RightNowApp />);

    await waitForHydration();
    await user.type(screen.getByLabelText("Tell us what changed"), "I need to renew my passport");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByRole("heading", { name: "Passport renewal plan" })).toBeInTheDocument();
    expect(screen.getByText("Your action plan")).toBeInTheDocument();
    expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ behavior: "smooth", block: "start" });
    expect(screen.getByText("Check the renewal path.")).toBeInTheDocument();
    expect(screen.getByText(/preparation guide, not official guidance/i)).toBeInTheDocument();
    expect(screen.getByText("Requests you prepare will appear here so you can continue and track them.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review your request" }));
    expect(screen.getByRole("dialog", { name: "Review your request" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Prepare 1 service" }));
    expect(
      await screen.findByText("Added to Your requests. Continue to the official service when you're ready."),
    ).toBeInTheDocument();
  });

  it("clears saved facts and requests from this browser", async () => {
    const user = userEvent.setup();
    const household: StoredHousehold = {
      ...createEmptyHousehold("2026-08-28T00:00:00.000Z"),
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

    expect(await screen.findByText("Facts you share appear here and can be reused across situations.")).toBeInTheDocument();
    expect(screen.getByText("Requests you prepare will appear here so you can continue and track them.")).toBeInTheDocument();
    await waitFor(() => {
      const persisted = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as StoredHousehold;
      expect(persisted.profile.facts).toEqual({});
      expect(persisted.inbox).toEqual([]);
    });
  });

  it("prepares grievance actions together and updates the citizen's requests", async () => {
    const user = userEvent.setup();
    const household = createEmptyHousehold() satisfies StoredHousehold;
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

    expect(await screen.findByRole("heading", { name: "1 service identified" })).toBeInTheDocument();
    expect(screen.getAllByText("CPGRAMS grievance preparation")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Review your request" }));

    const reviewDialog = screen.getByRole("dialog", { name: "Review your request" });
    expect(
      within(reviewDialog).getByText(
        "Select the services to continue with. Nothing is submitted to any government service or portal.",
      ),
    ).toBeInTheDocument();
    await user.click(within(reviewDialog).getByRole("button", { name: "Prepare 1 service" }));

    expect(
      await screen.findByText("Added to Your requests. Continue to the official service when you're ready."),
    ).toBeInTheDocument();
    expect(screen.getByText("Request prepared")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mark as completed" }));
    expect(await screen.findByText("Completed by you")).toBeInTheDocument();
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
