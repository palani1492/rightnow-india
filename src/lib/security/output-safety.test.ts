import { describe, expect, it } from "vitest";

import { hasUnsafeGeneratedPlan } from "./output-safety";

const safePlan = {
  title: "Passport renewal preparation",
  summary: "A mock checklist to help you review what to do next.",
  steps: [
    {
      title: "Clarify the request",
      description: "Confirm the type of renewal and list non-sensitive questions to verify.",
    },
    {
      title: "Check an official source",
      description: "Find the responsible authority and verify the current process yourself.",
    },
  ],
};

describe("hasUnsafeGeneratedPlan", () => {
  it("allows a neutral, explicitly preparatory plan", () => {
    expect(hasUnsafeGeneratedPlan(safePlan)).toBe(false);
  });

  it.each([
    ["claims eligibility", { ...safePlan, summary: "You are eligible and approved." }],
    ["claims submission", { ...safePlan, summary: "Your application was submitted." }],
    ["invents a fee", { ...safePlan, summary: "Pay INR 500 to continue." }],
    ["invents a deadline", { ...safePlan, summary: "The deadline is tomorrow." }],
    ["returns a link", { ...safePlan, summary: "Use https://example.com/apply." }],
    ["returns an identifier", { ...safePlan, summary: "Use passport number A1234567." }],
    ["gives a medicine dose", { ...safePlan, summary: "Take a 500 mg dose of this medicine." }],
    ["gives a legal conclusion", { ...safePlan, summary: "You should sue because the law requires payment." }],
    ["gives investment advice", { ...safePlan, summary: "Buy this crypto investment today." }],
    ["gives a diagnosis", { ...safePlan, summary: "Your diagnosis is diabetes." }],
  ])("rejects generated content that %s", (_label, plan) => {
    expect(hasUnsafeGeneratedPlan(plan)).toBe(true);
  });
});
