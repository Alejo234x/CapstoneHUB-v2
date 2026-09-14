import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReportStatus } from '../generated/prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { AuthorizationService } from '../auth/authorization.service';
import { PrismaService } from '../prisma.service';
import {
  CreateReportDto,
  ReviewReportDto,
  SubmitReportDto,
  UpdateReportDto,
} from './reports.dto';

const reportAttachmentSelect = {
  id: true,
  projectId: true,
  reportId: true,
  originalName: true,
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

const reportSelect = {
  id: true,
  projectId: true,
  title: true,
  description: true,
  dueDate: true,
  status: true,
  submittedAt: true,
  reviewedAt: true,
  reviewComment: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  reviewedBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  attachments: {
    select: reportAttachmentSelect,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  },
} as const satisfies Prisma.ProjectReportSelect;

export type SelectedReport = Prisma.ProjectReportGetPayload<{
  select: typeof reportSelect;
}>;

export type ReportAttachmentResponse = {
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

export type ProjectReportResponse = {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  dueDate: Date;
  status: ReportStatus;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewComment: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: number;
    fullName: string;
    email: string;
  } | null;
  reviewedBy: {
    id: number;
    fullName: string;
    email: string;
  } | null;
  attachments: ReportAttachmentResponse[];
};

function mapReport(report: SelectedReport): ProjectReportResponse {
  return {
    id: report.id,
    projectId: report.projectId,
    title: report.title,
    description: report.description,
    dueDate: report.dueDate,
    status: report.status,
    submittedAt: report.submittedAt,
    reviewedAt: report.reviewedAt,
    reviewComment: report.reviewComment,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    createdBy: report.createdBy,
    reviewedBy: report.reviewedBy,
    attachments: report.attachments.map((attachment) => ({
      id: attachment.id,
      projectId: attachment.projectId,
      reportId: attachment.reportId,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      createdAt: attachment.createdAt,
      uploadedBy: attachment.uploadedBy,
    })),
  };
}

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
    await this.assertProjectExists(projectId);
    await this.authorization.assertProjectMember(user, projectId);

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
    await this.assertProjectExists(projectId);
    await this.authorization.assertCanManageMilestone(user, projectId);

    const title = data.title.trim();
    if (!title) {
      throw new BadRequestException('Report title is required');
    }

    const report = await this.prisma.projectReport.create({
      data: {
        projectId,
        createdByUserId: user.id,
        title,
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
    await this.assertProjectExists(projectId);
    await this.authorization.assertCanManageMilestone(user, projectId);
    await this.assertReportBelongsToProject(projectId, reportId);

    const updateData: Prisma.ProjectReportUpdateInput = {};

    if (data.title !== undefined) {
      const title = data.title.trim();
      if (!title) {
        throw new BadRequestException('Report title is required');
      }
      updateData.title = title;
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
    await this.assertProjectExists(projectId);
    await this.authorization.assertCanManageMilestone(user, projectId);
    await this.assertReportBelongsToProject(projectId, reportId);

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
    await this.assertProjectExists(projectId);
    await this.authorization.assertProjectMember(user, projectId);
    const existing = await this.assertReportBelongsToProject(
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
    if (attachmentIds.length > 0) {
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
    await this.assertProjectExists(projectId);
    await this.authorization.assertCanManageMilestone(user, projectId);
    const existing = await this.assertReportBelongsToProject(
      projectId,
      reportId,
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
  ): Promise<{ id: number; status: ReportStatus }> {
    const report = await this.prisma.projectReport.findFirst({
      where: { id: reportId, projectId },
      select: { id: true, status: true },
    });

    if (!report) {
      throw new NotFoundException(
        `Report ${reportId} not found in project ${projectId}`,
      );
    }

    return report;
  }
}
