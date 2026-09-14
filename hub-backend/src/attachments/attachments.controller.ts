import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
} from './attachments.constants';
import { AttachmentsService } from './attachments.service';
import { ProjectAttachmentResponse } from './attachments.select';

function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(
    filename,
  )}`;
}

@Controller('projects/:projectId/attachments')
@UseGuards(AuthGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get()
  listAttachments(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProjectAttachmentResponse[]> {
    return this.attachmentsService.attachmentsByProject(
      Number(projectId),
      user,
    );
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES },
      fileFilter: (_request, file, callback) => {
        if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(file.mimetype)) {
          callback(
            new BadRequestException(`Unsupported file type: ${file.mimetype}`),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  uploadAttachment(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('reportId') reportId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProjectAttachmentResponse> {
    if (!file) {
      throw new BadRequestException('A file is required');
    }

    const parsedReportId =
      reportId === undefined || reportId === '' ? undefined : Number(reportId);

    if (parsedReportId !== undefined && Number.isNaN(parsedReportId)) {
      throw new BadRequestException('reportId must be a number');
    }

    return this.attachmentsService.createAttachment({
      projectId: Number(projectId),
      file,
      reportId: parsedReportId,
      user,
    });
  }

  @Get(':attachmentId/download')
  async downloadAttachment(
    @Param('projectId') projectId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { attachment, stream } =
      await this.attachmentsService.downloadAttachment({
        projectId: Number(projectId),
        attachmentId: Number(attachmentId),
        user,
      });

    response.set({
      'Content-Type': attachment.mimeType,
      'Content-Length': String(attachment.sizeBytes),
      'Content-Disposition': contentDisposition(attachment.originalName),
    });

    return new StreamableFile(stream);
  }

  @Delete(':attachmentId')
  deleteAttachment(
    @Param('projectId') projectId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProjectAttachmentResponse> {
    return this.attachmentsService.deleteAttachment({
      projectId: Number(projectId),
      attachmentId: Number(attachmentId),
      user,
    });
  }
}
