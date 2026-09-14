import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma, ReportStatus } from '../generated/prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { AuthorizationService } from '../auth/authorization.service';
import { PrismaService } from '../prisma.service';
import {
  assertProjectExists,
  assertReportBelongsToProject,
} from '../common/lookups';
import {
  ProjectReportResponse,
  mapReport,
  reportSelect,
} from './reports.select';
import {
  CreateReportDto,
  ReviewReportDto,
  SubmitReportDto,
  UpdateReportDto,
} from './reports.dto';

export type { ProjectReportResponse } from './reports.select';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
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
    await this.assertManageableReport(projectId, reportId, user);

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
    data: SubmitReportDto;
    user: AuthenticatedUser;
  }): Promise<ProjectReportResponse> {
    const { projectId, reportId, data, user } = params;
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

    const attachmentIds = data.attachmentIds ?? [];
    await this.assertAttachmentsBelongToProject(projectId, attachmentIds);

    const report = await this.prisma.$transaction(async (transaction) => {
      if (attachmentIds.length > 0) {
        await transaction.projectAttachment.updateMany({
          where: { id: { in: attachmentIds }, projectId },
          data: { reportId },
        });
      }

      return transaction.projectReport.update({
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

  private normalizeTitle(title: string): string {
    const trimmed = title.trim();
    if (!trimmed) {
      throw new BadRequestException('Report title is required');
    }

    return trimmed;
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
  ): Promise<{ id: number; status: ReportStatus }> {
    await this.assertCanManageReports(projectId, user);

    return assertReportBelongsToProject(this.prisma, projectId, reportId);
  }

  private async assertAttachmentsBelongToProject(
    projectId: number,
    attachmentIds: number[],
  ): Promise<void> {
    if (attachmentIds.length === 0) {
      return;
    }

    const attachments = await this.prisma.projectAttachment.findMany({
      where: { id: { in: attachmentIds }, projectId },
      select: { id: true },
    });

    if (attachments.length !== new Set(attachmentIds).size) {
      throw new BadRequestException(
        'One or more attachments do not belong to this project',
      );
    }
  }
}
