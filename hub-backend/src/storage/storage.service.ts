import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

export type SaveFileInput = {
  key: string;
  buffer: Buffer;
  contentType: string;
};

export abstract class StorageService {
  abstract save(input: SaveFileInput): Promise<void>;
  abstract read(key: string): Promise<Readable>;
  abstract delete(key: string): Promise<void>;
}

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
