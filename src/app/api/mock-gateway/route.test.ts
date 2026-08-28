import { afterEach, describe, expect, it } from "vitest";

import { POST } from "./route";

const originalEnvironment = { ...process.env };
const testSigningMaterial = ["test-only", "mock", "gateway", "fixture", "material"].join("-");

afterEach(() => {
  process.env = { ...originalEnvironment };
});

function gatewayRequest(body: unknown, ip = crypto.randomUUID()): Request {
  return new Request("http://localhost/api/mock-gateway", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("POST /api/mock-gateway", () => {
  it("issues an expiring approval and creates clearly marked mock submissions", async () => {
    process.env.MOCK_GATEWAY_SECRET = testSigningMaterial;
    const actionIds = ["household-demo:pmmvy", "household-demo:jsy"];
    const approval = await POST(
      gatewayRequest({ operation: "prepare", actionIds }),
    );
    const approvalBody = (await approval.json()) as { approvalToken: string };

    expect(approval.status).toBe(200);
    expect(approvalBody.approvalToken).toBeTruthy();

    const submission = await POST(
      gatewayRequest({
        operation: "submit",
        actionIds,
        approvalToken: approvalBody.approvalToken,
      }),
    );
    const body = await submission.json();

    expect(submission.status).toBe(200);
    expect(body.submissions).toHaveLength(2);
    expect(body.submissions[0]).toMatchObject({
      actionId: "household-demo:pmmvy",
      status: "submitted",
    });
    expect(body.submissions[0].reference).toMatch(/^MOCK-RNI-/);
  });

  it("rejects unknown connector IDs and forged approval", async () => {
    process.env.MOCK_GATEWAY_SECRET = testSigningMaterial;
    const unknown = await POST(
      gatewayRequest({ operation: "prepare", actionIds: ["household-demo:passport"] }),
    );
    expect(unknown.status).toBe(400);

    const forged = await POST(
      gatewayRequest({
        operation: "submit",
        actionIds: ["household-demo:pmmvy"],
        approvalToken: "forged.token",
      }),
    );
    expect(forged.status).toBe(403);
  });

  it("rejects an oversized streamed body when content-length is absent", async () => {
    const request = new Request("http://localhost/api/mock-gateway", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": crypto.randomUUID() },
      body: JSON.stringify({ operation: "prepare", actionIds: ["x".repeat(17_000)] }),
    });
    request.headers.delete("content-length");

    const response = await POST(request);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "request-too-large" },
    });
  });
});
