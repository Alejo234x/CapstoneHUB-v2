import { MilestonesService } from './milestones.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectPhase, ReportStatus } from '../generated/prisma/client';

describe('MilestonesService', () => {
  const user = {
    id: 7,
    fullName: 'Coordinator',
    email: 'coordinator@example.com',
    roles: ['coordinator'],
  } as never;

  function createService() {
    const prisma = {
      project: { findUnique: jest.fn() },
      projectReport: { findMany: jest.fn().mockResolvedValue([]) },
      projectMilestones: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      milestoneReportLink: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      (callback: (transaction: unknown) => unknown) => callback(prisma),
    );

    const authorization = {
      assertProjectMember: jest.fn(),
      assertCanManageMilestone: jest.fn(),
    };

    return {
      service: new MilestonesService(prisma as never, authorization as never),
      prisma,
      authorization,
    };
  }

  function selectedMilestone(overrides: Record<string, unknown> = {}) {
    return {
      id: 2,
      projectId: 10,
      title: 'Plan',
      description: 'Details',
      dueDate: new Date('2026-10-01'),
      completed: false,
      isMinimum: false,
      phase: ProjectPhase.semester_1,
      createdAt: new Date('2026-09-12'),
      reportLinks: [],
      ...overrides,
    };
  }

  it('lists a project milestones in due-date order', async () => {
    const { service, prisma, authorization } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectMilestones.findMany.mockResolvedValue([selectedMilestone()]);

    const result = await service.milestonesByProject(10, user);

    expect(result).toEqual([
      {
        id: 2,
        projectId: 10,
        title: 'Plan',
        description: 'Details',
        dueDate: new Date('2026-10-01'),
        completed: false,
        isMinimum: false,
        phase: ProjectPhase.semester_1,
        createdAt: new Date('2026-09-12'),
        reports: [],
      },
    ]);
    expect(authorization.assertProjectMember).toHaveBeenCalledWith(user, 10);
  });

  it('creates a trimmed milestone for an authorized project manager', async () => {
    const { service, prisma, authorization } = createService();
    const createMilestone = jest
      .fn<Promise<{ id: number }>, [{ data: Record<string, unknown> }]>()
      .mockResolvedValue({ id: 2 });
    prisma.project.findUnique.mockResolvedValue({
      id: 10,
      phase: ProjectPhase.semester_1,
    });
    prisma.projectMilestones.create = createMilestone;
    prisma.projectMilestones.findUnique.mockResolvedValue(selectedMilestone());

    const result = await service.createMilestone({
      projectId: 10,
      user,
      data: {
        title: ' Plan ',
        description: ' Details ',
        dueDate: new Date('2026-10-01'),
      },
    });

    expect(result).toMatchObject({ id: 2, reports: [] });
    expect(authorization.assertCanManageMilestone).toHaveBeenCalledWith(
      user,
      10,
    );
    expect(createMilestone).toHaveBeenCalledTimes(1);
    expect(createMilestone.mock.calls[0][0].data).toMatchObject({
      title: 'Plan',
      description: 'Details',
      completed: false,
      isMinimum: false,
      phase: ProjectPhase.semester_1,
    });
  });

  it('links reports when creating a milestone', async () => {
    const { service, prisma } = createService();
    prisma.project.findUnique.mockResolvedValue({
      id: 10,
      phase: ProjectPhase.semester_1,
    });
    prisma.projectReport.findMany.mockResolvedValue([{ id: 5 }, { id: 6 }]);
    prisma.projectMilestones.create.mockResolvedValue({ id: 2 });
    prisma.projectMilestones.findUnique.mockResolvedValue(selectedMilestone());

    await service.createMilestone({
      projectId: 10,
      user,
      data: {
        title: 'Plan',
        dueDate: new Date('2026-10-01'),
        reportIds: [5, 6],
      },
    });

    expect(prisma.milestoneReportLink.createMany).toHaveBeenCalledWith({
      data: [
        { milestoneId: 2, reportId: 5 },
        { milestoneId: 2, reportId: 6 },
      ],
    });
  });

  it('rejects linking a report from another project', async () => {
    const { service, prisma } = createService();
    prisma.project.findUnique.mockResolvedValue({
      id: 10,
      phase: ProjectPhase.semester_1,
    });
    prisma.projectReport.findMany.mockResolvedValue([{ id: 5 }]);

    await expect(
      service.createMilestone({
        projectId: 10,
        user,
        data: {
          title: 'Plan',
          dueDate: new Date('2026-10-01'),
          reportIds: [5, 6],
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.projectMilestones.create).not.toHaveBeenCalled();
  });

  it('blocks completing a milestone while a linked report is not accepted', async () => {
    const { service, prisma } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectMilestones.findFirst.mockResolvedValue({ id: 2 });
    prisma.milestoneReportLink.findMany.mockResolvedValue([
      {
        report: {
          id: 5,
          title: 'Informe final',
          status: ReportStatus.submitted,
        },
      },
    ]);

    await expect(
      service.updateMilestone({
        projectId: 10,
        milestoneId: 2,
        user,
        data: { completed: true },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('completes a milestone when all linked reports are accepted', async () => {
    const { service, prisma } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectMilestones.findFirst.mockResolvedValue({ id: 2 });
    prisma.milestoneReportLink.findMany.mockResolvedValue([
      {
        report: {
          id: 5,
          title: 'Informe final',
          status: ReportStatus.accepted,
        },
      },
    ]);
    prisma.projectMilestones.findUnique.mockResolvedValue(
      selectedMilestone({ completed: true }),
    );

    const result = await service.updateMilestone({
      projectId: 10,
      milestoneId: 2,
      user,
      data: { completed: true },
    });

    expect(result.completed).toBe(true);
    expect(prisma.projectMilestones.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { completed: true },
    });
  });

  it('replaces linked reports on update', async () => {
    const { service, prisma } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectMilestones.findFirst.mockResolvedValue({ id: 2 });
    prisma.projectReport.findMany.mockResolvedValue([{ id: 9 }]);
    prisma.projectMilestones.findUnique.mockResolvedValue(selectedMilestone());

    await service.updateMilestone({
      projectId: 10,
      milestoneId: 2,
      user,
      data: { reportIds: [9] },
    });

    expect(prisma.milestoneReportLink.deleteMany).toHaveBeenCalledWith({
      where: { milestoneId: 2 },
    });
    expect(prisma.milestoneReportLink.createMany).toHaveBeenCalledWith({
      data: [{ milestoneId: 2, reportId: 9 }],
    });
  });

  it('rejects an empty update', async () => {
    const { service, prisma } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectMilestones.findFirst.mockResolvedValue({ id: 2 });

    await expect(
      service.updateMilestone({
        projectId: 10,
        milestoneId: 2,
        user,
        data: {},
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a milestone from another project', async () => {
    const { service, prisma } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectMilestones.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteMilestone({ projectId: 10, milestoneId: 99, user }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
