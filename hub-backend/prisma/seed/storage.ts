import { randomUUID } from 'node:crypto';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const MIME_BY_EXTENSION: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

export interface StorageConfig {
  bucket: string;
  client: S3Client;
}

export function mimeTypeForFile(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex < 0) {
    return 'application/octet-stream';
  }

  const extension = fileName.slice(dotIndex).toLowerCase();
  return MIME_BY_EXTENSION[extension] ?? 'application/octet-stream';
}

/**
 * Mirrors StorageService.buildStorageKey so seeded attachments use the same
 * key layout as attachment uploads performed through the API.
 */
export function buildStorageKey(
  projectId: number,
  originalName: string,
): string {
  const extension = originalName.includes('.')
    ? originalName.slice(originalName.lastIndexOf('.')).toLowerCase()
    : '';
  const safeExtension = extension.replace(/[^a-z0-9.]/g, '');

  return `projects/${projectId}/${randomUUID()}${safeExtension}`;
}

export function createStorage(): StorageConfig | null {
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY?.trim();
  const secretAccessKey = process.env.S3_SECRET_KEY?.trim();

  if (!bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const client = new S3Client({
    region: process.env.S3_REGION?.trim() || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
    forcePathStyle:
      (process.env.S3_FORCE_PATH_STYLE ?? 'true').toLowerCase() !== 'false',
    credentials: { accessKeyId, secretAccessKey },
  });

  return { bucket, client };
}

export async function uploadToStorage(
  storage: StorageConfig,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await storage.client.send(
    new PutObjectCommand({
      Bucket: storage.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteFromStorage(
  storage: StorageConfig,
  key: string,
): Promise<void> {
  await storage.client.send(
    new DeleteObjectCommand({
      Bucket: storage.bucket,
      Key: key,
    }),
  );
}
