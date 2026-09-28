import { NotFoundException } from '@nestjs/common';
import { ReportContentKind, ReportStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';

export async function assertProjectExists(
  prisma: PrismaService,
  projectId: number,
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  if (!project) {
    throw new NotFoundException(`Project ${projectId} not found`);
  }
}

export async function assertReportBelongsToProject(
  prisma: PrismaService,
  projectId: number,
  reportId: number,
): Promise<{ id: number; status: ReportStatus; type: ReportContentKind }> {
  const report = await prisma.projectReport.findFirst({
    where: { id: reportId, projectId },
    select: { id: true, status: true, type: true },
  });

  if (!report) {
    throw new NotFoundException(
      `Report ${reportId} not found in project ${projectId}`,
    );
  }

  return report;
}
