import { SeedContext, log, requireProjectId } from './common';
import { loadReports } from './fixtures';

/** MIME por defecto para los fixtures de tipo Archivo que no los especifican. */
const DEFAULT_FILE_MIME_TYPES: string[] = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/ogg',
];

/** Vincula (o desvincula) una entrega con hitos del proyecto por título. */
async function linkReportToMilestones(
  prisma: SeedContext['prisma'],
  projectId: number,
  reportId: number,
  milestoneTitles: string[],
): Promise<void> {
  const titles = [...new Set(milestoneTitles)];

  const milestones = await prisma.projectMilestones.findMany({
    where: { projectId, title: { in: titles } },
    select: { id: true, title: true },
  });

  const found = new Set(milestones.map((milestone) => milestone.title));
  const missing = titles.filter((title) => !found.has(title));
  if (missing.length > 0) {
    throw new Error(
      `Milestones not found in project ${projectId}: ${missing.join(', ')}`,
    );
  }

  await prisma.milestoneReportLink.deleteMany({ where: { reportId } });
  if (milestones.length > 0) {
    await prisma.milestoneReportLink.createMany({
      data: milestones.map((milestone) => ({
        milestoneId: milestone.id,
        reportId,
      })),
    });
  }
}

export async function seedReports({
  prisma,
  options,
}: SeedContext): Promise<void> {
  const reportsByProject = loadReports();

  for (const [projectName, reports] of Object.entries(reportsByProject)) {
    const projectId = await requireProjectId(prisma, projectName);

    for (const report of reports) {
      const existing = await prisma.projectReport.findFirst({
        where: { projectId, title: report.title },
        select: { id: true },
      });

      if (options.dryRun) {
        const action = existing ? 'update' : 'create';
        log.info(
          `[dry-run] would ${action} report "${report.title}" (${projectName})`,
        );
        continue;
      }

      const status = report.status ?? 'pending';
      const submittedAt =
        status === 'pending' ? null : new Date(report.submittedAt ?? Date.now());
      const reviewedAt =
        status === 'accepted' || status === 'rejected'
          ? new Date(report.submittedAt ?? Date.now())
          : null;
      const reviewComment = report.reviewComment ?? null;

      const type = report.type ?? 'file';
      const isFileType = type === 'file';

      const data = {
        description: report.description ?? null,
        dueDate: new Date(report.dueDate),
        type,
        allowedMimeTypes: isFileType
          ? (report.allowedMimeTypes ?? DEFAULT_FILE_MIME_TYPES)
          : [],
        maxFiles: isFileType ? (report.maxFiles ?? 1) : null,
        status,
        submittedAt,
        reviewedAt,
        reviewComment,
      };

      let reportId: number;

      if (existing) {
        await prisma.projectReport.update({
          where: { id: existing.id },
          data,
        });
        reportId = existing.id;
        log.info(`Updated report "${report.title}" (${projectName})`);
      } else {
        const created = await prisma.projectReport.create({
          data: { projectId, title: report.title, ...data },
          select: { id: true },
        });
        reportId = created.id;
        log.ok(`Created report "${report.title}" (${projectName})`);
      }

      if (report.milestoneTitles !== undefined) {
        await linkReportToMilestones(
          prisma,
          projectId,
          reportId,
          report.milestoneTitles,
        );
      }
    }
  }
}
