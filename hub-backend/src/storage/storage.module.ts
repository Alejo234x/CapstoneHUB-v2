import { Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';
import { StorageService } from './storage.service';

@Module({
  providers: [
    {
      provide: StorageService,
      useFactory: (): StorageService => {
        const driver = (process.env.STORAGE_DRIVER ?? 'local').toLowerCase();
        return driver === 's3'
          ? new S3StorageService()
          : new LocalStorageService();
      },
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
