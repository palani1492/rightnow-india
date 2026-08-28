type RateLimitEntry = Readonly<{ count: number; resetAt: number }>;

export type RateLimitResult = Readonly<{
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}>;

export class MemoryRateLimiter {
  readonly #entries = new Map<string, RateLimitEntry>();
  readonly #limit: number;
  readonly #windowMs: number;

  constructor(options: Readonly<{ limit: number; windowMs: number }>) {
    this.#limit = options.limit;
    this.#windowMs = options.windowMs;
  }

  check(key: string, now = Date.now()): RateLimitResult {
    const current = this.#entries.get(key);
    if (!current || now >= current.resetAt) {
      this.#entries.set(key, { count: 1, resetAt: now + this.#windowMs });
      return {
        allowed: true,
        remaining: Math.max(0, this.#limit - 1),
        retryAfterSeconds: 0,
      };
    }

    if (current.count >= this.#limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
      };
    }

    const next = { ...current, count: current.count + 1 };
    this.#entries.set(key, next);
    return {
      allowed: true,
      remaining: Math.max(0, this.#limit - next.count),
      retryAfterSeconds: 0,
    };
  }
}

export function requestClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local-demo";
}
