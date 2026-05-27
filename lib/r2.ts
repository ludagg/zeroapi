import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "node:stream";

type R2Config = {
  endpoint: string;
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

/**
 * Extracts the account ID from an R2 S3 endpoint URL.
 * Expected hostname shape : `<account-id>.r2.cloudflarestorage.com`.
 * Returns `null` for custom-domain endpoints (no account ID derivable).
 */
function extractAccountId(endpoint: string): string | null {
  try {
    const host = new URL(endpoint).hostname;
    const match = host.match(/^([a-z0-9]+)\.r2\.cloudflarestorage\.com$/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function readConfig(): R2Config | null {
  const rawEndpoint = process.env.R2_PUBLIC_URL;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!rawEndpoint || !accessKeyId || !secretAccessKey || !bucket) return null;

  const endpoint = rawEndpoint.replace(/\/$/, "");
  const accountId = extractAccountId(endpoint) ?? process.env.R2_ACCOUNT_ID ?? "";

  return { endpoint, accountId, accessKeyId, secretAccessKey, bucket };
}

let _client: S3Client | null = null;
function client(cfg: R2Config): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: "auto",
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
  return _client;
}

export function r2Configured(): boolean {
  return readConfig() !== null;
}

export function bundleKey(jobId: string): string {
  return `jobs/${jobId}/zeroapi-${jobId}.zip`;
}

export type UploadResult =
  | { configured: true; key: string; signedUrl: string; size: number }
  | { configured: false };

/**
 * Uploads the ZIP bundle for a job to R2 and returns a 7-day signed GET URL.
 * The signed URL is what callers persist in `Job.zipUrl`.
 *
 * If R2 is not configured the caller is expected to use a local-file fallback.
 */
export async function uploadJobBundle(
  jobId: string,
  buffer: Buffer,
): Promise<UploadResult> {
  const cfg = readConfig();
  if (!cfg) return { configured: false };

  const key = bundleKey(jobId);
  const c = client(cfg);

  await c.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: buffer,
      ContentType: "application/zip",
      ContentDisposition: `attachment; filename="zeroapi-${jobId}.zip"`,
    }),
  );

  const signedUrl = await getSignedUrl(
    c,
    new GetObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="zeroapi-${jobId}.zip"`,
    }),
    { expiresIn: SIGNED_URL_TTL_SECONDS },
  );

  return { configured: true, key, signedUrl, size: buffer.byteLength };
}

/**
 * Resolves a value stored in `Job.zipUrl` into a publicly fetchable HTTPS URL.
 *
 * - `https?://` references are returned as-is (already-signed URLs, custom CDN).
 * - `r2://<key>` references are minted into a fresh signed URL on demand
 *   (kept for backwards compatibility with older job rows).
 * - `file://` and unknown shapes return `null`.
 */
export async function resolveDownloadUrl(
  storedRef: string,
  options: { expiresIn?: number; filename?: string } = {},
): Promise<string | null> {
  if (storedRef.startsWith("file://")) return null;
  if (storedRef.startsWith("https://") || storedRef.startsWith("http://")) {
    return storedRef;
  }
  if (!storedRef.startsWith("r2://")) return null;

  const cfg = readConfig();
  if (!cfg) return null;

  const key = storedRef.slice("r2://".length);
  return getSignedUrl(
    client(cfg),
    new GetObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      ResponseContentDisposition: options.filename
        ? `attachment; filename="${options.filename}"`
        : undefined,
    }),
    { expiresIn: options.expiresIn ?? SIGNED_URL_TTL_SECONDS },
  );
}

/**
 * Streams the bundle for a job from R2 (used when the caller wants the bytes
 * directly rather than redirecting through a signed URL).
 */
export async function streamJobBundle(jobId: string): Promise<Readable | null> {
  const cfg = readConfig();
  if (!cfg) return null;

  const res = await client(cfg).send(
    new GetObjectCommand({
      Bucket: cfg.bucket,
      Key: bundleKey(jobId),
    }),
  );
  const body = res.Body;
  if (!body) return null;
  return body as Readable;
}
