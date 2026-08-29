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

  for (const answer of journey.answers) {
    await page.getByRole("button", { name: answer, exact: true }).click();
  }

  await expect(page.getByRole("button", { name: "Review your request" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /services? identified/ })).toBeVisible();
}

for (const journey of missionJourneys) {
  test(`${journey.title} reaches a reviewable service plan`, async ({ page }) => {
    await startFresh(page);
    await startMission(page, journey);
  });
}

test("preparing a request adds it to Your requests without a real submission", async ({ page }) => {
  await startFresh(page);
  await startMission(page, missionJourneys[5]);

  await page.getByRole("button", { name: "Review your request" }).click();
  const reviewDialog = page.getByRole("dialog", { name: "Review your request" });
  await expect(reviewDialog).toContainText(
    "Nothing is submitted to any government service or portal",
  );
  await expect(reviewDialog.getByRole("checkbox")).toBeChecked();
  await reviewDialog.getByRole("button", { name: /Prepare \d+ services?/ }).click();

  await expect(
    page.getByText("Added to Your requests. Continue to the official service when you're ready."),
  ).toBeVisible();
  await expect(page.getByText("Request prepared")).toBeVisible();
});

test("a robbery produces an immediate safety plan and a preparable police-support checklist", async ({ page }) => {
  await startFresh(page);
  await page.getByLabel("Tell us what changed").fill("Someone broke into my house");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByRole("heading", { name: "Your safety comes first" })).toBeVisible();
  await expect(page.getByText(/move somewhere safe if possible and call/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "1 service identified" })).toBeVisible();
  await page.getByRole("button", { name: "Review your request" }).click();
  await expect(page.getByRole("dialog", { name: "Review your request" })).toContainText(
    "Nothing is submitted to any government service or portal",
  );
});

test("an interstate move opens a reviewable address-change plan", async ({ page }) => {
  await startFresh(page);
  await page.getByLabel("Tell us what changed").fill("I am moving to a different state");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByRole("heading", { name: "4 services identified" })).toBeVisible();
  await expect(page.getByLabel("RightNow conversation").getByText("Aadhaar address-update preparation")).toBeVisible();
});

test("unclear needs stay in the conversation without exposing internal routing or provider language", async ({ page }) => {
  await startFresh(page);

  await page.getByLabel("Tell us what changed").fill("I need help renewing my passport");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByRole("heading", { name: "A plan for your situation" })).toBeVisible();
  await expect(page.getByText(/OpenCode|GPT-5\.6|Luna|AI provider|AI routing/)).toHaveCount(0);
});

test("sensitive identity input is rejected before it is read", async ({ page }) => {
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
  await expect(page.getByRole("button", { name: "Review your request" })).toHaveCount(0);
});

test("clear household deletes locally saved facts and requests", async ({ page }) => {
  await startFresh(page);
  await page.evaluate(([key]) => {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        profile: {
          id: "synthetic-household",
          displayName: "Your household",
          preferredLanguage: "en",
          facts: { lifeEvent: "college", state: "Tamil Nadu" },
          updatedAt: "2026-08-28T00:00:00.000Z",
        },
        inbox: [],
      }),
    );
  }, [STORAGE_KEY]);
  await page.reload();

  await expect(page.getByText("Tamil Nadu")).toBeVisible();
  await page.getByRole("button", { name: "Open household profile" }).click();
  await page.getByRole("button", { name: "Clear household" }).click();

  await expect(
    page.getByText("Facts you share appear here and can be reused across situations."),
  ).toBeVisible();
  await expect(
    page.getByText("Requests you prepare will appear here so you can continue and track them."),
  ).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(([key]) => {
        const value = window.localStorage.getItem(key);
        if (!value) return null;
        const parsed = JSON.parse(value) as {
          profile: { facts: object };
          inbox: unknown[];
        };
        return {
          facts: parsed.profile.facts,
          inbox: parsed.inbox,
        };
      }, [STORAGE_KEY]),
    )
    .toEqual({ facts: {}, inbox: [] });
});

test("pregnancy journey remains usable at a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startFresh(page);
  await startMission(page, missionJourneys[0]);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  const reviewButton = page.getByRole("button", { name: "Review your request" });
  await reviewButton.scrollIntoViewIfNeeded();
  await expect(reviewButton).toBeInViewport();
});
