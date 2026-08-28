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
  ])("maps a multilingual message", (message, missionId, language) => {
    expect(deterministicInterpretation(message)).toMatchObject({
      missionId,
      language,
      mode: "fallback",
    });
  });

  it("uses an honest unsupported response", () => {
    const result = deterministicInterpretation("Help me renew a fishing permit");

    expect(result.missionId).toBeNull();
    expect(result.reply).toContain("not in this demo yet");
  });
});
