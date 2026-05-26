import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

export type UploadResult = {
  key: string;
  url: string;
  size: number;
  configured: true;
};

export type SkippedUpload = { configured: false };

export async function uploadJobBundle(
  jobId: string,
  buffer: Buffer,
): Promise<UploadResult | SkippedUpload> {
  const cfg = readConfig();
  if (!cfg) return { configured: false };

  const key = `jobs/${jobId}/zeroapi-${jobId}.zip`;
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

  const url = cfg.publicUrl
    ? `${cfg.publicUrl.replace(/\/$/, "")}/${key}`
    : await getSignedUrl(
        c,
        new PutObjectCommand({ Bucket: cfg.bucket, Key: key }),
        { expiresIn: 60 * 60 * 24 * 7 },
      );

  return { key, url, size: buffer.byteLength, configured: true };
}
