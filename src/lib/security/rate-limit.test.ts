import { describe, expect, it } from "vitest";

import { MemoryRateLimiter } from "./rate-limit";

describe("MemoryRateLimiter", () => {
  it("limits repeated requests inside a window and resets afterward", () => {
    const limiter = new MemoryRateLimiter({ limit: 2, windowMs: 1_000 });

    expect(limiter.check("visitor", 0).allowed).toBe(true);
    expect(limiter.check("visitor", 100).allowed).toBe(true);
    expect(limiter.check("visitor", 200)).toMatchObject({
      allowed: false,
      retryAfterSeconds: 1,
    });
    expect(limiter.check("visitor", 1_001).allowed).toBe(true);
  });
});
