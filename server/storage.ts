/**
 * storage.ts — Cloudflare R2 file storage for NEON SIGNS
 *
 * Replaces the Manus Forge storage proxy with direct Cloudflare R2 access
 * using the AWS S3-compatible API.
 *
 * Key prefix: neon-signs/ — separates from other projects in the same bucket.
 *
 * Required environment variables:
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME
 *   R2_PUBLIC_URL   (e.g. https://pub-xxxx.r2.dev or custom domain)
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

const KEY_PREFIX = "neon-signs/";

function getS3Client(): S3Client {
  const { r2AccountId, r2AccessKeyId, r2SecretAccessKey } = ENV;

  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
    throw new Error(
      "R2 credentials missing: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY"
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  });
}

function getBucketName(): string {
  const bucket = ENV.r2BucketName;
  if (!bucket) throw new Error("R2_BUCKET_NAME is not set");
  return bucket;
}

function normalizeKey(relKey: string): string {
  // Ensure the neon-signs/ prefix is present, avoid double-prefixing
  const stripped = relKey.replace(/^\/+/, "");
  if (stripped.startsWith(KEY_PREFIX)) return stripped;
  return `${KEY_PREFIX}${stripped}`;
}

function buildPublicUrl(key: string): string {
  const base = ENV.r2PublicUrl.replace(/\/+$/, "");
  if (!base) throw new Error("R2_PUBLIC_URL is not set");
  return `${base}/${key}`;
}

/**
 * Upload bytes to R2.
 * Returns the full public URL and the storage key.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const bucket = getBucketName();
  const key = normalizeKey(relKey);

  const body = typeof data === "string" ? Buffer.from(data) : data;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  const url = buildPublicUrl(key);
  return { key, url };
}

/**
 * Get a presigned download URL for a private object,
 * or a public URL if R2_PUBLIC_URL is configured.
 */
export async function storageGet(
  relKey: string,
  expiresIn = 3600
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  // If public URL is configured, return it directly (no signing needed)
  if (ENV.r2PublicUrl) {
    return { key, url: buildPublicUrl(key) };
  }

  // Fall back to presigned URL
  const client = getS3Client();
  const bucket = getBucketName();
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn }
  );
  return { key, url };
}
