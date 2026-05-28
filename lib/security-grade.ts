import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";

export type SecurityGrade = "A" | "B" | "C" | "D" | "F";

export interface SecurityReport {
  grade: SecurityGrade;
  score: number;
  hasAuth: boolean;
  hasRoles: boolean;
  hasRateLimit: boolean;
  hasRbac: boolean;
  /** True when at least one ownOnly permission rule scopes rows per user. */
  hasOwnOnly: boolean;
}

export function gradeFromScore(score: number): SecurityGrade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

/**
 * True when ANY auth surface is configured — legacy `auth.strategy`, modern
 * `auth.jwt.enabled` / `auth.apikey.enabled` / `auth.oauth.providers[]`, or the
 * top-level `auth.enabled` flag.
 */
function hasAnyAuth(spec: ZeroAPISpec): boolean {
  const a = spec.auth;
  if (!a) return false;
  if (typeof (a as { strategy?: string }).strategy === "string") return true;
  if (a.enabled === true) return true;
  if (a.jwt?.enabled === true) return true;
  if (a.apikey?.enabled === true) return true;
  if ((a.oauth?.providers?.length ?? 0) > 0) return true;
  return false;
}

export function computeSecurity(spec: ZeroAPISpec): SecurityReport {
  const hasAuth = hasAnyAuth(spec);
  const hasRoles = (spec.roles?.length ?? 0) > 0;
  const hasRateLimit = Boolean(spec.rateLimit);
  const hasRbac =
    spec.resources.some(
      (r) => r.rbac?.read?.length || r.rbac?.write?.length || r.rbac?.delete?.length,
    ) || (spec.permissions?.length ?? 0) > 0;
  const hasOwnOnly = (spec.permissions ?? []).some((p) =>
    p.rules.some((r) => r.ownOnly === true),
  );

  let score = 30;
  if (hasAuth) score += 30;
  if (hasRoles) score += 15;
  if (hasRbac) score += 15;
  if (hasRateLimit) score += 10;
  if (hasOwnOnly) score += 5;

  return {
    grade: gradeFromScore(Math.min(100, score)),
    score: Math.min(100, score),
    hasAuth,
    hasRoles,
    hasRateLimit,
    hasRbac,
    hasOwnOnly,
  };
}

export const GRADE_TONE: Record<SecurityGrade, string> = {
  A: "bg-accent text-accent-ink",
  B: "bg-accent-soft text-accent-ink",
  C: "bg-warn-soft text-warn-ink",
  D: "bg-warn-soft text-warn-ink",
  F: "bg-danger-soft text-danger",
};
