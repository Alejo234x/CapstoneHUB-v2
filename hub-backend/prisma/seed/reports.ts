import { SeedContext, log, requireProjectId } from './common';
import { loadReports } from './fixtures';

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

      const data = {
        description: report.description ?? null,
        dueDate: new Date(report.dueDate),
        status,
        submittedAt,
        reviewedAt,
        reviewComment,
      };

      if (existing) {
        await prisma.projectReport.update({
          where: { id: existing.id },
          data,
        });
        log.info(`Updated report "${report.title}" (${projectName})`);
        continue;
      }

      await prisma.projectReport.create({
        data: { projectId, title: report.title, ...data },
      });
      log.ok(`Created report "${report.title}" (${projectName})`);
    }
  }
}
