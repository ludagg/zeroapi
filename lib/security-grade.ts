import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";

export type SecurityGrade = "A" | "B" | "C" | "D" | "F";

export interface SecurityReport {
  grade: SecurityGrade;
  score: number;
  hasAuth: boolean;
  hasRoles: boolean;
  hasRateLimit: boolean;
  hasRbac: boolean;
}

export function gradeFromScore(score: number): SecurityGrade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

export function computeSecurity(spec: ZeroAPISpec): SecurityReport {
  const hasAuth = Boolean(spec.auth?.strategy);
  const hasRoles = (spec.roles?.length ?? 0) > 0;
  const hasRateLimit = Boolean(spec.rateLimit);
  const hasRbac = spec.resources.some(
    (r) => r.rbac?.read?.length || r.rbac?.write?.length || r.rbac?.delete?.length,
  );

  let score = 30;
  if (hasAuth) score += 30;
  if (hasRoles) score += 15;
  if (hasRbac) score += 15;
  if (hasRateLimit) score += 10;

  return {
    grade: gradeFromScore(score),
    score,
    hasAuth,
    hasRoles,
    hasRateLimit,
    hasRbac,
  };
}

export const GRADE_TONE: Record<SecurityGrade, string> = {
  A: "bg-accent text-accent-ink",
  B: "bg-accent-soft text-accent-ink",
  C: "bg-warn-soft text-warn-ink",
  D: "bg-warn-soft text-warn-ink",
  F: "bg-danger-soft text-danger",
};
