import { expect, test, type Page } from "@playwright/test";

const STORAGE_KEY = "rightnow-india:household:v1";

type MissionJourney = {
  title: string;
  prompt: string;
  answers: readonly string[];
};

const missionJourneys: readonly MissionJourney[] = [
  {
    title: "Pregnancy or a new baby",
    prompt: "I am expecting a child",
    answers: ["Tamil Nadu", "Urban", "First", "Baby was recently born", "Yes"],
  },
  {
    title: "Starting or continuing college",
    prompt: "I am starting college",
    answers: ["Tamil Nadu", "Yes", "Undergraduate", "Lower range", "Yes"],
  },
  {
    title: "Starting work or earning remotely",
    prompt: "I started earning",
    answers: ["Tamil Nadu", "Salaried job", "₹3 to ₹8 lakh", "No", "Yes"],
  },
  {
    title: "Losing a job",
    prompt: "I lost my job",
    answers: ["Tamil Nadu", "Not working", "Both", "Yes"],
  },
  {
    title: "Starting a small business",
    prompt: "I want to start a shop",
    answers: ["Tamil Nadu", "Planning", "Services", "Under ₹20 lakh", "Yes", "Yes"],
  },
  {
    title: "Fixing a public-service problem",
    prompt: "I have a public service problem",
    answers: ["Government or public service", "Yes"],
  },
] as const;

async function startFresh(page: Page): Promise<void> {
  // Parallel browser projects represent different citizen sessions. Give each
  // one a distinct client key so the production rate limiter is not shared by
  // unrelated E2E cases.
  await page.context().setExtraHTTPHeaders({
    "x-forwarded-for": `e2e-${Date.now()}-${Math.random()}`,
  });
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Whatever changed, start here",
    }),
  ).toBeVisible();
}

async function startMission(page: Page, journey: MissionJourney): Promise<void> {
  await page.getByLabel("Tell us what changed").fill(journey.prompt);
  await page.getByRole("button", { name: "Send message" }).click();
  await page.getByRole("button", { name: "Use guided mode" }).click();

  for (const answer of journey.answers) {
    await page.getByRole("button", { name: answer, exact: true }).click();
  }

  await expect(page.getByRole("button", { name: "Review your plan" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /services? ready to simulate/ })).toBeVisible();
}

for (const journey of missionJourneys) {
  test(`${journey.title} reaches a simulated service plan`, async ({ page }) => {
    await startFresh(page);
    await startMission(page, journey);
  });
}

test("approval records an explicit simulation without a real submission", async ({ page }) => {
  await startFresh(page);
  await startMission(page, missionJourneys[5]);

  await page.getByRole("button", { name: "Review your plan" }).click();
  const reviewDialog = page.getByRole("dialog", { name: "Review your plan" });
  await expect(reviewDialog).toContainText(
    "Nothing is submitted to any government service or portal",
  );
  await expect(reviewDialog.getByRole("checkbox")).toBeChecked();
  await reviewDialog.getByRole("button", { name: /Simulate \d+ next steps?/ }).click();

  await expect(page.getByText("Your simulated plan is now in your civic inbox. Nothing was sent.")).toBeVisible();
  await expect(page.getByText("Simulation recorded")).toBeVisible();
});

test("a robbery produces immediate safety guidance and a simulated police-support plan", async ({ page }) => {
  await startFresh(page);
  await page.getByLabel("Tell us what changed").fill("Someone broke into my house");
  await page.getByRole("button", { name: "Send message" }).click();
  await page.getByRole("button", { name: "Use guided mode" }).click();

  await expect(page.getByRole("heading", { name: "Immediate support plan" })).toBeVisible();
  await expect(page.getByText(/If anyone may still be in danger, call 112 now/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "1 service ready to simulate" })).toBeVisible();
  await page.getByRole("button", { name: "Review your plan" }).click();
  await expect(page.getByRole("dialog", { name: "Review your plan" })).toContainText(
    "Nothing is submitted to any government service or portal",
  );
  await expect(page.getByRole("dialog", { name: "Review your plan" })).not.toContainText(
    "Emergency 112 support preparation",
  );
});

test("an interstate move opens a reviewable simulated address-change plan", async ({ page }) => {
  await startFresh(page);
  await page.getByLabel("Tell us what changed").fill("I am moving to a different state");
  await page.getByRole("button", { name: "Send message" }).click();
  await page.getByRole("button", { name: "Use guided mode" }).click();

  await expect(page.getByRole("heading", { name: "4 services ready to simulate" })).toBeVisible();
  await expect(page.getByLabel("RightNow conversation").getByText("Aadhaar address-update preparation")).toBeVisible();
  await expect(page.getByText(/This service is not included in the current demo/)).toHaveCount(0);
});

test("unclear needs stay in the conversation without exposing prototype-scope language", async ({ page }) => {
  await startFresh(page);

  await page.getByLabel("Tell us what changed").fill("I need help renewing my passport");
  await page.getByRole("button", { name: "Send message" }).click();
  await page.getByRole("button", { name: "Always use AI routing" }).click();

  await expect(page.getByRole("heading", { name: "Your situation plan" })).toBeVisible();
  await expect(page.getByText(/This service is not included in the current demo/)).toHaveCount(0);
  await expect(page.getByText(/OpenCode|GPT-5\.6|Luna|AI provider/)).toHaveCount(0);
});

test("sensitive identity input is rejected before mission interpretation", async ({ page }) => {
  await startFresh(page);

  const sensitiveMessage = "I lost my job and my Aadhaar is 1234 5678 9012";
  await page
    .getByLabel("Tell us what changed")
    .fill(sensitiveMessage);
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "Remove the aadhaar value" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("RightNow conversation").getByText(sensitiveMessage, { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Review your plan" })).toHaveCount(0);
});

test("clear household deletes locally saved facts, inbox and consent", async ({ page }) => {
  await startFresh(page);
  await page.evaluate(([key]) => {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        profile: {
          id: "synthetic-household",
          displayName: "Demo household",
          preferredLanguage: "en",
          facts: { lifeEvent: "college", state: "Tamil Nadu" },
          updatedAt: "2026-08-28T00:00:00.000Z",
        },
        inbox: [],
        aiConsent: false,
      }),
    );
  }, [STORAGE_KEY]);
  await page.reload();

  await expect(page.getByText("Tamil Nadu")).toBeVisible();
  await page.getByRole("button", { name: "Open household profile" }).click();
  await page.getByRole("button", { name: "Clear household" }).click();

  await expect(
    page.getByText("Facts you share appear here and can be reused across missions."),
  ).toBeVisible();
  await expect(
    page.getByText("Plans you approve will appear here as simulations."),
  ).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(([key]) => {
        const value = window.localStorage.getItem(key);
        if (!value) return null;
        const parsed = JSON.parse(value) as {
          profile: { facts: object };
          inbox: unknown[];
          aiConsent: boolean | null;
        };
        return {
          facts: parsed.profile.facts,
          inbox: parsed.inbox,
          aiConsent: parsed.aiConsent,
        };
      }, [STORAGE_KEY]),
    )
    .toEqual({ facts: {}, inbox: [], aiConsent: null });
});

test("pregnancy journey remains usable at a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startFresh(page);
  await startMission(page, missionJourneys[0]);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  const reviewButton = page.getByRole("button", { name: "Review your plan" });
  await reviewButton.scrollIntoViewIfNeeded();
  await expect(reviewButton).toBeInViewport();
});
