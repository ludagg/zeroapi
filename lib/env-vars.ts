import { getRequiredEnvVars } from "@ludagg/zeroapi-runtime";
import type { AggregatedEnvVar, ZeroAPISpec } from "@ludagg/zeroapi-runtime";

export type EnvVarCategory = "auto" | "required" | "optional";

export interface EnvVarSpec extends AggregatedEnvVar {
  category: EnvVarCategory;
}

export interface EnvVarStatus extends EnvVarSpec {
  defined: boolean;
  /** Last update timestamp (managed or user value), ISO string. Null if never set. */
  updatedAt: string | null;
}

/**
 * Decides whether a runtime-declared env var is :
 *  - "auto"     → provisioned by ZeroAPI Cloud at deploy time (the user never
 *                 sees it nor touches it). Covers DATABASE_URL, the JWT signing
 *                 secret (generated once, persisted, reused), and the OAuth
 *                 callback base URL (derived from the public sub-domain).
 *  - "required" → user-supplied secret without which the deploy must be
 *                 blocked (e.g. GOOGLE_CLIENT_ID).
 *  - "optional" → user-supplied but the API still boots if absent.
 */
export function categorizeEnvVar(v: AggregatedEnvVar): EnvVarCategory {
  if (v.source === "database") return "auto";
  if (v.source === "auth.jwt") return "auto";
  if (v.name === "OAUTH_CALLBACK_BASE_URL") return "auto";
  if (v.generate === true && v.managedByCloud === true) return "auto";
  if (v.required) return "required";
  return "optional";
}

export function listSpecEnvVars(spec: ZeroAPISpec): EnvVarSpec[] {
  return getRequiredEnvVars(spec).map((v) => ({ ...v, category: categorizeEnvVar(v) }));
}

/**
 * Returns the names of required-user-supplied variables that the spec declares
 * but the database has no record for. Used by the deploy route to bail out
 * before talking to Coolify, and by the UI to show the missing-vars banner.
 */
export function missingRequiredEnvVars(
  spec: ZeroAPISpec,
  definedKeys: Iterable<string>,
): string[] {
  const set = new Set(definedKeys);
  return listSpecEnvVars(spec)
    .filter((v) => v.category === "required" && !set.has(v.name))
    .map((v) => v.name);
}

/** True when every required user-supplied variable has a stored value. */
export function isReadyToDeploy(
  spec: ZeroAPISpec,
  definedKeys: Iterable<string>,
): boolean {
  return missingRequiredEnvVars(spec, definedKeys).length === 0;
}
