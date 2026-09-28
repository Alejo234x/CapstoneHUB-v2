import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Readable } from 'node:stream';
import {
  ListedObject,
  PresignedUpload,
  SaveFileInput,
  StorageService,
  StoredObject,
  StoredObjectInfo,
  UploadUrlInput,
} from './storage.service';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new InternalServerErrorException(
      `${name} is required to store project attachments`,
    );
  }
  return value;
}

@Injectable()
export class S3StorageService extends StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly bucket: string;
  private readonly client: S3Client;
  private readonly publicClient: S3Client;

  constructor() {
    super();
    this.bucket = requireEnv('S3_BUCKET');

    const region = process.env.S3_REGION?.trim() || 'us-east-1';
    const forcePathStyle =
      (process.env.S3_FORCE_PATH_STYLE ?? 'true').toLowerCase() !== 'false';
    const credentials = {
      accessKeyId: requireEnv('S3_ACCESS_KEY'),
      secretAccessKey: requireEnv('S3_SECRET_KEY'),
    };

    this.client = new S3Client({
      region,
      endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
      forcePathStyle,
      credentials,
    });

    const publicEndpoint = process.env.S3_PUBLIC_ENDPOINT?.trim();

    if (publicEndpoint) {
      // La firma incluye el host, así que se firma con el endpoint que el
      // navegador puede alcanzar, no con el interno de Docker.
      this.publicClient = new S3Client({
        region,
        endpoint: publicEndpoint,
        forcePathStyle,
        credentials,
      });
    } else {
      this.publicClient = this.client;
      this.logger.warn(
        'S3_PUBLIC_ENDPOINT is not set; presigned upload URLs will use S3_ENDPOINT and may be unreachable from the browser',
      );
    }
  }

  async save(input: SaveFileInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.buffer,
        ContentType: input.contentType,
      }),
    );
  }

  async read(key: string, range?: string): Promise<StoredObject> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ...(range ? { Range: range } : {}),
      }),
    );

    return {
      stream: response.Body as Readable,
      contentLength: response.ContentLength,
      contentRange: response.ContentRange,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async createUploadUrl(input: UploadUrlInput): Promise<PresignedUpload> {
    const url = await getSignedUrl(
      this.publicClient,
      new PutObjectCommand({ Bucket: this.bucket, Key: input.key }),
      { expiresIn: input.expiresInSeconds },
    );

    return {
      url,
      method: 'PUT',
      expiresInSeconds: input.expiresInSeconds,
    };
  }

  async stat(key: string): Promise<StoredObjectInfo | null> {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );

      return {
        sizeBytes: response.ContentLength ?? 0,
        contentType: response.ContentType ?? null,
      };
    } catch (error) {
      if (this.isNotFound(error)) {
        return null;
      }

      throw error;
    }
  }

  async listObjects(prefix: string): Promise<ListedObject[]> {
    const objects: ListedObject[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      for (const item of response.Contents ?? []) {
        if (item.Key) {
          objects.push({
            key: item.Key,
            lastModified: item.LastModified ?? null,
          });
        }
      }

      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return objects;
  }

  private isNotFound(error: unknown): boolean {
    const candidate = error as {
      name?: string;
      $metadata?: { httpStatusCode?: number };
    };

    return (
      candidate.name === 'NotFound' ||
      candidate.name === 'NoSuchKey' ||
      candidate.$metadata?.httpStatusCode === 404
    );
  }
}
