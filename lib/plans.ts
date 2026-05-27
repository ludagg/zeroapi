import type { Plan } from "@prisma/client";

export const PLAN_ORDER: Plan[] = ["FREE", "STARTER", "PRO", "BUSINESS"];

export interface PlanInfo {
  label: string;
  /** Soft monthly cap shown in the UI — historical field, still used in dashboards. */
  generations: number;
  /**
   * Hard rejection threshold enforced by the rate-limit on every generation
   * request. Reset on a sliding 24h window per user.
   */
  generationsPerDay: number;
  priceEUR: number;
}

export const PLAN_LIMITS: Record<Plan, PlanInfo> = {
  FREE: { label: "Free", generations: 3, generationsPerDay: 3, priceEUR: 0 },
  STARTER: { label: "Starter", generations: 30, generationsPerDay: 10, priceEUR: 19 },
  PRO: { label: "Pro", generations: 150, generationsPerDay: 50, priceEUR: 49 },
  BUSINESS: { label: "Business", generations: 1000, generationsPerDay: 500, priceEUR: 199 },
};

export function defaultGenerationsLimitFor(plan: Plan): number {
  return PLAN_LIMITS[plan].generations;
}

export function dailyLimitFor(plan: Plan): number {
  return PLAN_LIMITS[plan].generationsPerDay;
}

export function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && (PLAN_ORDER as string[]).includes(value);
}

/**
 * Suggested upgrade target — what to recommend when a user hits their daily
 * limit. Returns `null` for BUSINESS (already top-tier).
 */
export function nextPlanFor(plan: Plan): Plan | null {
  const idx = PLAN_ORDER.indexOf(plan);
  if (idx < 0 || idx === PLAN_ORDER.length - 1) return null;
  return PLAN_ORDER[idx + 1];
}
