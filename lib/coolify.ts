/**
 * Coolify API client for ZeroAPI Cloud deployments.
 *
 * Endpoints used :
 * - POST /api/v1/databases/postgresql → provisions an isolated Postgres
 * - POST /api/v1/applications/dockerimage → creates the Docker container app
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
 *   ZEROAPI_RUNTIME_IMAGE?                (defaults to "ghcr.io/ludagg/zeroapi-runtime:latest")
 */

export interface CoolifyConfig {
  apiUrl: string;
  apiToken: string;
  projectUuid: string;
  serverUuid: string;
  environmentName?: string;
  environmentUuid?: string;
  cloudDomain: string;
  runtimeImage: string;
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
      runtimeImage:
        process.env.ZEROAPI_RUNTIME_IMAGE ?? "ghcr.io/ludagg/zeroapi-runtime:latest",
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

/**
 * Creates a Coolify application that pulls the ZeroAPI Docker image,
 * injects the user env + DATABASE_URL, and exposes it on a sub-domain.
 *
 * The Docker image is expected to be `ghcr.io/ludagg/zeroapi-runtime:latest`,
 * configured to download the bundle ZIP from `ZEROAPI_BUNDLE_URL` at boot.
 */
export async function deployApplication(
  cfg: CoolifyConfig,
  args: DeployAppArgs,
): Promise<DeployAppResult> {
  const fqdn = `api-${args.apiSlug}.${cfg.cloudDomain}`;
  const envString = [
    `DATABASE_URL=${args.databaseUrl}`,
    `ZEROAPI_BUNDLE_URL=${args.zipUrl}`,
    `PORT=3000`,
    `NODE_ENV=production`,
    ...args.envVars.map((e) => `${e.key}=${e.value}`),
  ].join("\n");

  const [imageName, imageTag] = splitImage(cfg.runtimeImage);

  const payload = {
    name: `api-${args.apiSlug}`,
    description: `ZeroAPI · job ${args.jobId}`,
    project_uuid: cfg.projectUuid,
    server_uuid: cfg.serverUuid,
    ...envIdentifier(cfg),
    docker_registry_image_name: imageName,
    docker_registry_image_tag: imageTag,
    ports_exposes: "3000",
    instant_deploy: true,
    domains: `https://${fqdn}`,
    environment_variables: envString,
  };
  console.log("[coolify] deployApplication →", {
    apiSlug: args.apiSlug,
    fqdn,
    image: cfg.runtimeImage,
    payload: { ...payload, environment_variables: `${envString.length} chars` },
  });

  const body = await call<{ uuid: string; fqdn?: string }>(
    cfg,
    "/api/v1/applications/dockerimage",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return {
    uuid: body.uuid,
    publicUrl: `https://${body.fqdn ?? fqdn}`,
  };
}

function splitImage(full: string): [string, string] {
  const idx = full.lastIndexOf(":");
  if (idx === -1) return [full, "latest"];
  return [full.slice(0, idx), full.slice(idx + 1)];
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
