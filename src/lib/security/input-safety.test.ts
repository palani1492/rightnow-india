import { describe, expect, it } from "vitest";

import { detectSensitiveInput } from "./input-safety";

describe("detectSensitiveInput", () => {
  it.each([
    ["my Aadhaar is 1234 5678 9012", "aadhaar"],
    ["PAN is ABCDE1234F", "pan"],
    ["OTP 918273", "otp"],
    ["account number 123456789012", "bank-account"],
    ["call me at 9876543210", "phone"],
    ["email me@example.com", "email"],
  ])("blocks identifier-shaped input", (message, kind) => {
    expect(detectSensitiveInput(message)).toEqual({ kind });
  });

  it("allows ordinary mission details and amounts", () => {
    expect(
      detectSensitiveInput("I lost my job and earned about 25000 rupees a month"),
    ).toBeNull();
  });
});
