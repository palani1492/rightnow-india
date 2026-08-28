import { afterEach, describe, expect, it, vi } from "vitest";

import { callOpenCodeAgent } from "./provider";

afterEach(() => vi.restoreAllMocks());

describe("callOpenCodeAgent", () => {
  it("uses the Responses endpoint, store false, and validates structured output", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    language: "en",
                    missionId: "business",
                    confidence: 0.94,
                    facts: [{ key: "businessStage", value: "planning" }],
                    reply: "You are eligible and I submitted everything.",
                  }),
                },
              ],
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await callOpenCodeAgent(
      { message: "I want to open a shop", locale: "en" },
      {
        apiKey: "test-key",
        baseUrl: "https://opencode.ai/zen/go/v1/",
        model: "gpt-5.6-luna",
        fetchImpl,
      },
    );
    expect(result).toMatchObject({
      missionId: "business",
      mode: "model",
      facts: expect.arrayContaining([
        { key: "businessStage", value: "planning" },
        { key: "lifeEvent", value: "business" },
      ]),
    });
    expect(result.reply).not.toMatch(/eligible|submitted/i);

    const [url, request] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://opencode.ai/zen/go/v1/responses");
    expect(request.headers).toMatchObject({ Authorization: "Bearer test-key" });
    expect(JSON.parse(String(request.body))).toMatchObject({
      model: "gpt-5.6-luna",
      store: false,
      text: { format: { type: "json_schema", strict: true } },
    });
  });

  it("rejects unknown model conclusions", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      Response.json({
        output_text: JSON.stringify({
          language: "en",
          missionId: "passport",
          confidence: 1,
          facts: [],
          reply: "Submitting it now.",
        }),
      }),
    );

    await expect(
      callOpenCodeAgent(
        { message: "passport", locale: "en" },
        { apiKey: "test", fetchImpl },
      ),
    ).rejects.toMatchObject({ code: "invalid-output" });
  });

  it("rejects fact values outside the deterministic catalog vocabulary", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      Response.json({
        output_text: JSON.stringify({
          language: "en",
          missionId: "business",
          confidence: 0.9,
          facts: [{ key: "businessStage", value: "idea" }],
          reply: "Business mission found.",
        }),
      }),
    );

    await expect(
      callOpenCodeAgent(
        { message: "I have a business idea", locale: "en" },
        { apiKey: "test", fetchImpl },
      ),
    ).rejects.toMatchObject({ code: "invalid-output" });
  });

  it("classifies an aborted request as a timeout", async () => {
    const fetchImpl = vi.fn((_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      }),
    ) as unknown as typeof fetch;

    await expect(
      callOpenCodeAgent(
        { message: "I am pregnant", locale: "en" },
        { apiKey: "test", fetchImpl, timeoutMs: 1 },
      ),
    ).rejects.toMatchObject({ code: "timeout" });
  });

  it("rejects malformed JSON and facts from another mission", async () => {
    const malformedFetch = vi.fn().mockResolvedValue(new Response("{", { status: 200 }));
    await expect(
      callOpenCodeAgent(
        { message: "I lost my job", locale: "en" },
        { apiKey: "test", fetchImpl: malformedFetch },
      ),
    ).rejects.toMatchObject({ code: "invalid-output" });

    const crossMissionFetch = vi.fn().mockResolvedValue(
      Response.json({
        output_text: JSON.stringify({
          language: "en",
          missionId: "college",
          confidence: 0.8,
          facts: [{ key: "businessStage", value: "planning" }],
          reply: "College mission found.",
        }),
      }),
    );
    await expect(
      callOpenCodeAgent(
        { message: "I am joining college", locale: "en" },
        { apiKey: "test", fetchImpl: crossMissionFetch },
      ),
    ).rejects.toMatchObject({ code: "invalid-output" });
  });

  it("rejects an AI base URL outside the configured OpenCode Go origin", async () => {
    const fetchImpl = vi.fn();

    await expect(
      callOpenCodeAgent(
        { message: "I am pregnant", locale: "en" },
        {
          apiKey: "test",
          baseUrl: "https://example.invalid/collect",
          fetchImpl,
        },
      ),
    ).rejects.toMatchObject({ code: "provider-error" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
