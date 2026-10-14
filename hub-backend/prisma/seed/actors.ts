import {
  SeedContext,
  log,
  normalizeEmail,
  requireProjectId,
  requireUserId,
} from './common';
import { hasActorRoleLicense } from '../../src/auth/actor-role-license';
import { loadProjects } from './fixtures';

export async function seedActors({
  prisma,
  options,
}: SeedContext): Promise<void> {
  const { projects } = loadProjects();

  for (const project of projects) {
    if (!project.actors?.length) {
      continue;
    }

    const projectId = await requireProjectId(prisma, project.name);

    for (const actor of project.actors) {
      const userId = await requireUserId(prisma, actor.email);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { roleAssignments: { select: { role: true } } },
      });
      const globalRoles =
        user?.roleAssignments.map(({ role }) => role) ?? [];
      const hasLicense = hasActorRoleLicense(globalRoles, actor.role);

      if (!hasLicense) {
        throw new Error(
          `User ${normalizeEmail(actor.email)} lacks a global role required to be assigned as "${actor.role}" in ${project.name}.`,
        );
      }

      const existing = await prisma.projectActorAssignment.findUnique({
        where: { projectId_userId: { projectId, userId } },
        select: { id: true },
      });

      if (existing) {
        log.info(
          `Actor already assigned: ${actor.email} -> ${project.name} (${actor.role})`,
        );
        continue;
      }

      if (options.dryRun) {
        log.info(
          `[dry-run] would assign ${actor.email} as ${actor.role} in ${project.name}`,
        );
        continue;
      }

      await prisma.projectActorAssignment.create({
        data: { projectId, userId, role: actor.role },
      });
      log.ok(`Assigned ${actor.email} as ${actor.role} in ${project.name}`);
    }
  }
}
