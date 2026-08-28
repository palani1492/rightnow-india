import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
  vi.restoreAllMocks();
});

function agentRequest(body: unknown, ip = crypto.randomUUID()): Request {
  return new Request("http://localhost/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("POST /api/agent", () => {
  it("uses the private deterministic interpreter when consent is declined", async () => {
    const response = await POST(
      agentRequest({ message: "I lost my job yesterday", aiConsent: false }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      missionId: "job-loss",
      mode: "fallback",
      fallbackReason: "consent-declined",
    });
  });

  it("rejects sensitive identifiers before a provider can receive them", async () => {
    process.env.AI_API_KEY = "never-used";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await POST(
      agentRequest({ message: "PAN ABCDE1234F", aiConsent: true }),
    );

    expect(response.status).toBe(422);
    expect(fetchSpy).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "sensitive-input" },
    });
  });

  it("falls back when the provider output is malformed", async () => {
    process.env.AI_PROVIDER = "opencode-go";
    process.env.AI_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ output: [] }));

    const response = await POST(
      agentRequest({ message: "I am pregnant", aiConsent: true }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      missionId: "pregnancy",
      mode: "fallback",
      fallbackReason: "invalid-output",
    });
  });

  it("rejects malformed or unknown request fields", async () => {
    const response = await POST(
      agentRequest({ message: "hello", aiConsent: false, missionId: "made-up" }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects an oversized streamed body when content-length is absent", async () => {
    const body = JSON.stringify({
      message: `I am pregnant ${"x".repeat(17_000)}`,
      aiConsent: false,
    });
    const request = new Request("http://localhost/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": crypto.randomUUID() },
      body,
    });
    request.headers.delete("content-length");

    const response = await POST(request);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "request-too-large" },
    });
  });
});
