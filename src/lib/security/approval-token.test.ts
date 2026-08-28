import { describe, expect, it } from "vitest";

import { createApprovalToken, verifyApprovalToken } from "./approval-token";

describe("approval tokens", () => {
  const testSigningMaterial = ["test-only", "mock", "approval", "fixture", "material"].join("-");

  it("authorizes only the reviewed actions before expiry", () => {
    const token = createApprovalToken(["pmmvy", "jsy"], testSigningMaterial, 1_000, 60_000);

    expect(verifyApprovalToken(token, ["jsy", "pmmvy"], testSigningMaterial, 2_000)).toBe(true);
    expect(verifyApprovalToken(token, ["pmmvy"], testSigningMaterial, 2_000)).toBe(false);
    expect(verifyApprovalToken(token, ["pmmvy", "jsy"], testSigningMaterial, 61_001)).toBe(
      false,
    );
  });

  it("rejects a tampered token", () => {
    const token = createApprovalToken(["pmmvy"], testSigningMaterial, 1_000, 60_000);
    expect(verifyApprovalToken(`${token}x`, ["pmmvy"], testSigningMaterial, 2_000)).toBe(false);
  });
});
