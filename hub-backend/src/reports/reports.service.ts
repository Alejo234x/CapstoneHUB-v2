import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ReportContentKind,
  ReportStatus,
} from '../generated/prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { AuthorizationService } from '../auth/authorization.service';
import { PrismaService } from '../prisma.service';
import {
  assertProjectExists,
  assertReportBelongsToProject,
} from '../common/lookups';
import {
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  REPORT_DOCUMENT_MIME_TYPES,
  REPORT_IMAGE_MIME_TYPES,
  REPORT_VIDEO_MIME_TYPES,
  UPLOAD_URL_TTL_SECONDS,
} from '../attachments/attachments.constants';
import {
  FileRange,
  StorageService,
  StoredObject,
  buildStorageKey,
  projectStoragePrefix,
} from '../storage/storage.service';
import {
  ProjectReportContentResponse,
  ProjectReportResponse,
  mapReport,
  mapReportContent,
  reportContentSelect,
  reportSelect,
} from './reports.select';
import {
  ConfirmReportFileContentDto,
  CreateReportContentDto,
  CreateReportDto,
  PresignReportFileContentDto,
  ReviewReportDto,
  UpdateReportContentDto,
  UpdateReportDto,
} from './reports.dto';

export type { ProjectReportResponse } from './reports.select';
export type ReportFileContentKind = 'image' | 'video' | 'file';

export type ReportContentStream = {
  content: ProjectReportContentResponse;
  stream: StoredObject['stream'];
  contentLength?: number;
  contentRange?: string;
  fileName: string;
  mimeType: string;
};

export type ReportFileUploadTarget = {
  storageKey: string;
  uploadUrl: string;
  method: 'PUT';
  expiresInSeconds: number;
};

export type ReportFileMetadata = {
  kind: ReportFileContentKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    private readonly storage: StorageService,
  ) {}

  async reportsByProject(
    projectId: number,
    user: AuthenticatedUser,
  ): Promise<ProjectReportResponse[]> {
    await this.assertProjectAccess(projectId, user);

    const reports = await this.prisma.projectReport.findMany({
      where: { projectId },
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
      select: reportSelect,
    });

    return reports.map(mapReport);
  }

  async createReport(params: {
    projectId: number;
    data: CreateReportDto;
    user: AuthenticatedUser;
  }): Promise<ProjectReportResponse> {
    const { projectId, data, user } = params;
    await this.assertCanManageReports(projectId, user);

    const report = await this.prisma.projectReport.create({
      data: {
        projectId,
        createdByUserId: user.id,
        title: this.normalizeTitle(data.title),
        description: data.description?.trim() || null,
        dueDate: data.dueDate,
        type: data.type,
      },
      select: reportSelect,
    });

    return mapReport(report);
  }

  async updateReport(params: {
    projectId: number;
    reportId: number;
    data: UpdateReportDto;
    user: AuthenticatedUser;
  }): Promise<ProjectReportResponse> {
    const { projectId, reportId, data, user } = params;
    const existing = await this.assertManageableReport(
      projectId,
      reportId,
      user,
    );

    const updateData: Prisma.ProjectReportUpdateInput = {};

    if (data.title !== undefined) {
      updateData.title = this.normalizeTitle(data.title);
    }

    if (data.description !== undefined) {
      updateData.description = data.description.trim() || null;
    }

    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate;
    }

    if (data.type !== undefined && data.type !== existing.type) {
      await this.assertReportTypeIsChangeable(reportId, existing.status);
      updateData.type = data.type;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No update fields provided');
    }

    const report = await this.prisma.projectReport.update({
      where: { id: reportId },
      data: updateData,
      select: reportSelect,
    });

    return mapReport(report);
  }

  async deleteReport(params: {
    projectId: number;
    reportId: number;
    user: AuthenticatedUser;
  }): Promise<ProjectReportResponse> {
    const { projectId, reportId, user } = params;
    await this.assertManageableReport(projectId, reportId, user);

    const report = await this.prisma.projectReport.delete({
      where: { id: reportId },
      select: reportSelect,
    });

    return mapReport(report);
  }

  async submitReport(params: {
    projectId: number;
    reportId: number;
    user: AuthenticatedUser;
  }): Promise<ProjectReportResponse> {
    const { projectId, reportId, user } = params;
    await this.assertProjectAccess(projectId, user);
    const existing = await assertReportBelongsToProject(
      this.prisma,
      projectId,
      reportId,
    );

    if (
      existing.status === ReportStatus.submitted ||
      existing.status === ReportStatus.accepted
    ) {
      throw new ConflictException('Report has already been submitted');
    }

    const contentCount = await this.prisma.projectReportContent.count({
      where: { reportId },
    });

    if (contentCount === 0) {
      throw new BadRequestException('Report has no content to submit');
    }

    const report = await this.prisma.projectReport.update({
      where: { id: reportId },
      data: {
        status: ReportStatus.submitted,
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedByUserId: null,
        reviewComment: null,
      },
      select: reportSelect,
    });

    return mapReport(report);
  }

  async reviewReport(params: {
    projectId: number;
    reportId: number;
    data: ReviewReportDto;
    user: AuthenticatedUser;
  }): Promise<ProjectReportResponse> {
    const { projectId, reportId, data, user } = params;
    const existing = await this.assertManageableReport(
      projectId,
      reportId,
      user,
    );

    if (existing.status !== ReportStatus.submitted) {
      throw new ConflictException('Only submitted reports can be reviewed');
    }

    const report = await this.prisma.projectReport.update({
      where: { id: reportId },
      data: {
        status: data.decision,
        reviewedAt: new Date(),
        reviewedByUserId: user.id,
        reviewComment: data.comment?.trim() || null,
      },
      select: reportSelect,
    });

    return mapReport(report);
  }

  async createContent(params: {
    projectId: number;
    reportId: number;
    data: CreateReportContentDto;
    user: AuthenticatedUser;
  }): Promise<ProjectReportContentResponse> {
    const { projectId, reportId, data, user } = params;
    const report = await this.assertContentMutationAllowed(
      projectId,
      reportId,
      user,
    );
    this.assertKindMatchesReportType(data.kind, report.type);

    if (data.kind === ReportContentKind.text) {
      return this.createTextContent({
        reportId,
        textContent: data.textContent,
        user,
      });
    }

    return this.createLinkContent({
      reportId,
      url: data.url,
      label: data.label,
      user,
    });
  }

  async presignFileContent(params: {
    projectId: number;
    reportId: number;
    data: PresignReportFileContentDto;
    user: AuthenticatedUser;
  }): Promise<ReportFileUploadTarget> {
    const { projectId, reportId, data, user } = params;
    const report = await this.assertContentMutationAllowed(
      projectId,
      reportId,
      user,
    );
    this.assertKindMatchesReportType(data.kind, report.type);
    this.assertFileMatchesKind({
      kind: data.kind,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
    });

    const storageKey = buildStorageKey(projectId, data.fileName);
    const upload = await this.storage.createUploadUrl({
      key: storageKey,
      expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
    });

    return {
      storageKey,
      uploadUrl: upload.url,
      method: upload.method,
      expiresInSeconds: upload.expiresInSeconds,
    };
  }

  async confirmFileContent(params: {
    projectId: number;
    reportId: number;
    data: ConfirmReportFileContentDto;
    user: AuthenticatedUser;
  }): Promise<ProjectReportContentResponse> {
    const { projectId, reportId, data, user } = params;
    const report = await this.assertContentMutationAllowed(
      projectId,
      reportId,
      user,
    );
    this.assertKindMatchesReportType(data.kind, report.type);

    if (!data.storageKey.startsWith(projectStoragePrefix(projectId))) {
      throw new BadRequestException(
        'Storage key does not belong to this project',
      );
    }

    this.assertFileMatchesKind({
      kind: data.kind,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
    });

    const stored = await this.storage.stat(data.storageKey);

    if (!stored) {
      throw new BadRequestException('Uploaded file was not found in storage');
    }

    const limit = this.fileLimitBytes(data.kind);

    if (stored.sizeBytes > limit) {
      await this.safeDelete(data.storageKey);
      throw new BadRequestException(
        `File exceeds the ${this.megabytes(limit)} MB limit`,
      );
    }

    const attachment = await this.prisma.projectAttachment.create({
      data: {
        projectId,
        reportId,
        uploadedByUserId: user.id,
        originalName: data.fileName,
        storageKey: data.storageKey,
        mimeType: data.mimeType,
        sizeBytes: stored.sizeBytes,
      },
      select: { id: true },
    });

    try {
      const content = await this.prisma.projectReportContent.create({
        data: {
          reportId,
          createdByUserId: user.id,
          kind: data.kind,
          attachmentId: attachment.id,
        },
        select: reportContentSelect,
      });

      return mapReportContent(content);
    } catch (error) {
      await this.removeAttachment(projectId, attachment.id);
      throw error;
    }
  }

  async updateContent(params: {
    projectId: number;
    reportId: number;
    contentId: number;
    data: UpdateReportContentDto;
    user: AuthenticatedUser;
  }): Promise<ProjectReportContentResponse> {
    const { projectId, reportId, contentId, data, user } = params;
    await this.assertContentMutationAllowed(projectId, reportId, user);
    const existing = await this.findContent(projectId, reportId, contentId);

    if (
      existing.kind !== ReportContentKind.text &&
      existing.kind !== ReportContentKind.link
    ) {
      throw new BadRequestException('Only text and link content can be edited');
    }

    const updateData: Prisma.ProjectReportContentUpdateInput = {};

    if (existing.kind === ReportContentKind.text) {
      if (data.textContent === undefined) {
        throw new BadRequestException('No update fields provided');
      }

      updateData.textContent = this.normalizeTextContent(data.textContent);
    } else {
      if (data.url === undefined && data.label === undefined) {
        throw new BadRequestException('No update fields provided');
      }

      if (data.url !== undefined) {
        updateData.url = this.normalizeUrl(data.url);
      }

      if (data.label !== undefined) {
        updateData.label = data.label.trim() || null;
      }
    }

    const content = await this.prisma.projectReportContent.update({
      where: { id: contentId },
      data: updateData,
      select: reportContentSelect,
    });

    return mapReportContent(content);
  }

  async deleteContent(params: {
    projectId: number;
    reportId: number;
    contentId: number;
    user: AuthenticatedUser;
  }): Promise<{ id: number }> {
    const { projectId, reportId, contentId, user } = params;
    await this.assertContentMutationAllowed(projectId, reportId, user);
    const existing = await this.findContent(projectId, reportId, contentId);

    await this.prisma.projectReportContent.delete({
      where: { id: contentId },
    });

    if (existing.attachmentId !== null) {
      await this.removeAttachment(projectId, existing.attachmentId);
    }

    return { id: contentId };
  }

  async openContentStream(params: {
    projectId: number;
    reportId: number;
    contentId: number;
    range?: FileRange;
    user: AuthenticatedUser;
  }): Promise<ReportContentStream> {
    const { projectId, reportId, contentId, range, user } = params;
    await this.assertProjectAccess(projectId, user);

    const content = await this.prisma.projectReportContent.findFirst({
      where: { id: contentId, reportId, report: { projectId } },
      select: reportContentSelect,
    });

    if (!content) {
      throw new NotFoundException(
        `Content ${contentId} not found in report ${reportId}`,
      );
    }

    if (!content.attachment) {
      throw new BadRequestException('Content has no file to stream');
    }

    try {
      const stored = await this.storage.read(
        content.attachment.storageKey,
        range,
      );

      return {
        content: mapReportContent(content),
        stream: stored.stream,
        contentLength: stored.contentLength,
        contentRange: stored.contentRange,
        fileName: content.attachment.originalName,
        mimeType: content.attachment.mimeType,
      };
    } catch (error) {
      if ((error as { name?: string }).name === 'InvalidRange') {
        throw new HttpException(
          'Requested range not satisfiable',
          HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
        );
      }

      throw error;
    }
  }

  private async createTextContent(params: {
    reportId: number;
    textContent: string | undefined;
    user: AuthenticatedUser;
  }): Promise<ProjectReportContentResponse> {
    const { reportId, textContent, user } = params;
    const normalized = this.normalizeTextContent(textContent);

    const content = await this.prisma.projectReportContent.create({
      data: {
        reportId,
        createdByUserId: user.id,
        kind: ReportContentKind.text,
        textContent: normalized,
      },
      select: reportContentSelect,
    });

    return mapReportContent(content);
  }

  private async createLinkContent(params: {
    reportId: number;
    url: string | undefined;
    label: string | undefined;
    user: AuthenticatedUser;
  }): Promise<ProjectReportContentResponse> {
    const { reportId, url, label, user } = params;

    const content = await this.prisma.projectReportContent.create({
      data: {
        reportId,
        createdByUserId: user.id,
        kind: ReportContentKind.link,
        url: this.normalizeUrl(url),
        label: label?.trim() || null,
      },
      select: reportContentSelect,
    });

    return mapReportContent(content);
  }

  private async findContent(
    projectId: number,
    reportId: number,
    contentId: number,
  ): Promise<{
    id: number;
    kind: ReportContentKind;
    attachmentId: number | null;
    createdByUserId: number | null;
  }> {
    const content = await this.prisma.projectReportContent.findFirst({
      where: { id: contentId, reportId, report: { projectId } },
      select: {
        id: true,
        kind: true,
        attachmentId: true,
        createdByUserId: true,
      },
    });

    if (!content) {
      throw new NotFoundException(
        `Content ${contentId} not found in report ${reportId}`,
      );
    }

    return content;
  }

  /**
   * Borra el adjunto y su objeto en almacenamiento. La autorización ya se
   * validó en el flujo de contenido, así que no se reutiliza el servicio de
   * anexos (que aplica permisos distintos).
   */
  private async removeAttachment(
    projectId: number,
    attachmentId: number,
  ): Promise<void> {
    const attachment = await this.prisma.projectAttachment.findFirst({
      where: { id: attachmentId, projectId },
      select: { storageKey: true },
    });

    if (!attachment) {
      return;
    }

    try {
      await this.prisma.projectAttachment.delete({
        where: { id: attachmentId },
      });
    } catch {
      // Si la fila ya no existe se ignora; el contenido ya quedó eliminado.
    }

    await this.safeDelete(attachment.storageKey);
  }

  private async safeDelete(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch {
      // El objeto puede no existir; no se revierte la operación.
    }
  }

  private normalizeTitle(title: string): string {
    const trimmed = title.trim();
    if (!trimmed) {
      throw new BadRequestException('Report title is required');
    }

    return trimmed;
  }

  private normalizeTextContent(value: string | undefined): string {
    const trimmed = value?.trim() ?? '';

    if (!trimmed) {
      throw new BadRequestException('Text content is required');
    }

    return trimmed;
  }

  private normalizeUrl(value: string | undefined): string {
    const trimmed = value?.trim() ?? '';

    if (!trimmed) {
      throw new BadRequestException('Link URL is required');
    }

    let parsed: URL;

    try {
      parsed = new URL(trimmed);
    } catch {
      throw new BadRequestException('Link URL is not valid');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException('Link URL must use http or https');
    }

    return parsed.toString();
  }

  private assertFileMatchesKind(
    metadata: Omit<ReportFileMetadata, 'fileName'>,
  ): void {
    const { kind, mimeType, sizeBytes } = metadata;
    const allowed = this.allowedMimeTypesForKind(kind);

    if (!allowed.has(mimeType)) {
      throw new BadRequestException(
        `Unsupported ${kind} file type: ${mimeType}`,
      );
    }

    this.assertStoredSizeWithinLimit(kind, sizeBytes);
  }

  private assertStoredSizeWithinLimit(
    kind: ReportFileContentKind,
    sizeBytes: number,
  ): void {
    const limit = this.fileLimitBytes(kind);

    if (sizeBytes > limit) {
      throw new BadRequestException(
        `File exceeds the ${this.megabytes(limit)} MB limit`,
      );
    }
  }

  private allowedMimeTypesForKind(
    kind: ReportFileContentKind,
  ): ReadonlySet<string> {
    if (kind === ReportContentKind.video) {
      return REPORT_VIDEO_MIME_TYPES;
    }

    if (kind === ReportContentKind.image) {
      return REPORT_IMAGE_MIME_TYPES;
    }

    return REPORT_DOCUMENT_MIME_TYPES;
  }

  private fileLimitBytes(kind: ReportFileContentKind): number {
    return kind === ReportContentKind.video
      ? MAX_VIDEO_SIZE_BYTES
      : MAX_ATTACHMENT_SIZE_BYTES;
  }

  private megabytes(bytes: number): number {
    return Math.round(bytes / (1024 * 1024));
  }

  private async assertContentMutationAllowed(
    projectId: number,
    reportId: number,
    user: AuthenticatedUser,
  ): Promise<{ id: number; status: ReportStatus; type: ReportContentKind }> {
    await this.assertProjectAccess(projectId, user);
    const report = await assertReportBelongsToProject(
      this.prisma,
      projectId,
      reportId,
    );

    if (
      report.status !== ReportStatus.pending &&
      report.status !== ReportStatus.rejected
    ) {
      throw new ConflictException('Report is not editable');
    }

    return report;
  }

  private assertKindMatchesReportType(
    kind: ReportContentKind,
    reportType: ReportContentKind,
  ): void {
    if (kind !== reportType) {
      throw new BadRequestException(
        `This report only accepts ${reportType} content`,
      );
    }
  }

  private async assertReportTypeIsChangeable(
    reportId: number,
    status: ReportStatus,
  ): Promise<void> {
    if (status !== ReportStatus.pending) {
      throw new ConflictException('Only pending reports can change their type');
    }

    const contentCount = await this.prisma.projectReportContent.count({
      where: { reportId },
    });

    if (contentCount > 0) {
      throw new ConflictException(
        'Cannot change the type of a report that already has content',
      );
    }
  }

  private async assertProjectAccess(
    projectId: number,
    user: AuthenticatedUser,
  ): Promise<void> {
    await assertProjectExists(this.prisma, projectId);
    await this.authorization.assertProjectMember(user, projectId);
  }

  private async assertCanManageReports(
    projectId: number,
    user: AuthenticatedUser,
  ): Promise<void> {
    await assertProjectExists(this.prisma, projectId);
    await this.authorization.assertCanManageMilestone(user, projectId);
  }

  private async assertManageableReport(
    projectId: number,
    reportId: number,
    user: AuthenticatedUser,
  ): Promise<{ id: number; status: ReportStatus; type: ReportContentKind }> {
    await this.assertCanManageReports(projectId, user);

    return assertReportBelongsToProject(this.prisma, projectId, reportId);
  }
}
