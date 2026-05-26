import type { Plan } from "@prisma/client";
import { prisma } from "./prisma";
import { cacheDel, cacheGet, cacheSet } from "./cache";
import { isProviderId, PROVIDER_IDS, type ProviderId } from "./ai-providers";

export const ROUTING_TASKS = ["conversation", "spec_generation"] as const;
export type RoutingTask = (typeof ROUTING_TASKS)[number];
export const ROUTING_PLANS: Plan[] = ["FREE", "STARTER", "PRO", "BUSINESS"];

const CACHE_KEY = "zeroapi:llm-routing:v1";
const CACHE_TTL = 60 * 5;

/**
 * Hardcoded fallback used when the DB has no entry for a (plan, task) pair
 * (or when the DB itself is unreachable). FREE → Mistral/Gemini, PRO → Claude.
 * The list is the routing **preference order** — `routeLLM` will try the
 * first enabled provider, falling back to the next on error.
 */
export const FALLBACK_ROUTING: Record<Plan, Record<RoutingTask, ProviderId[]>> = {
  FREE: {
    conversation: ["mistral", "gemini", "groq", "anthropic"],
    spec_generation: ["gemini", "mistral", "groq", "anthropic"],
  },
  STARTER: {
    conversation: ["mistral", "groq", "anthropic", "gemini"],
    spec_generation: ["anthropic", "gemini", "mistral", "groq"],
  },
  PRO: {
    conversation: ["anthropic", "mistral", "gemini", "groq"],
    spec_generation: ["anthropic", "gemini", "mistral", "groq"],
  },
  BUSINESS: {
    conversation: ["anthropic", "mistral", "gemini", "groq"],
    spec_generation: ["anthropic", "gemini", "mistral", "groq"],
  },
};

export type ResolvedRouting = Record<Plan, Record<RoutingTask, ProviderId[]>>;

/**
 * Returns the effective routing matrix : DB overrides per (plan, task)
 * promoted to first position, with the hardcoded fallback list appended
 * so a failing provider always has alternatives to try. 5-minute cache
 * via lib/cache.ts (Redis if available, in-memory otherwise).
 */
export async function loadResolvedRouting(): Promise<ResolvedRouting> {
  const cached = await cacheGet(CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached) as ResolvedRouting;
    } catch {
      // fall through
    }
  }

  const rows = await prisma.lLMRoutingConfig
    .findMany()
    .catch(() => [] as Awaited<ReturnType<typeof prisma.lLMRoutingConfig.findMany>>);

  const out: ResolvedRouting = clone(FALLBACK_ROUTING);
  for (const row of rows) {
    if (!ROUTING_TASKS.includes(row.task as RoutingTask)) continue;
    if (!isProviderId(row.provider)) continue;
    const fallback = FALLBACK_ROUTING[row.plan][row.task as RoutingTask];
    const ordered = [
      row.provider,
      ...fallback.filter((p) => p !== row.provider),
    ];
    out[row.plan][row.task as RoutingTask] = ordered;
  }

  await cacheSet(CACHE_KEY, JSON.stringify(out), CACHE_TTL);
  return out;
}

/**
 * Returns the admin matrix : just the *primary* provider for each
 * (plan, task) pair, or null if no DB override exists.
 */
export async function listRoutingForAdmin(): Promise<
  Record<Plan, Record<RoutingTask, { current: ProviderId | null; fallback: ProviderId }>>
> {
  const rows = await prisma.lLMRoutingConfig.findMany();
  const byKey = new Map<string, ProviderId>(
    rows
      .filter((r) => isProviderId(r.provider))
      .map((r) => [`${r.plan}:${r.task}`, r.provider as ProviderId]),
  );

  const out = {} as Record<
    Plan,
    Record<RoutingTask, { current: ProviderId | null; fallback: ProviderId }>
  >;
  for (const plan of ROUTING_PLANS) {
    out[plan] = {} as Record<RoutingTask, { current: ProviderId | null; fallback: ProviderId }>;
    for (const task of ROUTING_TASKS) {
      out[plan][task] = {
        current: byKey.get(`${plan}:${task}`) ?? null,
        fallback: FALLBACK_ROUTING[plan][task][0],
      };
    }
  }
  return out;
}

export async function saveRoutingMatrix(
  entries: Array<{ plan: Plan; task: RoutingTask; provider: ProviderId }>,
): Promise<void> {
  await prisma.$transaction(
    entries.map((e) =>
      prisma.lLMRoutingConfig.upsert({
        where: { plan_task: { plan: e.plan, task: e.task } },
        create: e,
        update: { provider: e.provider },
      }),
    ),
  );
  await invalidateRoutingCache();
}

export async function invalidateRoutingCache(): Promise<void> {
  await cacheDel(CACHE_KEY);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function isRoutingTask(value: string): value is RoutingTask {
  return (ROUTING_TASKS as readonly string[]).includes(value);
}
