import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ReportContentKind, ReportStatus } from '../generated/prisma/client';
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
      type: 'file',
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
      contents: [],
      ...overrides,
    };
  }

  function selectedContent(overrides: Record<string, unknown> = {}) {
    return {
      id: 9,
      reportId: 3,
      kind: 'text',
      textContent: 'Contenido',
      url: null,
      label: null,
      createdAt: new Date('2026-09-13'),
      attachment: null,
      createdBy: {
        id: 7,
        fullName: 'Coordinator',
        email: 'coordinator@example.com',
      },
      ...overrides,
    };
  }

  function createService() {
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
                type: ReportContentKind;
              };
              select: unknown;
            },
          ]
        >(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      projectReportContent: {
        count: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      projectAttachment: {
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };
    const authorization = {
      assertProjectMember: jest.fn(),
      assertCanManageMilestone: jest.fn(),
    };
    const storage = {
      read: jest.fn(),
      delete: jest.fn(),
      createUploadUrl: jest.fn(),
      stat: jest.fn(),
      listObjects: jest.fn(),
    };

    return {
      service: new ReportsService(
        prisma as never,
        authorization as never,
        storage as never,
      ),
      prisma,
      authorization,
      storage,
    };
  }

  function pendingReport(overrides: Record<string, unknown> = {}) {
    return { id: 3, status: 'pending', type: 'file', ...overrides };
  }

  it('creates a standalone report for an authorized project manager', async () => {
    const { service, prisma, authorization } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.create.mockResolvedValue(
      selectedReport({ type: 'video' }),
    );

    const result = await service.createReport({
      projectId: 10,
      user,
      data: {
        title: ' Plan ',
        description: ' Details ',
        dueDate,
        type: ReportContentKind.video,
      },
    });

    expect(result).toMatchObject({
      id: 3,
      projectId: 10,
      status: 'pending',
      title: 'Plan',
      description: 'Details',
      dueDate,
      type: ReportContentKind.video,
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
        type: ReportContentKind;
      };
    };
    expect(createArgs.data).toMatchObject({
      projectId: 10,
      title: 'Plan',
      description: 'Details',
      dueDate,
      type: ReportContentKind.video,
    });
  });

  it('rejects a report title that is blank', async () => {
    const { service, prisma } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });

    await expect(
      service.createReport({
        projectId: 10,
        user,
        data: { title: '   ', dueDate, type: ReportContentKind.file },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('submits a report that already has content', async () => {
    const { service, prisma, authorization } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue(pendingReport());
    prisma.projectReportContent.count.mockResolvedValue(2);
    prisma.projectReport.update.mockResolvedValue(
      selectedReport({
        status: 'submitted',
        submittedAt: new Date('2026-09-13'),
      }),
    );

    const result = await service.submitReport({
      projectId: 10,
      reportId: 3,
      user,
    });

    expect(result.status).toBe('submitted');
    expect(authorization.assertProjectMember).toHaveBeenCalledWith(user, 10);
    expect(prisma.projectReport.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: {
        status: ReportStatus.submitted,
        submittedAt: expect.any(Date) as Date,
        reviewedAt: null,
        reviewedByUserId: null,
        reviewComment: null,
      },
      select: expect.any(Object) as object,
    });
  });

  it('rejects submitting a report without content', async () => {
    const { service, prisma } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue(pendingReport());
    prisma.projectReportContent.count.mockResolvedValue(0);

    await expect(
      service.submitReport({ projectId: 10, reportId: 3, user }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows resubmitting a rejected report', async () => {
    const { service, prisma } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue({
      id: 3,
      status: 'rejected',
    });
    prisma.projectReportContent.count.mockResolvedValue(1);
    prisma.projectReport.update.mockResolvedValue(
      selectedReport({ status: 'submitted' }),
    );

    const result = await service.submitReport({
      projectId: 10,
      reportId: 3,
      user,
    });

    expect(result.status).toBe('submitted');
  });

  it('creates trimmed text content while the report is editable', async () => {
    const { service, prisma, authorization } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue(
      pendingReport({ type: 'text' }),
    );
    prisma.projectReportContent.create.mockResolvedValue(
      selectedContent({ textContent: 'Hola mundo' }),
    );

    const result = await service.createContent({
      projectId: 10,
      reportId: 3,
      user,
      data: {
        kind: ReportContentKind.text,
        textContent: '  Hola mundo  ',
      },
    });

    expect(result.textContent).toBe('Hola mundo');
    expect(authorization.assertProjectMember).toHaveBeenCalledWith(user, 10);
    expect(prisma.projectReportContent.create).toHaveBeenCalledWith({
      data: {
        reportId: 3,
        createdByUserId: 7,
        kind: ReportContentKind.text,
        textContent: 'Hola mundo',
      },
      select: expect.any(Object) as object,
    });
  });

  it('creates link content with a normalized URL', async () => {
    const { service, prisma } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue(
      pendingReport({ type: 'link' }),
    );
    prisma.projectReportContent.create.mockResolvedValue(
      selectedContent({ kind: 'link', url: 'https://example.com/demo' }),
    );

    await service.createContent({
      projectId: 10,
      reportId: 3,
      user,
      data: {
        kind: ReportContentKind.link,
        url: ' https://example.com/demo ',
        label: ' Demo ',
      },
    });

    expect(prisma.projectReportContent.create).toHaveBeenCalledWith({
      data: {
        reportId: 3,
        createdByUserId: 7,
        kind: ReportContentKind.link,
        url: 'https://example.com/demo',
        label: 'Demo',
      },
      select: expect.any(Object) as object,
    });
  });

  it('rejects content mutations on a submitted report', async () => {
    const { service, prisma } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue({
      id: 3,
      status: 'submitted',
    });

    await expect(
      service.createContent({
        projectId: 10,
        reportId: 3,
        user,
        data: { kind: ReportContentKind.text, textContent: 'Hola' },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('presigns a direct upload for an editable report', async () => {
    const { service, prisma, storage } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue(
      pendingReport({ type: 'image' }),
    );
    storage.createUploadUrl.mockResolvedValue({
      url: 'http://localhost:9000/capstonehub/projects/10/foto.png?X-Amz',
      method: 'PUT',
      expiresInSeconds: 3600,
    });

    const result = await service.presignFileContent({
      projectId: 10,
      reportId: 3,
      user,
      data: {
        kind: 'image',
        fileName: 'foto.png',
        mimeType: 'image/png',
        sizeBytes: 1024,
      },
    });

    expect(result.storageKey).toMatch(/^projects\/10\/.+\.png$/);
    expect(result.method).toBe('PUT');
    expect(result.uploadUrl).toContain('X-Amz');
    expect(storage.createUploadUrl).toHaveBeenCalledWith({
      key: result.storageKey,
      expiresInSeconds: 3600,
    });
  });

  it('rejects presigning a file whose type does not match the kind', async () => {
    const { service, prisma, storage } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue(
      pendingReport({ type: 'image' }),
    );

    await expect(
      service.presignFileContent({
        projectId: 10,
        reportId: 3,
        user,
        data: {
          kind: 'image',
          fileName: 'doc.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.createUploadUrl).not.toHaveBeenCalled();
  });

  it('rejects presigning a video over the size limit', async () => {
    const { service, prisma } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue(
      pendingReport({ type: 'video' }),
    );

    await expect(
      service.presignFileContent({
        projectId: 10,
        reportId: 3,
        user,
        data: {
          kind: 'video',
          fileName: 'clip.mp4',
          mimeType: 'video/mp4',
          sizeBytes: 200 * 1024 * 1024,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('confirms a direct upload and creates the content', async () => {
    const { service, prisma, storage } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue(
      pendingReport({ type: 'image' }),
    );
    storage.stat.mockResolvedValue({
      sizeBytes: 1234,
      contentType: 'image/png',
    });
    prisma.projectAttachment.create.mockResolvedValue({ id: 55 });
    prisma.projectReportContent.create.mockResolvedValue(
      selectedContent({
        kind: 'image',
        textContent: null,
        attachment: { id: 55 },
      }),
    );

    const result = await service.confirmFileContent({
      projectId: 10,
      reportId: 3,
      user,
      data: {
        kind: 'image',
        storageKey: 'projects/10/foto.png',
        fileName: 'foto.png',
        mimeType: 'image/png',
        sizeBytes: 1234,
      },
    });

    expect(result.kind).toBe('image');
    expect(storage.stat).toHaveBeenCalledWith('projects/10/foto.png');
    expect(prisma.projectAttachment.create).toHaveBeenCalledWith({
      data: {
        projectId: 10,
        reportId: 3,
        uploadedByUserId: 7,
        originalName: 'foto.png',
        storageKey: 'projects/10/foto.png',
        mimeType: 'image/png',
        sizeBytes: 1234,
      },
      select: { id: true },
    });
  });

  it('rejects confirming a storage key from another project', async () => {
    const { service, prisma, storage } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue(
      pendingReport({ type: 'image' }),
    );

    await expect(
      service.confirmFileContent({
        projectId: 10,
        reportId: 3,
        user,
        data: {
          kind: 'image',
          storageKey: 'projects/99/foto.png',
          fileName: 'foto.png',
          mimeType: 'image/png',
          sizeBytes: 10,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.stat).not.toHaveBeenCalled();
  });

  it('rejects confirming when the uploaded object is missing', async () => {
    const { service, prisma, storage } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue(
      pendingReport({ type: 'image' }),
    );
    storage.stat.mockResolvedValue(null);

    await expect(
      service.confirmFileContent({
        projectId: 10,
        reportId: 3,
        user,
        data: {
          kind: 'image',
          storageKey: 'projects/10/foto.png',
          fileName: 'foto.png',
          mimeType: 'image/png',
          sizeBytes: 10,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deletes an oversized upload and rejects it', async () => {
    const { service, prisma, storage } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue(
      pendingReport({ type: 'video' }),
    );
    storage.stat.mockResolvedValue({
      sizeBytes: 200 * 1024 * 1024,
      contentType: 'video/mp4',
    });

    await expect(
      service.confirmFileContent({
        projectId: 10,
        reportId: 3,
        user,
        data: {
          kind: 'video',
          storageKey: 'projects/10/clip.mp4',
          fileName: 'clip.mp4',
          mimeType: 'video/mp4',
          sizeBytes: 1024,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.delete).toHaveBeenCalledWith('projects/10/clip.mp4');
  });

  it('deletes file content along with its attachment', async () => {
    const { service, prisma, storage } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue(pendingReport());
    prisma.projectReportContent.findFirst.mockResolvedValue({
      id: 9,
      kind: 'image',
      attachmentId: 55,
      createdByUserId: 7,
    });
    prisma.projectAttachment.findFirst.mockResolvedValue({
      storageKey: 'projects/10/foto.png',
    });

    const result = await service.deleteContent({
      projectId: 10,
      reportId: 3,
      contentId: 9,
      user,
    });

    expect(result).toEqual({ id: 9 });
    expect(prisma.projectReportContent.delete).toHaveBeenCalledWith({
      where: { id: 9 },
    });
    expect(prisma.projectAttachment.delete).toHaveBeenCalledWith({
      where: { id: 55 },
    });
    expect(storage.delete).toHaveBeenCalledWith('projects/10/foto.png');
  });

  it('refuses to edit file content', async () => {
    const { service, prisma } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue(pendingReport());
    prisma.projectReportContent.findFirst.mockResolvedValue({
      id: 9,
      kind: 'video',
      attachmentId: 55,
      createdByUserId: 7,
    });

    await expect(
      service.updateContent({
        projectId: 10,
        reportId: 3,
        contentId: 9,
        user,
        data: { label: 'Otro' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
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
    prisma.projectReport.findFirst.mockResolvedValue(pendingReport());

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

  it('rejects content whose kind does not match the report type', async () => {
    const { service, prisma } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue(
      pendingReport({ type: 'image' }),
    );

    await expect(
      service.createContent({
        projectId: 10,
        reportId: 3,
        user,
        data: { kind: ReportContentKind.text, textContent: 'Hola' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.projectReportContent.create).not.toHaveBeenCalled();
  });

  it('changes the report type while pending and empty', async () => {
    const { service, prisma } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue(pendingReport());
    prisma.projectReportContent.count.mockResolvedValue(0);
    prisma.projectReport.update.mockResolvedValue(
      selectedReport({ type: 'video' }),
    );

    const result = await service.updateReport({
      projectId: 10,
      reportId: 3,
      user,
      data: { type: ReportContentKind.video },
    });

    expect(result.type).toBe('video');
    expect(prisma.projectReport.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { type: ReportContentKind.video },
      select: expect.any(Object) as object,
    });
  });

  it('refuses to change the report type when it already has content', async () => {
    const { service, prisma } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue(pendingReport());
    prisma.projectReportContent.count.mockResolvedValue(1);

    await expect(
      service.updateReport({
        projectId: 10,
        reportId: 3,
        user,
        data: { type: ReportContentKind.video },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses to change the report type when it is not pending', async () => {
    const { service, prisma } = createService();
    prisma.project.findUnique.mockResolvedValue({ id: 10 });
    prisma.projectReport.findFirst.mockResolvedValue({
      id: 3,
      status: 'submitted',
      type: 'file',
    });

    await expect(
      service.updateReport({
        projectId: 10,
        reportId: 3,
        user,
        data: { type: ReportContentKind.video },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
