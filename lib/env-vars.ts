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

/**
 * S3 fileUpload env-var name reconciliation.
 *
 * The runtime is internally inconsistent for `feature.fileUpload` (s3/r2):
 *   - `getRequiredEnvVars()` advertises AWS_*-style names
 *     (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_BUCKET,
 *     R2_ENDPOINT) — this is what the dashboard would otherwise show and the
 *     user would fill in;
 *   - but the *deployed* API reads its config via `readS3ConfigFromEnv()`,
 *     which looks up S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
 *     S3_ENDPOINT and S3_REGION.
 *
 * Result: the user fills AWS_*, the container boots, finds no S3_* and crashes
 * with "S3 storage is enabled but required env vars are missing".
 *
 * The deployed reader is the source of truth — those are the names the bucket
 * client actually consumes. We reconcile the advertised names to it here so the
 * dashboard lists, validation and deploy injection all speak S3_*. The remap is
 * scoped to `source === "feature.fileUpload"` so an unrelated user-declared var
 * that happens to be named e.g. AWS_BUCKET is never touched.
 */
const S3_ENV_NAME_REMAP: Readonly<Record<string, string>> = {
  AWS_ACCESS_KEY_ID: "S3_ACCESS_KEY_ID",
  AWS_SECRET_ACCESS_KEY: "S3_SECRET_ACCESS_KEY",
  AWS_REGION: "S3_REGION",
  AWS_BUCKET: "S3_BUCKET",
  R2_ENDPOINT: "S3_ENDPOINT",
};

/**
 * Wraps the runtime's `getRequiredEnvVars` and rewrites the fileUpload S3 var
 * names to the ones the deployed runtime actually reads. Every helper in this
 * module goes through this instead of calling `getRequiredEnvVars` directly, so
 * the whole platform (dashboard list, `canUserSet`, deploy readiness, deploy
 * injection) stays aligned with `readS3ConfigFromEnv`.
 */
export function getNormalizedEnvVars(spec: ZeroAPISpec): AggregatedEnvVar[] {
  return getRequiredEnvVars(spec).map((v) => {
    if (v.source === "feature.fileUpload") {
      const renamed = S3_ENV_NAME_REMAP[v.name];
      if (renamed) return { ...v, name: renamed };
    }
    return v;
  });
}

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
  return getNormalizedEnvVars(spec).map<CategorizedEnvVar>((v) => ({
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
  const v = getNormalizedEnvVars(spec).find((x) => x.name === key);
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

  for (const v of getNormalizedEnvVars(spec)) {
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
