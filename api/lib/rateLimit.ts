import { AppError } from "./errors.js";

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

/** Best-effort per-isolate limiter (serverless-friendly baseline; upgrade to Redis for strict global limits). */
export function checkRateLimit(
  key: string,
  opts: { windowMs: number; max: number; message?: string }
): void {
  const now = Date.now();
  let b = store.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + opts.windowMs };
    store.set(key, b);
  }
  b.count += 1;
  if (b.count > opts.max) {
    throw new AppError(
      "RATE_LIMITED",
      opts.message ?? "Too many requests",
      429
    );
  }
  if (store.size > 50_000) {
    for (const [k, v] of store) {
      if (now >= v.resetAt) store.delete(k);
    }
  }
}
