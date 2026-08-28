import { expect, test, type Page } from "@playwright/test";

const STORAGE_KEY = "rightnow-india:household:v1";

type MissionJourney = {
  title: string;
  answers: readonly string[];
};

const missionJourneys: readonly MissionJourney[] = [
  {
    title: "Pregnancy or a new baby",
    answers: ["Tamil Nadu", "Urban", "First", "Baby was recently born", "Yes"],
  },
  {
    title: "Starting or continuing college",
    answers: ["Tamil Nadu", "Yes", "Undergraduate", "Lower range", "Yes"],
  },
  {
    title: "Starting work or earning remotely",
    answers: ["Tamil Nadu", "Salaried job", "₹3 to ₹8 lakh", "No", "Yes"],
  },
  {
    title: "Losing a job",
    answers: ["Tamil Nadu", "Not working", "Both", "Yes"],
  },
  {
    title: "Starting a small business",
    answers: ["Tamil Nadu", "Planning", "Services", "Under ₹20 lakh", "Yes", "Yes"],
  },
  {
    title: "Fixing a public-service problem",
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
  // Use one stable browser origin while Playwright waits on the loopback server.
  await page.goto("http://localhost:3000/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByRole("heading", { name: "Tell us what changed." })).toBeVisible();
}

async function startMission(page: Page, journey: MissionJourney): Promise<void> {
  await page.getByRole("button", { name: journey.title, exact: true }).click();

  const consentDialog = page.getByRole("dialog", {
    name: "Choose how RightNow understands you",
  });
  await expect(consentDialog).toContainText("Never enter identity numbers");
  await consentDialog.getByRole("button", { name: /Use private demo mode/i }).click();

  for (const answer of journey.answers) {
    await page.getByRole("button", { name: answer, exact: true }).click();
  }

  await expect(page.getByRole("button", { name: "Review all actions" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /actions, one review/ })).toBeVisible();
  await expect(page.getByText("Private deterministic interpretation")).toBeVisible();
}

for (const journey of missionJourneys) {
  test(`${journey.title} reaches a consolidated review in private demo mode`, async ({ page }) => {
    await startFresh(page);
    await startMission(page, journey);
  });
}

test("consolidated approval creates clearly marked mock submissions", async ({ page }) => {
  await startFresh(page);
  await startMission(page, missionJourneys[5]);

  await page.getByRole("button", { name: "Review all actions" }).click();
  const reviewDialog = page.getByRole("dialog", {
    name: "One review for every prepared action",
  });
  await expect(reviewDialog).toContainText("Nothing is sent to a government service");
  await expect(reviewDialog.getByRole("checkbox")).toBeChecked();
  await reviewDialog.getByRole("button", { name: /Authorize \d+ mock actions/ }).click();

  await expect(page.getByText(/mock applications are now in your civic inbox/)).toBeVisible();
  await expect(page.getByText(/MOCK-RNI-\d{4}-[A-F0-9]{8}/).first()).toBeVisible();
});

test("unsupported needs fall back honestly to official entry points", async ({ page }) => {
  await startFresh(page);

  await page.getByLabel("Tell us what changed").fill("I need help renewing my passport");
  await page.getByRole("button", { name: "Send message" }).click();
  await page
    .getByRole("dialog", { name: "Choose how RightNow understands you" })
    .getByRole("button", { name: /Use private demo mode/i })
    .click();

  await expect(page.getByText(/That need is not in this demo yet/)).toBeVisible();
  await expect(page.getByText(/official UMANG or myScheme/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Open official UMANG" })).toHaveAttribute(
    "href",
    "https://web.umang.gov.in/landing",
  );
  await expect(page.getByRole("link", { name: "Explore official myScheme" })).toHaveAttribute(
    "href",
    "https://www.myscheme.gov.in/",
  );
  await expect(page.getByText("Private deterministic interpretation")).toBeVisible();
});

test("sensitive identity input is rejected before mission interpretation", async ({ page }) => {
  await startFresh(page);

  await page
    .getByLabel("Tell us what changed")
    .fill("I lost my job and my Aadhaar is 1234 5678 9012");
  await page.getByRole("button", { name: "Send message" }).click();
  await page
    .getByRole("dialog", { name: "Choose how RightNow understands you" })
    .getByRole("button", { name: /Use private demo mode/i })
    .click();

  await expect(
    page.getByRole("alert").filter({ hasText: "Remove the aadhaar value" }),
  ).toBeVisible();
  await expect(page.getByText("Private deterministic interpretation")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Review all actions" })).toHaveCount(0);
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
    page.getByText("Prepared actions, mock references and future reminders will appear here."),
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
  const reviewButton = page.getByRole("button", { name: "Review all actions" });
  await reviewButton.scrollIntoViewIfNeeded();
  await expect(reviewButton).toBeInViewport();
});
