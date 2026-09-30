import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

export type SaveFileInput = {
  key: string;
  buffer: Buffer;
  contentType: string;
};

export type StoredObject = {
  stream: Readable;
  /** Tamaño del objeto o de la porción devuelta, si el proveedor lo informa. */
  contentLength?: number;
  /** Valor para la cabecera `Content-Range` cuando se sirve un rango. */
  contentRange?: string;
};

export type UploadUrlInput = {
  key: string;
  expiresInSeconds: number;
};

export type PresignedUpload = {
  url: string;
  method: 'PUT';
  expiresInSeconds: number;
};

export type StoredObjectInfo = {
  sizeBytes: number;
  contentType: string | null;
};

export type ListedObject = {
  key: string;
  lastModified: Date | null;
};

export abstract class StorageService {
  abstract save(input: SaveFileInput): Promise<void>;
  /**
   * Lee el objeto. `range` es el valor de la cabecera HTTP `Range`
   * (`bytes=0-1023`, `bytes=500-`) y se reenvía tal cual al proveedor, que
   * resuelve la porción.
   */
  abstract read(key: string, range?: string): Promise<StoredObject>;
  abstract delete(key: string): Promise<void>;
  /** URL prefirmada para que el navegador suba un objeto directamente. */
  abstract createUploadUrl(input: UploadUrlInput): Promise<PresignedUpload>;
  /** Metadatos del objeto, o `null` si no existe. */
  abstract stat(key: string): Promise<StoredObjectInfo | null>;
  /** Lista los objetos bajo un prefijo, paginando internamente. */
  abstract listObjects(prefix: string): Promise<ListedObject[]>;
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

export function projectStoragePrefix(projectId: number): string {
  return `projects/${projectId}/`;
}
