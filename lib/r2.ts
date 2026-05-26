import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "node:stream";

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl?: string;
};

function readConfig(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl: process.env.R2_PUBLIC_URL,
  };
}

let _client: S3Client | null = null;
function client(cfg: R2Config): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
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
  | { configured: true; key: string; storedRef: string; size: number }
  | { configured: false };

/**
 * Uploads the ZIP bundle for a job to R2.
 *
 * Returns `storedRef`, the value to persist in `Job.zipUrl` :
 *   - if R2_PUBLIC_URL is set → the public HTTPS URL (servable as-is)
 *   - otherwise → `r2://<key>` sentinel so the download route can mint a
 *     fresh signed GET URL on demand.
 *
 * If R2 is not configured the caller is expected to use the local file
 * fallback (see worker).
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

  const storedRef = cfg.publicUrl
    ? `${cfg.publicUrl.replace(/\/$/, "")}/${key}`
    : `r2://${key}`;

  return { configured: true, key, storedRef, size: buffer.byteLength };
}

/**
 * Resolves a value stored in `Job.zipUrl` into a publicly fetchable HTTPS URL.
 * Returns `null` for local-file references (`file://`).
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
    { expiresIn: options.expiresIn ?? 60 * 60 * 24 * 7 },
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
