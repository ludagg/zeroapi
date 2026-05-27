/**
 * Coolify API client for ZeroAPI Cloud deployments.
 *
 * Endpoints used :
 * - POST /api/v1/databases      → provisions an isolated Postgres for the API
 * - POST /api/v1/applications   → creates the Docker container app
 * - GET  /api/v1/applications/{id} → polls deployment status
 *
 * Configuration via env :
 *   COOLIFY_API_URL    (e.g. http://167.86.95.165:8000)
 *   COOLIFY_API_TOKEN
 *   COOLIFY_PROJECT_UUID         (target project on the Coolify instance)
 *   COOLIFY_SERVER_UUID          (target server)
 *   COOLIFY_ENVIRONMENT_NAME?    (defaults to "production")
 *   ZEROAPI_CLOUD_DOMAIN?        (defaults to "zeroapi.app")
 */

export interface CoolifyConfig {
  apiUrl: string;
  apiToken: string;
  projectUuid: string;
  serverUuid: string;
  environmentName: string;
  cloudDomain: string;
}

export function readCoolifyConfig(): CoolifyConfig | null {
  const apiUrl = process.env.COOLIFY_API_URL;
  const apiToken = process.env.COOLIFY_API_TOKEN;
  const projectUuid = process.env.COOLIFY_PROJECT_UUID;
  const serverUuid = process.env.COOLIFY_SERVER_UUID;
  if (!apiUrl || !apiToken || !projectUuid || !serverUuid) return null;
  return {
    apiUrl: apiUrl.replace(/\/$/, ""),
    apiToken,
    projectUuid,
    serverUuid,
    environmentName: process.env.COOLIFY_ENVIRONMENT_NAME ?? "production",
    cloudDomain: process.env.ZEROAPI_CLOUD_DOMAIN ?? "zeroapi.app",
  };
}

export function coolifyConfigured(): boolean {
  return readCoolifyConfig() !== null;
}

export class CoolifyError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function call<T>(
  cfg: CoolifyConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
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
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg =
      (body && typeof body === "object" && "message" in body
        ? String((body as { message?: unknown }).message)
        : null) ?? `Coolify ${res.status} sur ${path}`;
    throw new CoolifyError(msg, res.status, body);
  }
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

/**
 * Provisions a fresh Postgres database on Coolify and returns its
 * internal connection URL (resolvable from inside the Coolify network).
 */
export async function provisionPostgres(
  cfg: CoolifyConfig,
  args: ProvisionPostgresArgs,
): Promise<ProvisionPostgresResult> {
  const body = await call<{
    uuid: string;
    internal_db_url?: string;
    internal_url?: string;
  }>(cfg, "/api/v1/databases/postgresql", {
    method: "POST",
    body: JSON.stringify({
      name: `db-${args.apiSlug}`,
      description: `ZeroAPI · job ${args.jobId}`,
      project_uuid: cfg.projectUuid,
      server_uuid: cfg.serverUuid,
      environment_name: cfg.environmentName,
      instant_deploy: true,
      is_public: false,
      postgres_user: "zeroapi",
      postgres_db: "zeroapi",
    }),
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

  const body = await call<{ uuid: string; fqdn?: string }>(
    cfg,
    "/api/v1/applications/dockerimage",
    {
      method: "POST",
      body: JSON.stringify({
        name: `api-${args.apiSlug}`,
        description: `ZeroAPI · job ${args.jobId}`,
        project_uuid: cfg.projectUuid,
        server_uuid: cfg.serverUuid,
        environment_name: cfg.environmentName,
        docker_registry_image_name: "ghcr.io/ludagg/zeroapi-runtime",
        docker_registry_image_tag: "latest",
        ports_exposes: "3000",
        instant_deploy: true,
        domains: fqdn,
        environment_variables: envString,
      }),
    },
  );
  return {
    uuid: body.uuid,
    publicUrl: `https://${body.fqdn ?? fqdn}`,
  };
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
