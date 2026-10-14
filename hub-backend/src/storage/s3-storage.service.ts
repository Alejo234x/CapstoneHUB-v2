import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import {
  ListedObject,
  SaveFileInput,
  SaveFilePathInput,
  StorageService,
  StoredObject,
  StoredObjectInfo,
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
export class S3StorageService extends StorageService implements OnModuleInit {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly bucket: string;
  private readonly client: S3Client;
  private bucketEnsured = false;

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
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureBucketReady();
    } catch (error) {
      // El servicio arranca igual aunque el storage aún no responda; el bucket
      // se reintentará en la primera escritura.
      this.logger.warn(
        'No se pudo asegurar el bucket de almacenamiento al iniciar',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      if (this.isNotFound(error)) {
        await this.client.send(
          new CreateBucketCommand({ Bucket: this.bucket }),
        );
        return;
      }
      throw error;
    }
  }

  private async ensureBucketReady(): Promise<void> {
    if (this.bucketEnsured) {
      return;
    }

    await this.ensureBucket();
    this.bucketEnsured = true;
  }

  async save(input: SaveFileInput): Promise<void> {
    await this.ensureBucketReady();

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.buffer,
        ContentType: input.contentType,
      }),
    );
  }

  async saveFromFile(input: SaveFilePathInput): Promise<void> {
    await this.ensureBucketReady();

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: createReadStream(input.filePath),
        ContentLength: input.sizeBytes,
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
      candidate.name === 'NoSuchBucket' ||
      candidate.$metadata?.httpStatusCode === 404
    );
  }
}
