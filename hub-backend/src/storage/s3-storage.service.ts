import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Readable } from 'node:stream';
import { SaveFileInput, StorageService } from './storage.service';

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
  private readonly bucket: string;
  private readonly client: S3Client;

  constructor() {
    super();
    this.bucket = requireEnv('S3_BUCKET');
    this.client = new S3Client({
      region: process.env.S3_REGION?.trim() || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
      forcePathStyle:
        (process.env.S3_FORCE_PATH_STYLE ?? 'true').toLowerCase() !== 'false',
      credentials: {
        accessKeyId: requireEnv('S3_ACCESS_KEY'),
        secretAccessKey: requireEnv('S3_SECRET_KEY'),
      },
    });
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

  async read(key: string): Promise<Readable> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );

    return response.Body as Readable;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
