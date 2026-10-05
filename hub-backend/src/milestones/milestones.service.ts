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
import { assertProjectExists } from '../common/lookups';
import { CreateMilestoneDto, UpdateMilestoneDto } from './milestones.dto';

const milestoneSelect = {
  id: true,
  projectId: true,
  title: true,
  description: true,
  dueDate: true,
  completed: true,
  isMinimum: true,
  phase: true,
  createdAt: true,
  reportLinks: {
    select: {
      report: { select: { id: true, title: true, status: true } },
    },
  },
} as const satisfies Prisma.ProjectMilestonesSelect;

export type SelectedMilestone = Prisma.ProjectMilestonesGetPayload<{
  select: typeof milestoneSelect;
}>;

export type MilestoneReportSummary = {
  id: number;
  title: string;
  status: ReportStatus;
};

export type ProjectMilestoneResponse = Omit<
  SelectedMilestone,
  'reportLinks'
> & {
  reports: MilestoneReportSummary[];
};

function mapMilestone(milestone: SelectedMilestone): ProjectMilestoneResponse {
  const { reportLinks, ...rest } = milestone;
  return {
    ...rest,
    reports: reportLinks.map((link) => ({
      id: link.report.id,
      title: link.report.title,
      status: link.report.status,
    })),
  };
}

@Injectable()
export class MilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
  ) {}

  async milestonesByProject(
    projectId: number,
    user: AuthenticatedUser,
  ): Promise<ProjectMilestoneResponse[]> {
    await assertProjectExists(this.prisma, projectId);
    await this.authorization.assertProjectMember(user, projectId);

    const milestones = await this.prisma.projectMilestones.findMany({
      where: { projectId },
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
      select: milestoneSelect,
    });

    return milestones.map(mapMilestone);
  }

  async createMilestone(params: {
    projectId: number;
    data: CreateMilestoneDto;
    user: AuthenticatedUser;
  }): Promise<ProjectMilestoneResponse> {
    const project = await this.prisma.project.findUnique({
      where: { id: params.projectId },
      select: { id: true, phase: true },
    });
    if (!project) {
      throw new NotFoundException(`Project ${params.projectId} not found`);
    }
    await this.authorization.assertCanManageMilestone(
      params.user,
      params.projectId,
    );

    const title = params.data.title.trim();
    if (!title) {
      throw new BadRequestException('Milestone title is required');
    }

    const reportIds = this.normalizeReportIds(params.data.reportIds);
    await this.assertReportsBelongToProject(params.projectId, reportIds);

    const milestoneId = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.projectMilestones.create({
        data: {
          projectId: params.projectId,
          title,
          description: params.data.description?.trim() || null,
          dueDate: params.data.dueDate,
          completed: params.data.completed ?? false,
          isMinimum: params.data.isMinimum ?? false,
          phase: params.data.phase ?? project.phase,
        },
        select: { id: true },
      });

      if (reportIds.length > 0) {
        await transaction.milestoneReportLink.createMany({
          data: reportIds.map((reportId) => ({
            milestoneId: created.id,
            reportId,
          })),
        });
      }

      if (params.data.completed === true) {
        await this.assertLinkedReportsAccepted(transaction, created.id);
      }

      return created.id;
    });

    return this.getMilestoneOrThrow(milestoneId);
  }

  async updateMilestone(params: {
    projectId: number;
    milestoneId: number;
    data: UpdateMilestoneDto;
    user: AuthenticatedUser;
  }): Promise<ProjectMilestoneResponse> {
    await assertProjectExists(this.prisma, params.projectId);
    await this.authorization.assertCanManageMilestone(
      params.user,
      params.projectId,
    );
    await this.assertMilestoneBelongsToProject(
      params.projectId,
      params.milestoneId,
    );

    const updateData: Prisma.ProjectMilestonesUpdateInput = {};

    if (params.data.title !== undefined) {
      const title = params.data.title.trim();
      if (!title) {
        throw new BadRequestException('Milestone title is required');
      }
      updateData.title = title;
    }
    if (params.data.description !== undefined) {
      updateData.description = params.data.description.trim() || null;
    }
    if (params.data.dueDate !== undefined) {
      updateData.dueDate = params.data.dueDate;
    }
    if (params.data.isMinimum !== undefined) {
      updateData.isMinimum = params.data.isMinimum;
    }
    if (params.data.phase !== undefined) {
      updateData.phase = params.data.phase;
    }

    const reportIds =
      params.data.reportIds !== undefined
        ? this.normalizeReportIds(params.data.reportIds)
        : undefined;
    if (reportIds !== undefined) {
      await this.assertReportsBelongToProject(params.projectId, reportIds);
    }

    const hasFieldUpdate = Object.keys(updateData).length > 0;
    const hasCompletedUpdate = params.data.completed !== undefined;
    if (!hasFieldUpdate && reportIds === undefined && !hasCompletedUpdate) {
      throw new BadRequestException('No update fields provided');
    }

    await this.prisma.$transaction(async (transaction) => {
      if (reportIds !== undefined) {
        await transaction.milestoneReportLink.deleteMany({
          where: { milestoneId: params.milestoneId },
        });
        if (reportIds.length > 0) {
          await transaction.milestoneReportLink.createMany({
            data: reportIds.map((reportId) => ({
              milestoneId: params.milestoneId,
              reportId,
            })),
          });
        }
      }

      if (hasFieldUpdate) {
        await transaction.projectMilestones.update({
          where: { id: params.milestoneId },
          data: updateData,
        });
      }

      if (params.data.completed === true) {
        await this.assertLinkedReportsAccepted(transaction, params.milestoneId);
        await transaction.projectMilestones.update({
          where: { id: params.milestoneId },
          data: { completed: true },
        });
      } else if (params.data.completed === false) {
        await transaction.projectMilestones.update({
          where: { id: params.milestoneId },
          data: { completed: false },
        });
      }
    });

    return this.getMilestoneOrThrow(params.milestoneId);
  }

  async deleteMilestone(params: {
    projectId: number;
    milestoneId: number;
    user: AuthenticatedUser;
  }): Promise<ProjectMilestoneResponse> {
    await assertProjectExists(this.prisma, params.projectId);
    await this.authorization.assertCanManageMilestone(
      params.user,
      params.projectId,
    );
    await this.assertMilestoneBelongsToProject(
      params.projectId,
      params.milestoneId,
    );

    const milestone = await this.prisma.projectMilestones.delete({
      where: { id: params.milestoneId },
      select: milestoneSelect,
    });

    return mapMilestone(milestone);
  }

  private async getMilestoneOrThrow(
    milestoneId: number,
  ): Promise<ProjectMilestoneResponse> {
    const milestone = await this.prisma.projectMilestones.findUnique({
      where: { id: milestoneId },
      select: milestoneSelect,
    });
    if (!milestone) {
      throw new NotFoundException(`Milestone ${milestoneId} not found`);
    }
    return mapMilestone(milestone);
  }

  private normalizeReportIds(reportIds?: number[]): number[] {
    if (!reportIds || reportIds.length === 0) {
      return [];
    }
    return [...new Set(reportIds)];
  }

  private async assertReportsBelongToProject(
    projectId: number,
    reportIds: number[],
  ): Promise<void> {
    if (reportIds.length === 0) {
      return;
    }
    const reports = await this.prisma.projectReport.findMany({
      where: { id: { in: reportIds }, projectId },
      select: { id: true },
    });
    if (reports.length !== reportIds.length) {
      throw new BadRequestException(
        'Some reports do not belong to this project',
      );
    }
  }

  /** Bloquea completar un hito si alguna entrega vinculada no está aceptada. */
  private async assertLinkedReportsAccepted(
    transaction: Prisma.TransactionClient,
    milestoneId: number,
  ): Promise<void> {
    const links = await transaction.milestoneReportLink.findMany({
      where: { milestoneId },
      select: {
        report: { select: { id: true, title: true, status: true } },
      },
    });
    const pending = links
      .map((link) => link.report)
      .filter((report) => report.status !== ReportStatus.accepted);

    if (pending.length > 0) {
      throw new ConflictException(
        `Cannot complete the milestone while linked reports are not accepted: ${pending
          .map((report) => report.title)
          .join(', ')}`,
      );
    }
  }

  private async assertMilestoneBelongsToProject(
    projectId: number,
    milestoneId: number,
  ): Promise<void> {
    const milestone = await this.prisma.projectMilestones.findFirst({
      where: { id: milestoneId, projectId },
      select: { id: true },
    });

    if (!milestone) {
      throw new NotFoundException(
        `Milestone ${milestoneId} not found in project ${projectId}`,
      );
    }
  }
}
