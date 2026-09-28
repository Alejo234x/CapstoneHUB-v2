import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { S3StorageService } from './s3-storage.service';
import { StorageGcService } from './storage-gc.service';
import { StorageService } from './storage.service';

@Module({
  providers: [
    {
      provide: StorageService,
      useClass: S3StorageService,
    },
    StorageGcService,
    PrismaService,
  ],
  exports: [StorageService, StorageGcService],
})
export class StorageModule {}
