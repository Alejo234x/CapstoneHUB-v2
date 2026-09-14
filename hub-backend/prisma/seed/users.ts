import { SeedContext, log, normalizeEmail } from './common';
import { loadUsers } from './fixtures';
import { hashPassword } from './password';

export async function seedUsers({
  prisma,
  options,
}: SeedContext): Promise<void> {
  const { defaultPassword, users } = loadUsers();

  for (const fixtureUser of users) {
    const email = normalizeEmail(fixtureUser.email);
    const roles = [...new Set(fixtureUser.roles)];
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (options.dryRun) {
      const action = existing ? 'update' : 'create';
      log.info(`[dry-run] would ${action} user ${email}`);
      continue;
    }

    if (existing) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: existing.id },
          data: { fullName: fixtureUser.fullName, isActive: true },
        }),
        prisma.userRoleAssignment.deleteMany({
          where: { userId: existing.id },
        }),
        prisma.userRoleAssignment.createMany({
          data: roles.map((role) => ({ userId: existing.id, role })),
        }),
      ]);
      log.info(`Updated user ${email} (roles: ${roles.join(', ')})`);
      continue;
    }

    const passwordHash = await hashPassword(
      fixtureUser.password ?? defaultPassword,
    );
    await prisma.user.create({
      data: {
        fullName: fixtureUser.fullName,
        email,
        passwordHash,
        isActive: true,
        roleAssignments: {
          create: roles.map((role) => ({ role })),
        },
      },
    });
    log.ok(`Created user ${email} (roles: ${roles.join(', ')})`);
  }
}
