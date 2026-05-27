import { headers as nextHeaders } from "next/headers";
import type { Plan } from "@prisma/client";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { dailyLimitFor, nextPlanFor } from "./plans";

/**
 * Rate limiting — protects expensive endpoints (LLM, deploys) before public
 * launch.
 *
 * Two layers stacked per request :
 *   1. **Per-IP** : a coarse spam guard (10 req/min by default) on every hit.
 *   2. **Per-user/day** : the plan quota (FREE 3 · PRO 50 · BUSINESS 500).
 *
 * Both are backed by Upstash Redis when `UPSTASH_REDIS_REST_URL` is set; in
 * dev / CI we fall back to an in-process Map. The fallback is *not*
 * coherent across instances — Upstash is mandatory in prod, as documented
 * in `.env.production.example`.
 */

// ──────────────────────────── Upstash bootstrap ─────────────────────────────

let _redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    _redis = null;
    return null;
  }
  try {
    _redis = new Redis({ url, token });
  } catch {
    _redis = null;
  }
  return _redis;
}

// ──────────────────────────── In-memory fallback ────────────────────────────

type Bucket = { count: number; resetAt: number };
const _mem = new Map<string, Bucket>();

function memHit(key: string, limit: number, windowMs: number): RateLimitVerdict {
  const now = Date.now();
  const hit = _mem.get(key);
  if (!hit || hit.resetAt <= now) {
    const resetAt = now + windowMs;
    _mem.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt, retryAfterSec: 0 };
  }
  hit.count += 1;
  const ok = hit.count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - hit.count),
    resetAt: hit.resetAt,
    retryAfterSec: ok ? 0 : Math.max(1, Math.ceil((hit.resetAt - now) / 1000)),
  };
}

// ──────────────────────────── Public API ────────────────────────────────────

export type RateLimitVerdict = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
};

export type RateLimitScope =
  | "generate-ip"
  | "generate-user"
  | "generate-daily"
  | "deploy-user"
  | "regenerate-user";

const limiterCache = new Map<string, Ratelimit>();

/**
 * Build (and cache) an Upstash sliding-window limiter for a given (scope,
 * limit, window) combo. We cache by signature so a single user-call site
 * always re-uses the same Ratelimit instance.
 */
function getUpstashLimiter(
  scope: RateLimitScope,
  limit: number,
  windowSec: number,
): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const key = `${scope}:${limit}:${windowSec}`;
  let limiter = limiterCache.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      analytics: false,
      prefix: `zeroapi:rl:${scope}`,
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
    });
    limiterCache.set(key, limiter);
  }
  return limiter;
}

export type CheckOptions = {
  scope: RateLimitScope;
  identifier: string;
  limit: number;
  windowSec: number;
};

export async function checkRateLimit(opts: CheckOptions): Promise<RateLimitVerdict> {
  const limiter = getUpstashLimiter(opts.scope, opts.limit, opts.windowSec);
  if (limiter) {
    try {
      const res = await limiter.limit(opts.identifier);
      const now = Date.now();
      return {
        ok: res.success,
        remaining: res.remaining,
        resetAt: res.reset,
        retryAfterSec: res.success ? 0 : Math.max(1, Math.ceil((res.reset - now) / 1000)),
      };
    } catch {
      // Upstash hiccup → degrade to memory rather than 500 the request.
    }
  }
  const memKey = `${opts.scope}:${opts.identifier}`;
  return memHit(memKey, opts.limit, opts.windowSec * 1000);
}

// ──────────────────────────── Convenience helpers ───────────────────────────

const DEFAULT_IP_LIMIT = parseInt(process.env.RATE_LIMIT_IP_PER_MIN ?? "10", 10);

/** Extract the caller IP from forwarded headers, falling back to "unknown". */
export function clientIp(): string {
  const h = nextHeaders();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Stack the per-IP guard and the per-user daily quota for any generation
 * endpoint (chat, spec generation, regenerate, conversation messages).
 *
 * Returns `null` when the request can proceed, or a structured 429 verdict
 * the caller must surface (the helper `denyResponse` builds the matching
 * `Response`).
 */
export async function checkGenerationLimits(args: {
  userId: string;
  plan: Plan;
  ip: string;
  /** When true, this hit counts against the user's daily quota. */
  consumesDailyQuota?: boolean;
}): Promise<DenyVerdict | null> {
  const ip = await checkRateLimit({
    scope: "generate-ip",
    identifier: args.ip,
    limit: DEFAULT_IP_LIMIT,
    windowSec: 60,
  });
  if (!ip.ok) {
    return {
      kind: "ip",
      verdict: ip,
      message: "Trop de requêtes depuis ton réseau. Réessaie dans un instant.",
    };
  }

  if (args.consumesDailyQuota) {
    const dailyLimit = dailyLimitFor(args.plan);
    const daily = await checkRateLimit({
      scope: "generate-daily",
      identifier: args.userId,
      limit: dailyLimit,
      windowSec: 24 * 60 * 60,
    });
    if (!daily.ok) {
      const upgrade = nextPlanFor(args.plan);
      return {
        kind: "daily",
        verdict: daily,
        message: upgrade
          ? `Limite quotidienne atteinte (${dailyLimit} générations/jour sur le plan ${args.plan}). Passe en ${upgrade} pour en obtenir plus.`
          : `Limite quotidienne atteinte (${dailyLimit} générations/jour sur le plan ${args.plan}).`,
        upgradeTo: upgrade,
      };
    }
  }

  return null;
}

/**
 * Lighter check for endpoints that aren't generations but still need spam
 * protection (deploy, regenerate trigger, conversation chat without spec).
 */
export async function checkUserActionLimit(args: {
  userId: string;
  ip: string;
  scope: Exclude<RateLimitScope, "generate-ip" | "generate-daily">;
  limit: number;
  windowSec: number;
}): Promise<DenyVerdict | null> {
  const ip = await checkRateLimit({
    scope: "generate-ip",
    identifier: args.ip,
    limit: DEFAULT_IP_LIMIT,
    windowSec: 60,
  });
  if (!ip.ok) {
    return {
      kind: "ip",
      verdict: ip,
      message: "Trop de requêtes depuis ton réseau. Réessaie dans un instant.",
    };
  }
  const user = await checkRateLimit({
    scope: args.scope,
    identifier: args.userId,
    limit: args.limit,
    windowSec: args.windowSec,
  });
  if (!user.ok) {
    return {
      kind: "user",
      verdict: user,
      message: "Trop de requêtes — patiente quelques secondes avant de réessayer.",
    };
  }
  return null;
}

export type DenyVerdict = {
  kind: "ip" | "user" | "daily";
  verdict: RateLimitVerdict;
  message: string;
  upgradeTo?: import("@prisma/client").Plan | null;
};

/**
 * Build the standard 429 JSON response for the API routes. Sets `Retry-After`
 * + `X-RateLimit-*` headers so the client can render a precise countdown.
 */
export function denyResponse(deny: DenyVerdict): Response {
  return new Response(
    JSON.stringify({
      error: deny.message,
      code: deny.kind === "daily" ? "DAILY_LIMIT" : "RATE_LIMIT",
      retryAfter: deny.verdict.retryAfterSec,
      resetAt: deny.verdict.resetAt,
      upgradeTo: deny.upgradeTo ?? null,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(deny.verdict.retryAfterSec),
        "X-RateLimit-Remaining": String(deny.verdict.remaining),
        "X-RateLimit-Reset": String(deny.verdict.resetAt),
      },
    },
  );
}
