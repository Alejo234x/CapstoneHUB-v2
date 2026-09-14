import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ReportStatus } from '../generated/prisma/client';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const user = {
    id: 7,
    fullName: 'Coordinator',
    email: 'coordinator@example.com',
    roles: ['coordinator'],
  } as never;

  const dueDate = new Date('2026-10-01');

  function selectedReport(overrides: Record<string, unknown> = {}) {
    return {
      id: 3,
      projectId: 10,
      title: 'Plan',
      description: 'Details',
      dueDate,
      status: 'pending',
      submittedAt: null,
      reviewedAt: null,
      reviewComment: null,
      createdAt: new Date('2026-09-12'),
      updatedAt: new Date('2026-09-12'),
      createdBy: {
        id: 7,
        fullName: 'Coordinator',
        email: 'coordinator@example.com',
      },
      reviewedBy: null,
      attachments: [],
      ...overrides,
    };
  }

  function createService() {
    const tx = {
      projectReport: { update: jest.fn() },
      projectAttachment: { updateMany: jest.fn() },
    };
    const prisma = {
      project: { findUnique: jest.fn() },
      projectReport: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn<
          Promise<unknown>,
          [
            {
              data: {
                projectId: number;
                createdByUserId: number;
                title: string;
                description: string | null;
                dueDate: Date;
              };
              select: unknown;
            },
          ]
        >(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      projectAttachment: { findMany: jest.fn(), updateMany: jest.fn() },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const authorization = {
      assertProjectMember: jest.fn(),
      assertCanManageMilestone: jest.fn(),
    };

    return {
      service: new ReportsService(prisma as never, authorization as never),
      prisma,
      tx,
      authorization,
    };
  }

  it('creates a standalone report for an authorized project manager', async () => {
    const { service, prisma, authorization } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.create.mockResolvedValue(selectedReport());

    const result = await service.createReport({
      projectId: 10,
      user,
      data: {
        title: ' Plan ',
        description: ' Details ',
        dueDate,
      },
    });

    expect(result).toMatchObject({
      id: 3,
      projectId: 10,
      status: 'pending',
      title: 'Plan',
      description: 'Details',
      dueDate,
    });
    expect(authorization.assertCanManageMilestone).toHaveBeenCalledWith(
      user,
      10,
    );
    const createArgs = prisma.projectReport.create.mock.calls[0]?.[0] as {
      data: {
        projectId: number;
        title: string;
        description: string | null;
        dueDate: Date;
      };
    };
    expect(createArgs.data).toMatchObject({
      projectId: 10,
      title: 'Plan',
      description: 'Details',
      dueDate,
    });
  });

  it('rejects a report title that is blank', async () => {
    const { service, prisma } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });

    await expect(
      service.createReport({
        projectId: 10,
        user,
        data: { title: '   ', dueDate },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('submits a pending report and links attachments', async () => {
    const { service, prisma, tx, authorization } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue({
      id: 3,
      status: 'pending',
    });
    prisma.projectAttachment.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    tx.projectReport.update.mockResolvedValue(
      selectedReport({
        status: 'submitted',
        submittedAt: new Date('2026-09-13'),
      }),
    );

    const result = await service.submitReport({
      projectId: 10,
      reportId: 3,
      user,
      data: { attachmentIds: [1, 2] },
    });

    expect(result.status).toBe('submitted');
    expect(authorization.assertProjectMember).toHaveBeenCalledWith(user, 10);
    expect(tx.projectAttachment.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] }, projectId: 10 },
      data: { reportId: 3 },
    });
  });

  it('allows resubmitting a rejected report', async () => {
    const { service, prisma, tx } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue({
      id: 3,
      status: 'rejected',
    });
    tx.projectReport.update.mockResolvedValue(
      selectedReport({ status: 'submitted' }),
    );

    const result = await service.submitReport({
      projectId: 10,
      reportId: 3,
      user,
      data: { attachmentIds: [] },
    });

    expect(result.status).toBe('submitted');
  });

  it('accepts a submitted report', async () => {
    const { service, prisma, authorization } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue({
      id: 3,
      status: 'submitted',
    });
    prisma.projectReport.update.mockResolvedValue(
      selectedReport({
        status: 'accepted',
        reviewedAt: new Date('2026-09-13'),
        reviewComment: 'Bien',
      }),
    );

    const result = await service.reviewReport({
      projectId: 10,
      reportId: 3,
      user,
      data: { decision: ReportStatus.accepted, comment: ' Bien ' },
    });

    expect(result.status).toBe('accepted');
    expect(authorization.assertCanManageMilestone).toHaveBeenCalledWith(
      user,
      10,
    );
    expect(prisma.projectReport.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: {
        status: ReportStatus.accepted,
        reviewedAt: expect.any(Date) as Date,
        reviewedByUserId: 7,
        reviewComment: 'Bien',
      },
      select: expect.any(Object) as object,
    });
  });

  it('rejects a submitted report', async () => {
    const { service, prisma } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue({
      id: 3,
      status: 'submitted',
    });
    prisma.projectReport.update.mockResolvedValue(
      selectedReport({ status: 'rejected' }),
    );

    const result = await service.reviewReport({
      projectId: 10,
      reportId: 3,
      user,
      data: { decision: ReportStatus.rejected, comment: 'Falta documentación' },
    });

    expect(result.status).toBe('rejected');
  });

  it('rejects reviewing a pending report', async () => {
    const { service, prisma } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue({
      id: 3,
      status: 'pending',
    });

    await expect(
      service.reviewReport({
        projectId: 10,
        reportId: 3,
        user,
        data: { decision: ReportStatus.accepted },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a report from another project', async () => {
    const { service, prisma } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteReport({ projectId: 10, reportId: 99, user }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
