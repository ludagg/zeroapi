/**
 * Coolify API client for ZeroAPI Cloud deployments.
 *
 * Endpoints used :
 * - POST /api/v1/databases/postgresql → provisions an isolated Postgres
 * - POST /api/v1/applications/dockerfile → creates the app and lets Coolify
 *   build it on the VPS (nixpacks build pack — no prebuilt image required)
 * - GET  /api/v1/applications/{uuid} → polls deployment status
 *
 * Configuration via env :
 *   COOLIFY_API_URL                       (e.g. http://167.86.95.165:8000)
 *   COOLIFY_API_TOKEN
 *   COOLIFY_PROJECT_UUID                  (target project on the Coolify instance)
 *   COOLIFY_SERVER_UUID                   (target server)
 *   COOLIFY_ENVIRONMENT_UUID?             (preferred — bypasses name lookup)
 *   COOLIFY_ENVIRONMENT_NAME?             (fallback, defaults to "production")
 *   ZEROAPI_CLOUD_DOMAIN?                 (defaults to "zeroapi.app")
 */

export interface CoolifyConfig {
  apiUrl: string;
  apiToken: string;
  projectUuid: string;
  serverUuid: string;
  environmentName?: string;
  environmentUuid?: string;
  cloudDomain: string;
}

export type CoolifyEnvVar =
  | "COOLIFY_API_URL"
  | "COOLIFY_API_TOKEN"
  | "COOLIFY_PROJECT_UUID"
  | "COOLIFY_SERVER_UUID"
  | "COOLIFY_ENVIRONMENT_UUID_OR_NAME";

export type ConfigReadResult =
  | { ok: true; config: CoolifyConfig }
  | { ok: false; missing: CoolifyEnvVar[] };

/**
 * Validates the env-derived Coolify config.
 *
 * `COOLIFY_ENVIRONMENT_UUID` is preferred; if absent we fall back to
 * `COOLIFY_ENVIRONMENT_NAME`. If neither is set we flag the dual var
 * `COOLIFY_ENVIRONMENT_UUID_OR_NAME` so the UI surfaces a single, actionable
 * "missing variable" hint instead of two confusing ones.
 */
export function readCoolifyConfigDetailed(): ConfigReadResult {
  const apiUrl = process.env.COOLIFY_API_URL;
  const apiToken = process.env.COOLIFY_API_TOKEN;
  const projectUuid = process.env.COOLIFY_PROJECT_UUID;
  const serverUuid = process.env.COOLIFY_SERVER_UUID;
  const environmentUuid = process.env.COOLIFY_ENVIRONMENT_UUID;
  const environmentName = process.env.COOLIFY_ENVIRONMENT_NAME;

  const missing: CoolifyEnvVar[] = [];
  if (!apiUrl) missing.push("COOLIFY_API_URL");
  if (!apiToken) missing.push("COOLIFY_API_TOKEN");
  if (!projectUuid) missing.push("COOLIFY_PROJECT_UUID");
  if (!serverUuid) missing.push("COOLIFY_SERVER_UUID");
  if (!environmentUuid && !environmentName) {
    missing.push("COOLIFY_ENVIRONMENT_UUID_OR_NAME");
  }
  if (missing.length > 0) return { ok: false, missing };

  return {
    ok: true,
    config: {
      apiUrl: apiUrl!.replace(/\/$/, ""),
      apiToken: apiToken!,
      projectUuid: projectUuid!,
      serverUuid: serverUuid!,
      environmentUuid: environmentUuid || undefined,
      environmentName: environmentUuid ? undefined : (environmentName ?? "production"),
      cloudDomain: process.env.ZEROAPI_CLOUD_DOMAIN ?? "zeroapi.app",
    },
  };
}

export function readCoolifyConfig(): CoolifyConfig | null {
  const r = readCoolifyConfigDetailed();
  return r.ok ? r.config : null;
}

export function coolifyConfigured(): boolean {
  return readCoolifyConfigDetailed().ok;
}

/**
 * Quick non-secret snapshot of the Coolify env for log lines.
 * Token is reduced to a presence boolean.
 */
export function describeCoolifyEnv(): Record<string, unknown> {
  return {
    apiUrl: process.env.COOLIFY_API_URL ?? null,
    hasToken: Boolean(process.env.COOLIFY_API_TOKEN),
    projectUuid: process.env.COOLIFY_PROJECT_UUID ?? null,
    serverUuid: process.env.COOLIFY_SERVER_UUID ?? null,
    environmentUuid: process.env.COOLIFY_ENVIRONMENT_UUID ?? null,
    environmentName: process.env.COOLIFY_ENVIRONMENT_NAME ?? null,
    cloudDomain: process.env.ZEROAPI_CLOUD_DOMAIN ?? null,
  };
}

export class CoolifyError extends Error {
  status: number;
  body: unknown;
  fieldErrors: Record<string, string[]>;
  constructor(
    message: string,
    status: number,
    body: unknown,
    fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.status = status;
    this.body = body;
    this.fieldErrors = fieldErrors;
  }
}

function flattenFieldErrors(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      out[key] = value.map((v) => String(v));
    } else if (typeof value === "string") {
      out[key] = [value];
    } else {
      out[key] = [JSON.stringify(value)];
    }
  }
  return out;
}

function describeValidationFailure(
  defaultMessage: string,
  fieldErrors: Record<string, string[]>,
): string {
  const keys = Object.keys(fieldErrors);
  if (keys.length === 0) return defaultMessage;
  const parts = keys.map((k) => `${k}: ${fieldErrors[k].join(", ")}`);
  return `${defaultMessage} (${parts.join(" · ")})`;
}

async function call<T>(
  cfg: CoolifyConfig,
  path: string,
  init: RequestInit & { body?: string } = {},
): Promise<T> {
  const t0 = Date.now();
  const res = await fetch(`${cfg.apiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  const elapsed = Date.now() - t0;
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const raw = (body ?? {}) as Record<string, unknown>;
    const fieldErrors = flattenFieldErrors(raw.errors);
    const baseMessage =
      typeof raw.message === "string" && raw.message.length > 0
        ? raw.message
        : `Coolify ${res.status} sur ${path}`;
    const message = describeValidationFailure(baseMessage, fieldErrors);
    console.error("[coolify] error", {
      path,
      status: res.status,
      elapsedMs: elapsed,
      body: raw,
    });
    throw new CoolifyError(message, res.status, raw, fieldErrors);
  }
  console.log("[coolify] ok", {
    path,
    method: init.method ?? "GET",
    status: res.status,
    elapsedMs: elapsed,
  });
  return body as T;
}

export interface ProvisionPostgresArgs {
  jobId: string;
  apiSlug: string;
}

export interface ProvisionPostgresResult {
  uuid: string;
  internalUrl: string;
}

function envIdentifier(cfg: CoolifyConfig): Record<string, string> {
  if (cfg.environmentUuid) {
    return { environment_uuid: cfg.environmentUuid };
  }
  return { environment_name: cfg.environmentName ?? "production" };
}

/**
 * Provisions a fresh Postgres database on Coolify and returns its
 * internal connection URL (resolvable from inside the Coolify network).
 */
export async function provisionPostgres(
  cfg: CoolifyConfig,
  args: ProvisionPostgresArgs,
): Promise<ProvisionPostgresResult> {
  const payload = {
    name: `db-${args.apiSlug}`,
    description: `ZeroAPI · job ${args.jobId}`,
    project_uuid: cfg.projectUuid,
    server_uuid: cfg.serverUuid,
    ...envIdentifier(cfg),
    instant_deploy: true,
    is_public: false,
    postgres_user: "zeroapi",
    postgres_db: "zeroapi",
  };
  console.log("[coolify] provisionPostgres →", {
    apiSlug: args.apiSlug,
    payload: { ...payload, postgres_user: "***" },
  });
  const body = await call<{
    uuid: string;
    internal_db_url?: string;
    internal_url?: string;
  }>(cfg, "/api/v1/databases/postgresql", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const internalUrl = body.internal_db_url ?? body.internal_url ?? "";
  return { uuid: body.uuid, internalUrl };
}

export interface DeployAppArgs {
  jobId: string;
  apiSlug: string;
  databaseUrl: string;
  envVars: Array<{ key: string; value: string }>;
  zipUrl: string;
}

export interface DeployAppResult {
  uuid: string;
  publicUrl: string;
}

interface CreateAppResponse {
  uuid: string;
  fqdn?: string;
}

interface EnvVar {
  key: string;
  value: string;
}

/**
 * Four-step deploy flow following Coolify v4 API docs :
 *
 *   1. POST /api/v1/applications/dockerfile  — register the app with the
 *      minimal accepted body. Coolify v4 rejects unknown fields with
 *      "This field is not allowed", so we ship only the canonical keys
 *      (name, project/server/env, build_pack, ports_exposes, instant_deploy)
 *      — no `description`, no `fqdn`, no `base_image`, no null-stubbed
 *      `git_repository`/`dockerfile`, no `force_domain_override`.
 *   2. PATCH /api/v1/applications/{uuid}     — attach the public domain
 *      separately. `domains` isn't accepted on the create call for nixpacks
 *      apps; the PATCH endpoint takes the partial update.
 *   3. POST /api/v1/applications/{uuid}/envs — once per env var, body kept
 *      to the minimum `{ key, value }`.
 *   4. GET  /api/v1/deploy?uuid={uuid}       — trigger the actual deploy.
 *      Returns immediately; the build runs async on the Coolify side.
 *
 * Each step logs an explicit `step N/4` line so cascading API rejections are
 * easy to pinpoint in the worker output.
 */
export async function deployApplication(
  cfg: CoolifyConfig,
  args: DeployAppArgs,
): Promise<DeployAppResult> {
  const fqdn = `api-${args.apiSlug}.${cfg.cloudDomain}`;
  const appName = `api-${args.apiSlug}`;

  // ---------- Step 0 : remove any existing application with the same name ----
  // A redeploy after a previous failure can leave an orphan app behind, which
  // makes Coolify reject the new create call (name + domain collision). Drop
  // any duplicate before recreating to keep the deploy idempotent.
  console.log("[coolify] step 0/4 dedupe →", { name: appName });
  await removeExistingApplications(cfg, appName);

  // ---------- Step 1 : create the application (minimal body) ----------
  const createPayload = {
    project_uuid: cfg.projectUuid,
    server_uuid: cfg.serverUuid,
    ...envIdentifier(cfg),
    name: appName,
    build_pack: "nixpacks",
    ports_exposes: "3000",
    instant_deploy: false,
  };
  console.log("[coolify] step 1/4 createApplication →", {
    apiSlug: args.apiSlug,
    payload: createPayload,
  });
  const created = await call<CreateAppResponse>(
    cfg,
    "/api/v1/applications/dockerfile",
    { method: "POST", body: JSON.stringify(createPayload) },
  );
  console.log("[coolify] step 1/4 created", { uuid: created.uuid });

  // ---------- Step 2 : attach the public domain via PATCH ----------
  const domainPayload = { domains: `https://${fqdn}` };
  console.log("[coolify] step 2/4 setDomain →", { uuid: created.uuid, ...domainPayload });
  await call(cfg, `/api/v1/applications/${encodeURIComponent(created.uuid)}`, {
    method: "PATCH",
    body: JSON.stringify(domainPayload),
  });
  console.log("[coolify] step 2/4 domain attached");

  // ---------- Step 3 : push env vars one by one ----------
  const envVars: EnvVar[] = [
    { key: "DATABASE_URL", value: args.databaseUrl },
    { key: "ZEROAPI_BUNDLE_URL", value: args.zipUrl },
    { key: "PORT", value: "3000" },
    { key: "NODE_ENV", value: "production" },
    ...args.envVars.map((e) => ({ key: e.key, value: e.value })),
  ];
  console.log("[coolify] step 3/4 pushEnvVars →", { uuid: created.uuid, count: envVars.length });
  await pushEnvVars(cfg, created.uuid, envVars);
  console.log("[coolify] step 3/4 env vars pushed");

  // ---------- Step 4 : trigger the deploy ----------
  console.log("[coolify] step 4/4 triggerDeploy →", { uuid: created.uuid });
  await call(cfg, `/api/v1/deploy?uuid=${encodeURIComponent(created.uuid)}`, {
    method: "GET",
  });
  console.log("[coolify] step 4/4 deploy triggered", { fqdn });

  return {
    uuid: created.uuid,
    publicUrl: `https://${created.fqdn ?? fqdn}`,
  };
}

/**
 * Adds each env var to a Coolify application.
 *
 * The endpoint accepts one variable per call with a minimal `{ key, value }`
 * body — Coolify v4 rejects extra fields like `is_build_time`, `is_preview`,
 * `is_literal` with "This field is not allowed".
 *
 * If a key already exists (409 — typically a re-deploy after a previous
 * failure), the POST is retried as a PATCH so the value is updated in place.
 */
async function pushEnvVars(
  cfg: CoolifyConfig,
  uuid: string,
  envVars: EnvVar[],
): Promise<void> {
  for (const ev of envVars) {
    const body = JSON.stringify({ key: ev.key, value: ev.value });
    try {
      await call(cfg, `/api/v1/applications/${encodeURIComponent(uuid)}/envs`, {
        method: "POST",
        body,
      });
    } catch (err) {
      if (err instanceof CoolifyError && err.status === 409) {
        // Variable already exists — overwrite.
        await call(cfg, `/api/v1/applications/${encodeURIComponent(uuid)}/envs`, {
          method: "PATCH",
          body,
        });
      } else {
        throw err;
      }
    }
  }
}

interface ApplicationSummary {
  uuid: string;
  name?: string;
}

/**
 * Lists every application visible to the configured Coolify token.
 *
 * The v4 API returns a plain array; we accept the `{ data: [...] }` wrapper
 * defensively in case a future release wraps the response.
 */
async function listApplications(cfg: CoolifyConfig): Promise<ApplicationSummary[]> {
  const response = await call<ApplicationSummary[] | { data: ApplicationSummary[] }>(
    cfg,
    "/api/v1/applications",
  );
  if (Array.isArray(response)) return response;
  if (response && Array.isArray((response as { data?: unknown }).data)) {
    return (response as { data: ApplicationSummary[] }).data;
  }
  return [];
}

async function deleteApplication(cfg: CoolifyConfig, uuid: string): Promise<void> {
  await call(cfg, `/api/v1/applications/${encodeURIComponent(uuid)}`, {
    method: "DELETE",
  });
}

/**
 * Deletes every application matching `name` so the subsequent create call
 * doesn't hit a duplicate-name collision. List/delete failures are logged
 * and swallowed: the create call will surface a clearer error if a stale
 * app is actually blocking the deploy.
 */
async function removeExistingApplications(
  cfg: CoolifyConfig,
  name: string,
): Promise<void> {
  let apps: ApplicationSummary[];
  try {
    apps = await listApplications(cfg);
  } catch (err) {
    console.warn("[coolify] listApplications failed during dedupe", {
      err: err instanceof Error ? err.message : String(err),
    });
    return;
  }
  const duplicates = apps.filter((a) => a.name === name && a.uuid);
  if (duplicates.length === 0) return;
  console.log("[coolify] removing duplicate applications", {
    name,
    uuids: duplicates.map((d) => d.uuid),
  });
  for (const dup of duplicates) {
    try {
      await deleteApplication(cfg, dup.uuid);
    } catch (err) {
      console.warn("[coolify] deleteApplication failed", {
        uuid: dup.uuid,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

export interface ApplicationStatus {
  uuid: string;
  status: string;
  fqdn?: string;
}

export async function getApplicationStatus(
  cfg: CoolifyConfig,
  uuid: string,
): Promise<ApplicationStatus> {
  return call<ApplicationStatus>(cfg, `/api/v1/applications/${uuid}`);
}

/**
 * Sluggifies a spec name into a sub-domain-safe slug.
 * `Sahara Foo!` → `sahara-foo`
 */
export function apiSlugFor(name: string, jobId: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  const short = jobId.slice(-6).toLowerCase();
  return base ? `${base}-${short}` : short;
}
