import type { Plan } from "@prisma/client";

export const PLAN_PRICE_FCFA: Record<Plan, number> = {
  FREE: 0,
  STARTER: 5000,
  PRO: 25000,
  BUSINESS: 75000,
};

export function formatFcfa(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;
}

export function monthlyCostFcfa(plan: Plan): number {
  return PLAN_PRICE_FCFA[plan] ?? 0;
}
