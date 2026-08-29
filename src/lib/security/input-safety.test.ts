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
    ["passport number A1234567", "passport"],
    ["EPIC ABC1234567", "voter-id"],
    ["driving licence DL0420110149646", "driving-licence"],
    ["UAN 100123456789", "uan"],
    ["ESIC insurance number 1234567890", "esic"],
  ])("blocks identifier-shaped input", (message, kind) => {
    expect(detectSensitiveInput(message)).toEqual({ kind });
  });

  it("allows ordinary mission details and amounts", () => {
    expect(
      detectSensitiveInput("I lost my job and earned about 25000 rupees a month"),
    ).toBeNull();
  });

  it("does not treat an unlabeled reference-shaped string as a passport number", () => {
    expect(detectSensitiveInput("My reference is A1234567")).toBeNull();
  });
});
