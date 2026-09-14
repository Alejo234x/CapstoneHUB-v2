import { SeedContext, log, requireProjectId, requireUserId } from './common';
import { loadObservations } from './fixtures';

export async function seedObservations({
  prisma,
  options,
}: SeedContext): Promise<void> {
  const observationsByProject = loadObservations();

  for (const [projectName, observations] of Object.entries(
    observationsByProject,
  )) {
    const projectId = await requireProjectId(prisma, projectName);

    for (const observation of observations) {
      const authorUserId = await requireUserId(prisma, observation.authorEmail);
      const existing = await prisma.projectObservation.findFirst({
        where: { projectId, authorUserId, content: observation.content },
        select: { id: true },
      });

      if (existing) {
        log.info(`Observation already exists in ${projectName}`);
        continue;
      }

      if (options.dryRun) {
        log.info(`[dry-run] would create observation in ${projectName}`);
        continue;
      }

      await prisma.projectObservation.create({
        data: {
          projectId,
          authorUserId,
          content: observation.content,
        },
      });
      log.ok(
        `Created observation by ${observation.authorEmail} in ${projectName}`,
      );
    }
  }
}
