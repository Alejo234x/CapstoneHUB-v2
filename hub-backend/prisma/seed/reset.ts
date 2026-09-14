import { SeedContext, SeedSection, log, normalizeEmail } from './common';
import { loadProjects, loadUsers } from './fixtures';
import { createStorage, deleteFromStorage } from './storage';

const PROJECT_SECTIONS: SeedSection[] = [
  'projects',
  'actors',
  'milestones',
  'observations',
  'status',
  'attachments',
];

export async function resetSeed(
  { prisma, options }: SeedContext,
  sections: SeedSection[],
): Promise<void> {
  const shouldResetProjects = sections.some((section) =>
    PROJECT_SECTIONS.includes(section),
  );
  const shouldResetUsers = sections.includes('users');

  const projectNames = shouldResetProjects
    ? loadProjects().projects.map((project) => project.name)
    : [];
  const emails = shouldResetUsers
    ? loadUsers().users.map((user) => normalizeEmail(user.email))
    : [];

  const seededProjects = projectNames.length
    ? await prisma.project.findMany({
        where: { name: { in: projectNames } },
        select: {
          id: true,
          attachments: { select: { storageKey: true } },
        },
      })
    : [];

  if (options.dryRun) {
    log.info(
      `[dry-run] would remove ${seededProjects.length} project(s) and up to ${emails.length} user(s)`,
    );
    return;
  }

  if (seededProjects.some((project) => project.attachments.length > 0)) {
    const storage = createStorage();
    if (storage) {
      for (const project of seededProjects) {
        for (const attachment of project.attachments) {
          try {
            await deleteFromStorage(storage, attachment.storageKey);
          } catch {
            log.warn(`Could not delete S3 object ${attachment.storageKey}`);
          }
        }
      }
    } else {
      log.warn(
        'S3/MinIO is not configured; attachment objects will not be removed from storage.',
      );
    }
  }

  const deletedProjects = projectNames.length
    ? await prisma.project.deleteMany({
        where: { name: { in: projectNames } },
      })
    : { count: 0 };
  const deletedUsers = emails.length
    ? await prisma.user.deleteMany({ where: { email: { in: emails } } })
    : { count: 0 };

  log.ok(
    `Removed ${deletedProjects.count} seeded project(s) and ${deletedUsers.count} seeded user(s)`,
  );
}
