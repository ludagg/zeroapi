import type { Plan } from "@prisma/client";

export const PLAN_ORDER: Plan[] = ["FREE", "STARTER", "PRO", "BUSINESS"];

export interface PlanInfo {
  label: string;
  generations: number;
  priceEUR: number;
}

export const PLAN_LIMITS: Record<Plan, PlanInfo> = {
  FREE: { label: "Free", generations: 3, priceEUR: 0 },
  STARTER: { label: "Starter", generations: 30, priceEUR: 19 },
  PRO: { label: "Pro", generations: 150, priceEUR: 49 },
  BUSINESS: { label: "Business", generations: 1000, priceEUR: 199 },
};

export function defaultGenerationsLimitFor(plan: Plan): number {
  return PLAN_LIMITS[plan].generations;
}

export function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && (PLAN_ORDER as string[]).includes(value);
}
