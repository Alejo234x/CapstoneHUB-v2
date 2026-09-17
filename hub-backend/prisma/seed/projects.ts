import { SeedContext, log } from './common';
import { loadProjects } from './fixtures';
import { ProjectSource } from '../../src/generated/prisma/client';

export async function seedProjects({
  prisma,
  options,
}: SeedContext): Promise<void> {
  const { projects } = loadProjects();

  for (const project of projects) {
    const existing = await prisma.project.findFirst({
      where: { name: project.name },
      select: { id: true },
    });

    if (existing) {
      log.info(`Project already exists: ${project.name} (#${existing.id})`);
      continue;
    }

    if (options.dryRun) {
      log.info(`[dry-run] would create project ${project.name}`);
      continue;
    }

    const created = await prisma.project.create({
      data: {
        name: project.name,
        description: project.description,
        context: project.context,
        location: project.location ?? null,
        estimatedCost: project.estimatedCost ?? null,
        requiresLegalization: project.requiresLegalization ?? false,
        source: project.source ?? ProjectSource.external_entity,
        startDate: new Date(project.startDate),
        endDate: project.endDate ? new Date(project.endDate) : null,
        schools: project.schools?.length
          ? { create: project.schools.map((schoolName) => ({ schoolName })) }
          : undefined,
        naturalProposer:
          project.proposer.type === 'natural'
            ? {
                create: {
                  fullName: project.proposer.fullName,
                  idNumber: project.proposer.idNumber,
                  email: project.proposer.email,
                },
              }
            : undefined,
        legalProposer:
          project.proposer.type === 'legal'
            ? {
                create: {
                  legalName: project.proposer.legalName,
                  nit: project.proposer.nit,
                  email: project.proposer.email,
                  phone: project.proposer.phone,
                  contactUrl: project.proposer.contactUrl ?? null,
                },
              }
            : undefined,
      },
      select: { id: true },
    });

    log.ok(`Created project ${project.name} (#${created.id})`);
  }
}
