import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, PrismaService],
})
export class AttachmentsModule {}
