import { describe, expect, it } from "vitest";

import { deterministicInterpretation } from "./fallback";

describe("deterministicInterpretation", () => {
  it.each([
    ["I am pregnant and need help", "pregnancy", "en"],
    ["मेरी नौकरी चली गई है", "job-loss", "hi"],
    ["எனக்கு கல்லூரி உதவித்தொகை வேண்டும்", "college", "ta"],
    ["I want to start a small shop", "business", "en"],
    ["मुझे सरकारी सेवा की शिकायत करनी है", "grievance", "hi"],
    ["I started freelancing from home", "work", "en"],
    ["I started earning", "work", "en"],
    ["Someone broke into my house", "safety", "en"],
    ["I am moving to a different state", "moving", "en"],
  ])("maps a multilingual message", (message, missionId, language) => {
    expect(deterministicInterpretation(message)).toMatchObject({
      missionId,
      language,
      mode: "fallback",
    });
  });

  it("builds a safe generic simulation when no accelerator matches", () => {
    const result = deterministicInterpretation("Help me renew a fishing permit");

    expect(result.missionId).toBeNull();
    expect(result.reply).toContain("reviewable simulation plan");
    expect(result.casePlan?.steps).toHaveLength(3);
    expect(result.reply).not.toContain("demo");
  });

  it("does not mistake a move between cities for an interstate move", () => {
    const result = deterministicInterpretation(
      "I moved from Chennai to Coimbatore last week",
    );

    expect(result.missionId).toBeNull();
    expect(result.casePlan?.title).toBe("Your situation plan");
    expect(result.reply).not.toContain("interstate");
  });
});
