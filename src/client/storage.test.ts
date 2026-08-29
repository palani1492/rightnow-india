import { describe, expect, it, vi } from "vitest";
import { clearHousehold, createEmptyHousehold, loadHousehold, saveHousehold, STORAGE_KEY } from "./storage";

describe("household storage", () => {
  it("returns an empty household when storage is missing or corrupt", () => {
    expect(loadHousehold({ getItem: () => null }).profile.id).toBe("synthetic-household");
    expect(loadHousehold({ getItem: () => "not-json" }).inbox).toEqual([]);
  });

  it("round trips a valid household", () => {
    let value = "";
    const base = createEmptyHousehold("2026-08-28T10:00:00.000Z");
    const household = {
      ...base,
      profile: { ...base.profile, facts: { state: "Tamil Nadu" } },
    };
    saveHousehold({ setItem: (_key, next) => { value = next; } }, household);
    expect(loadHousehold({ getItem: () => value }).profile.facts.state).toBe("Tamil Nadu");
  });

  it("removes all local household state", () => {
    const removeItem = vi.fn();
    const next = clearHousehold({ removeItem });
    expect(removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(next.profile.facts).toEqual({});
    expect(next.inbox).toEqual([]);
  });

  it("migrates a household saved before the aiConsent field was removed", () => {
    const base = createEmptyHousehold("2026-08-28T10:00:00.000Z");
    const legacy = JSON.stringify({
      ...base,
      profile: { ...base.profile, facts: { state: "Tamil Nadu" } },
      aiConsent: false,
    });

    const loaded = loadHousehold({ getItem: () => legacy });
    expect(loaded.profile.facts.state).toBe("Tamil Nadu");
    expect(loaded).not.toHaveProperty("aiConsent");
  });

  it("drops household state with a malformed inbox item", () => {
    const household = createEmptyHousehold("2026-08-28T10:00:00.000Z");
    const corrupted = JSON.stringify({
      ...household,
      inbox: [{ id: "synthetic-household:pmmvy", status: "submitted" }],
    });

    expect(loadHousehold({ getItem: () => corrupted }).inbox).toEqual([]);
  });
});
