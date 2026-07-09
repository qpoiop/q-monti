/**
 * Per-key sliding-window rate limiter, stored on the `index` Room DO's
 * storage. We use the DO instead of KV to keep the repo dependency-free —
 * a production deployment should swap this for a Cloudflare Rate Limiting
 * rule at the edge OR a KV-backed limiter (cheaper reads).
 *
 * Costs:
 *   - Buckets are periodic (60s windows) with only two windows per key kept
 *     so writes and storage stay bounded.
 *   - Keys are truncated/hashed to avoid unbounded growth.
 */

export interface LimitRule {
  key: string; // stable key (e.g. "ip:1.2.3.4|op:newRoom")
  limit: number; // max requests per window
  windowSec: number; // window length
}

export interface LimitDecision {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
}

interface Bucket {
  count: number;
  bucketStart: number; // ms
}

const STORAGE_KEY = "rl";

export async function rateLimit(
  storage: DurableObjectStorage,
  rule: LimitRule
): Promise<LimitDecision> {
  const now = Date.now();
  const winMs = rule.windowSec * 1000;
  const start = Math.floor(now / winMs) * winMs;
  const table =
    (await storage.get<Record<string, Bucket>>(STORAGE_KEY)) ?? {};
  let bucket = table[rule.key];
  if (!bucket || bucket.bucketStart !== start) {
    bucket = { count: 0, bucketStart: start };
  }
  bucket.count += 1;
  table[rule.key] = bucket;
  // Occasional GC — drop buckets older than 2 windows.
  if (Math.random() < 0.05) {
    for (const [k, v] of Object.entries(table)) {
      if (now - v.bucketStart > winMs * 2) delete table[k];
    }
  }
  await storage.put(STORAGE_KEY, table);
  const allowed = bucket.count <= rule.limit;
  return {
    allowed,
    remaining: Math.max(0, rule.limit - bucket.count),
    resetInMs: start + winMs - now,
  };
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    "0.0.0.0"
  );
}
