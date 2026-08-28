export type LimitedJsonResult =
  | Readonly<{ ok: true; value: unknown }>
  | Readonly<{ ok: false; reason: "invalid-json" | "too-large" }>;

export async function readLimitedJson(
  request: Request,
  maxBytes: number,
): Promise<LimitedJsonResult> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return { ok: false, reason: "too-large" };
  }

  if (!request.body) return { ok: false, reason: "invalid-json" };

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let jsonText = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { ok: false, reason: "too-large" };
      }
      jsonText += decoder.decode(value, { stream: true });
    }
    jsonText += decoder.decode();
    return { ok: true, value: JSON.parse(jsonText) as unknown };
  } catch {
    return { ok: false, reason: "invalid-json" };
  } finally {
    reader.releaseLock();
  }
}
