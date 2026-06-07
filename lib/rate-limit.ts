import Redis from "ioredis";

/**
 * Fixed-window rate limiter backed by Redis (atomic INCR + EXPIRE) with an
 * in-process Map fallback when REDIS_URL is unset. The fallback is per-instance
 * only — adequate for dev and as a best-effort signal, not strict prod limiting.
 */

let _redis: Redis | null = null;
let _redisFailed = false;
const _mem = new Map<string, { count: number; expiresAt: number }>();

function client(): Redis | null {
  if (_redisFailed) return null;
  if (_redis) return _redis;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    _redis = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
    _redis.on("error", (err) => {
      console.warn("[rate-limit] Redis error, falling back to memory:", err.message);
      _redisFailed = true;
      _redis = null;
    });
    return _redis;
  } catch {
    _redisFailed = true;
    return null;
  }
}

export type RateLimitResult = {
  allowed: boolean;
  count: number;
  remaining: number;
  limit: number;
  /** Seconds until the window resets. */
  resetSec: number;
};

/**
 * Increment the counter for `key` and report whether it is within `limit`
 * over `windowSec`. The first request that crosses the limit returns
 * `allowed: false` so callers can block + alert exactly once per offender.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const namespaced = `zeroapi:rl:${key}`;
  const r = client();
  if (r) {
    try {
      const pipe = r.multi();
      pipe.incr(namespaced);
      pipe.ttl(namespaced);
      const res = await pipe.exec();
      const count = Number(res?.[0]?.[1] ?? 1);
      let ttl = Number(res?.[1]?.[1] ?? -1);
      if (count === 1 || ttl < 0) {
        await r.expire(namespaced, windowSec);
        ttl = windowSec;
      }
      return {
        allowed: count <= limit,
        count,
        remaining: Math.max(0, limit - count),
        limit,
        resetSec: ttl,
      };
    } catch {
      // fall through to memory
    }
  }

  const now = Date.now();
  const hit = _mem.get(namespaced);
  if (!hit || hit.expiresAt < now) {
    _mem.set(namespaced, { count: 1, expiresAt: now + windowSec * 1000 });
    return { allowed: 1 <= limit, count: 1, remaining: Math.max(0, limit - 1), limit, resetSec: windowSec };
  }
  hit.count += 1;
  return {
    allowed: hit.count <= limit,
    count: hit.count,
    remaining: Math.max(0, limit - hit.count),
    limit,
    resetSec: Math.ceil((hit.expiresAt - now) / 1000),
  };
}
