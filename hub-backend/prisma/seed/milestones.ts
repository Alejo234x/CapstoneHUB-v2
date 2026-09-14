import { SeedContext, log, requireProjectId } from './common';
import { loadMilestones } from './fixtures';

export async function seedMilestones({
  prisma,
  options,
}: SeedContext): Promise<void> {
  const milestonesByProject = loadMilestones();

  for (const [projectName, milestones] of Object.entries(milestonesByProject)) {
    const projectId = await requireProjectId(prisma, projectName);

    for (const milestone of milestones) {
      const existing = await prisma.projectMilestones.findFirst({
        where: { projectId, title: milestone.title },
        select: { id: true },
      });

      if (options.dryRun) {
        const action = existing ? 'update' : 'create';
        log.info(
          `[dry-run] would ${action} milestone "${milestone.title}" (${projectName})`,
        );
        continue;
      }

      const data = {
        description: milestone.description ?? null,
        dueDate: new Date(milestone.dueDate),
        completed: milestone.completed ?? false,
      };

      if (existing) {
        await prisma.projectMilestones.update({
          where: { id: existing.id },
          data,
        });
        log.info(`Updated milestone "${milestone.title}" (${projectName})`);
        continue;
      }

      await prisma.projectMilestones.create({
        data: { projectId, title: milestone.title, ...data },
      });
      log.ok(`Created milestone "${milestone.title}" (${projectName})`);
    }
  }
}
