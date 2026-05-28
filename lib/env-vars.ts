import {
  getRequiredEnvVars,
  type AggregatedEnvVar,
  type ZeroAPISpec,
} from "@ludagg/zeroapi-runtime";

/**
 * Per-API environment variables — categorization, validation, and deploy
 * readiness helpers shared between the dashboard and the deploy route.
 *
 * Three buckets surfaced to the owner :
 *   - AUTO       : ZeroAPI provisions / generates / injects the value itself
 *                  (DATABASE_URL, JWT_SECRET, OAUTH_CALLBACK_BASE_URL).
 *   - REQUIRED   : the API will not start without it but ZeroAPI can't guess
 *                  the value (GOOGLE_CLIENT_ID, STRIPE_SECRET_KEY, …).
 *   - OPTIONAL   : `required: false` in the spec — the API runs fine without.
 *
 * The matching variable in `EnvVariable` (Prisma) is referenced by key. Values
 * are NEVER returned in clear by any helper here — only presence ("définie")
 * is exposed to the UI.
 */

export type VarCategory = "auto" | "required" | "optional";

export interface CategorizedEnvVar {
  name: string;
  required: boolean;
  description?: string;
  example?: string;
  category: VarCategory;
  source: AggregatedEnvVar["source"];
  /** True when an EnvVariable row exists for this jobId+key. */
  defined: boolean;
}

/**
 * Three things make a variable "AUTO" :
 *   - the runtime explicitly marks it `generate: true` + `managedByCloud: true`
 *     (e.g. JWT_SECRET) — we mint a stable value at deploy time;
 *   - it comes from the `database` source — Coolify provisions the Postgres
 *     and hands us the internal URL;
 *   - it's the OAuth callback base URL — we own the API sub-domain.
 */
export function isAutoVar(v: AggregatedEnvVar): boolean {
  if (v.generate === true && v.managedByCloud === true) return true;
  if (v.source === "database") return true;
  if (v.name === "OAUTH_CALLBACK_BASE_URL") return true;
  return false;
}

export function categorize(v: AggregatedEnvVar): VarCategory {
  if (isAutoVar(v)) return "auto";
  return v.required ? "required" : "optional";
}

/**
 * Snapshots every variable the spec depends on and merges it with the rows
 * actually persisted in `EnvVariable`. Used by GET /env and the dashboard.
 *
 * `definedKeys` is the set of EnvVariable.key values that already exist for
 * the job — caller passes it from Prisma so this stays free of side effects.
 */
export function buildCategorizedList(
  spec: ZeroAPISpec,
  definedKeys: ReadonlySet<string>,
): CategorizedEnvVar[] {
  return getRequiredEnvVars(spec).map<CategorizedEnvVar>((v) => ({
    name: v.name,
    required: v.required,
    description: v.description,
    example: v.example,
    category: categorize(v),
    source: v.source,
    defined: definedKeys.has(v.name),
  }));
}

/**
 * Returns true when `key` is a variable the spec actually declares (legitimate)
 * AND the user is allowed to set it (not AUTO — AUTO values come from the
 * platform, manual override would be a footgun).
 */
export function canUserSet(spec: ZeroAPISpec, key: string): boolean {
  const v = getRequiredEnvVars(spec).find((x) => x.name === key);
  if (!v) return false;
  return !isAutoVar(v);
}

export interface DeployReadiness {
  ready: boolean;
  /** REQUIRED vars (not AUTO) whose row is missing in `EnvVariable`. */
  missingRequired: string[];
  /** REQUIRED vars (not AUTO) whose row is set. */
  setRequired: string[];
  /** AUTO vars — listed for the UI, owner can't change them. */
  autoVars: string[];
}

export function computeDeployReadiness(
  spec: ZeroAPISpec,
  definedKeys: ReadonlySet<string>,
): DeployReadiness {
  const missingRequired: string[] = [];
  const setRequired: string[] = [];
  const autoVars: string[] = [];

  for (const v of getRequiredEnvVars(spec)) {
    if (isAutoVar(v)) {
      autoVars.push(v.name);
      continue;
    }
    if (!v.required) continue;
    if (definedKeys.has(v.name)) setRequired.push(v.name);
    else missingRequired.push(v.name);
  }

  return {
    ready: missingRequired.length === 0,
    missingRequired,
    setRequired,
    autoVars,
  };
}
