/**
 * OSS Service - Cloud storage integration for node packages
 * Supports AWS S3 / Cloudflare R2 (compatible API)
 *
 * Usage:
 * - Upload: larger node packages (> 1MB) are stored in OSS
 * - Download: OSS objects are served directly or proxied
 *
 * Configuration via environment variables (see .env.example):
 *   OSS_ENABLED=true
 *   OSS_ENDPOINT=https://your-account.r2.cloudflarestorage.com
 *   OSS_BUCKET=node-packages
 *   AWS_ACCESS_KEY_ID=...
 *   AWS_SECRET_ACCESS_KEY=...
 *   AWS_REGION=auto
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

export interface OssConfig {
  enabled: boolean;
  endpoint?: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

function getOssConfig(): OssConfig {
  return {
    enabled: process.env.OSS_ENABLED === 'true',
    endpoint: process.env.OSS_ENDPOINT,
    bucket: process.env.OSS_BUCKET ?? 'node-packages',
    region: process.env.AWS_REGION ?? 'auto',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  };
}

function createS3Client(config: OssConfig): S3Client | null {
  if (!config.enabled) return null;

  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // R2 and S3 both support path-style for compatibility
    forcePathStyle: true,
  });
}

const SIZE_THRESHOLD_BYTES = 1 * 1024 * 1024; // 1 MB

/**
 * Decide where to store a manifest: OSS or database
 */
export function shouldUseOss(manifestJson: string): boolean {
  const config = getOssConfig();
  if (!config.enabled) return false;
  return new TextEncoder().encode(manifestJson).length > SIZE_THRESHOLD_BYTES;
}

/**
 * Generate OSS key for a node package object
 */
export function getOssKey(packageId: string, version: string): string {
  return `node-packages/${packageId}/v${version}/manifest.json`;
}

/**
 * Upload a node package manifest to OSS
 */
export async function uploadToOss(
  key: string,
  body: string,
  contentType = 'application/json'
): Promise<{ ossKey: string; storageType: 'oss' }> {
  const config = getOssConfig();
  const client = createS3Client(config);

  if (!client) {
    throw new Error('OSS is not configured. Set OSS_ENABLED=true in environment.');
  }

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return { ossKey: key, storageType: 'oss' as const };
}

/**
 * Download a node package manifest from OSS
 */
export async function downloadFromOss(key: string): Promise<string> {
  const config = getOssConfig();
  const client = createS3Client(config);

  if (!client) {
    throw new Error('OSS is not configured. Set OSS_ENABLED=true in environment.');
  }

  const response = await client.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  );

  if (!response.Body) {
    throw new Error(`OSS object not found: ${key}`);
  }

  const bytes = await response.Body.transformToByteArray();
  return new TextDecoder('utf-8').decode(bytes);
}

/**
 * Delete a node package manifest from OSS
 */
export async function deleteFromOss(key: string): Promise<void> {
  const config = getOssConfig();
  const client = createS3Client(config);

  if (!client) return; // Nothing to delete if OSS not enabled

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: key,
      })
    );
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('[OSS] Delete failed:', error.message);
    if (config.enabled) {
      throw new Error(`OSS delete failed: ${error.message}`);
    }
  }
}

/**
 * Get metadata of an OSS object (useful for existence checks)
 */
export async function getOssObjectMeta(key: string): Promise<{
  contentLength: number;
  contentType: string;
} | null> {
  const config = getOssConfig();
  const client = createS3Client(config);

  if (!client) return null;

  try {
    const response = await client.send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: key,
      })
    );
    return {
      contentLength: response.ContentLength ?? 0,
      contentType: response.ContentType ?? 'application/json',
    };
  } catch {
    return null;
  }
}
