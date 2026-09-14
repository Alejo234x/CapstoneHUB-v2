import { SeedContext, log, requireProjectId } from './common';
import { loadProjects } from './fixtures';
import { authorRoleForTransition, statusPathFor } from './status-machine';

const DAY_MS = 24 * 60 * 60 * 1000;
const TRANSITION_SPACING_DAYS = 12;

export async function seedProjectStatus({
  prisma,
  options,
}: SeedContext): Promise<void> {
  const { projects } = loadProjects();

  for (const project of projects) {
    const projectId = await requireProjectId(prisma, project.name);
    const path = statusPathFor(project.targetStatus);
    const transitions = path.slice(1).map((next, index) => ({
      previous: path[index],
      next,
    }));

    const existing = await prisma.projectStatusHistory.findMany({
      where: { projectId },
      select: { previousStatus: true, nextStatus: true },
    });
    const existingKeys = new Set(
      existing.map(
        (entry) => `${entry.previousStatus ?? 'null'}->${entry.nextStatus}`,
      ),
    );
    const missing = transitions.filter(
      (transition) =>
        !existingKeys.has(`${transition.previous}->${transition.next}`),
    );

    if (options.dryRun) {
      log.info(
        `[dry-run] would set ${project.name} to "${project.targetStatus}" (${missing.length} new transition(s))`,
      );
      continue;
    }

    const startDate = new Date(project.startDate);
    let createdCount = 0;

    for (let index = 0; index < transitions.length; index++) {
      const transition = transitions[index];
      const key = `${transition.previous}->${transition.next}`;
      if (existingKeys.has(key)) {
        continue;
      }

      const role = authorRoleForTransition(
        transition.previous,
        transition.next,
      );
      const assignment = await prisma.projectActorAssignment.findFirst({
        where: { projectId, role },
        select: { userId: true },
      });

      await prisma.projectStatusHistory.create({
        data: {
          projectId,
          previousStatus: transition.previous,
          nextStatus: transition.next,
          description:
            project.statusDescription ??
            `Cambio de estado de ${transition.previous} a ${transition.next} (datos de prueba)`,
          authorUserId: assignment?.userId ?? null,
          changedAt: new Date(
            startDate.getTime() + index * TRANSITION_SPACING_DAYS * DAY_MS,
          ),
        },
      });
      createdCount++;
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { status: project.targetStatus },
    });
    log.ok(
      `Project ${project.name} set to "${project.targetStatus}" (${createdCount} new transition(s))`,
    );
  }
}
