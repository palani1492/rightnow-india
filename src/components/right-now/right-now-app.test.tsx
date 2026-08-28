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
          status: "submitted",
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

  it("offers private demo mode before the first message and gives an honest unsupported fallback", async () => {
    const user = userEvent.setup();
    const fetchMock = installFetchMock();
    render(<RightNowApp />);

    await waitForHydration();
    await user.type(screen.getByLabelText("Tell us what changed"), "I need help renewing my passport");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    const consentDialog = screen.getByRole("dialog", {
      name: "Choose how RightNow understands you",
    });
    expect(within(consentDialog).getByText(/Never enter identity numbers/i)).toBeInTheDocument();
    expect(within(consentDialog).getByText(/may be kept for up to 30 days/i)).toBeInTheDocument();

    await user.click(within(consentDialog).getByRole("button", { name: /Use private demo mode/i }));

    expect(await screen.findByText(/That need is not in this demo yet/i)).toBeInTheDocument();
    expect(screen.getByText("Private deterministic interpretation")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/agent",
      expect.objectContaining({ body: expect.stringContaining('"aiConsent":false') }),
    );
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
    expect(screen.getByText("Prepared actions, mock references and future reminders will appear here.")).toBeInTheDocument();
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
    await screen.findByRole("heading", { name: "Tell us what changed." });
    await user.type(screen.getByLabelText("Tell us what changed"), "I have a public service problem");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await user.click(await screen.findByRole("button", { name: "Government or public service" }));
    await user.click(await screen.findByRole("button", { name: /^Yes$/ }));

    expect(await screen.findByRole("heading", { name: "1 actions, one review" })).toBeInTheDocument();
    expect(screen.getAllByText("CPGRAMS grievance preparation")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Review all actions" }));

    const reviewDialog = screen.getByRole("dialog", {
      name: "One review for every prepared action",
    });
    expect(within(reviewDialog).getByText(/Nothing is sent to a government service/i)).toBeInTheDocument();
    await user.click(within(reviewDialog).getByRole("button", { name: "Authorize 1 mock actions" }));

    expect(await screen.findByText("1 mock applications are now in your civic inbox.")).toBeInTheDocument();
    expect(screen.getByText("MOCK-RNI-TEST-0001")).toBeInTheDocument();
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
