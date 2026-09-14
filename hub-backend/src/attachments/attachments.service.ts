import { Injectable, NotFoundException } from '@nestjs/common';
import { Readable } from 'node:stream';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { StorageService, buildStorageKey } from '../storage/storage.service';

export const attachmentSelect = {
  id: true,
  projectId: true,
  reportId: true,
  uploadedByUserId: true,
  originalName: true,
  storageKey: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
  uploadedBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} as const satisfies Prisma.ProjectAttachmentSelect;

export type SelectedAttachment = Prisma.ProjectAttachmentGetPayload<{
  select: typeof attachmentSelect;
}>;

export type ProjectAttachmentResponse = {
  id: number;
  projectId: number;
  reportId: number | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  uploadedBy: {
    id: number;
    fullName: string;
    email: string;
  } | null;
};

export type DownloadedAttachment = {
  attachment: ProjectAttachmentResponse;
  stream: Readable;
};

function mapAttachment(
  attachment: SelectedAttachment,
): ProjectAttachmentResponse {
  return {
    id: attachment.id,
    projectId: attachment.projectId,
    reportId: attachment.reportId,
    originalName: attachment.originalName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    createdAt: attachment.createdAt,
    uploadedBy: attachment.uploadedBy,
  };
}

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly authorization: AuthorizationService,
  ) {}

  async attachmentsByProject(
    projectId: number,
    user: AuthenticatedUser,
  ): Promise<ProjectAttachmentResponse[]> {
    await this.assertProjectExists(projectId);
    await this.authorization.assertProjectMember(user, projectId);

    const attachments = await this.prisma.projectAttachment.findMany({
      where: { projectId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: attachmentSelect,
    });

    return attachments.map(mapAttachment);
  }

  async createAttachment(params: {
    projectId: number;
    file: Express.Multer.File;
    reportId?: number;
    user: AuthenticatedUser;
  }): Promise<ProjectAttachmentResponse> {
    const { projectId, file, user, reportId } = params;
    await this.assertProjectExists(projectId);
    await this.authorization.assertProjectMember(user, projectId);

    if (reportId !== undefined) {
      await this.assertReportBelongsToProject(projectId, reportId);
    }

    const storageKey = buildStorageKey(projectId, file.originalname);

    await this.storage.save({
      key: storageKey,
      buffer: file.buffer,
      contentType: file.mimetype,
    });

    try {
      const attachment = await this.prisma.projectAttachment.create({
        data: {
          projectId,
          reportId: reportId ?? null,
          uploadedByUserId: user.id,
          originalName: file.originalname,
          storageKey,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        },
        select: attachmentSelect,
      });

      return mapAttachment(attachment);
    } catch (error) {
      await this.storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
  }

  async downloadAttachment(params: {
    projectId: number;
    attachmentId: number;
    user: AuthenticatedUser;
  }): Promise<DownloadedAttachment> {
    const { projectId, attachmentId, user } = params;
    await this.assertProjectExists(projectId);
    await this.authorization.assertProjectMember(user, projectId);

    const attachment = await this.prisma.projectAttachment.findFirst({
      where: { id: attachmentId, projectId },
      select: attachmentSelect,
    });

    if (!attachment) {
      throw new NotFoundException(
        `Attachment ${attachmentId} not found in project ${projectId}`,
      );
    }

    const stream = await this.storage.read(attachment.storageKey);

    return { attachment: mapAttachment(attachment), stream };
  }

  async deleteAttachment(params: {
    projectId: number;
    attachmentId: number;
    user: AuthenticatedUser;
  }): Promise<ProjectAttachmentResponse> {
    const { projectId, attachmentId, user } = params;
    await this.assertProjectExists(projectId);
    await this.authorization.assertProjectMember(user, projectId);

    const attachment = await this.prisma.projectAttachment.findFirst({
      where: { id: attachmentId, projectId },
      select: attachmentSelect,
    });

    if (!attachment) {
      throw new NotFoundException(
        `Attachment ${attachmentId} not found in project ${projectId}`,
      );
    }

    if (attachment.uploadedByUserId !== user.id) {
      await this.authorization.assertCanManageProject(user, projectId);
    }

    await this.prisma.projectAttachment.delete({
      where: { id: attachment.id },
    });
    await this.storage.delete(attachment.storageKey);

    return mapAttachment(attachment);
  }

  private async assertProjectExists(projectId: number): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
  }

  private async assertReportBelongsToProject(
    projectId: number,
    reportId: number,
  ): Promise<void> {
    const report = await this.prisma.projectReport.findFirst({
      where: { id: reportId, projectId },
      select: { id: true },
    });

    if (!report) {
      throw new NotFoundException(
        `Report ${reportId} not found in project ${projectId}`,
      );
    }
  }
}
