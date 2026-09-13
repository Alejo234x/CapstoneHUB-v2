import { Test, TestingModule } from '@nestjs/testing';
import {
  isValidProjectStatusTransition,
  ProjectsService,
} from './projects.service';
import { AuthorizationService } from '../auth/authorization.service';
import { PrismaService } from '../prisma.service';
import { ProjectStatus } from '../generated/prisma/client';
import { ActorRole, UserRole } from '../generated/prisma/client';

const ADMIN_USER = {
  id: 1,
  fullName: 'Admin',
  email: 'admin@example.com',
  roles: [UserRole.admin],
};

const EVALUATOR_USER = {
  id: 4,
  fullName: 'Evaluator',
  email: 'evaluator@example.com',
  roles: [UserRole.evaluator],
};

function createProjectDetail() {
  return {
    id: 10,
    name: 'Project',
    status: ProjectStatus.under_review,
    proposer: null,
    actors: [],
    description: 'Description',
    context: 'Context',
    location: null,
    startDate: new Date(),
    endDate: null,
    estimatedCost: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    observations: [],
    actorAssignments: [],
    milestones: [],
    statusHistory: [],
  };
}

function createPrismaMock() {
  const projectUpdate = jest.fn().mockResolvedValue(undefined);
  const historyCreate = jest.fn().mockResolvedValue(undefined);
  const transaction = {
    project: { update: projectUpdate },
    projectStatusHistory: { create: historyCreate },
  };

  const findUnique = jest
    .fn()
    .mockResolvedValue({ id: 10, status: ProjectStatus.proposed });

  const prisma = {
    project: { findUnique },
    $transaction: jest.fn(
      (callback: (transaction: typeof transaction) => unknown) =>
        callback(transaction),
    ),
  };

  return { prisma, projectUpdate, historyCreate };
}

function createAuthorizationMock() {
  return {
    assertCanTransitionProject: jest.fn().mockResolvedValue(undefined),
    assertCanAssignActors: jest.fn().mockResolvedValue(undefined),
    assertAssignableUser: jest.fn().mockResolvedValue(undefined),
  };
}

function createService(
  prisma: unknown,
  authorization: unknown,
): ProjectsService {
  return new ProjectsService(prisma as never, authorization as never);
}

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: {} },
        { provide: AuthorizationService, useValue: {} },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it.each([
    [ProjectStatus.proposed, ProjectStatus.under_review],
    [ProjectStatus.proposed, ProjectStatus.rejected],
    [ProjectStatus.under_review, ProjectStatus.approved],
    [ProjectStatus.under_review, ProjectStatus.rejected],
    [ProjectStatus.approved, ProjectStatus.assigned],
    [ProjectStatus.approved, ProjectStatus.rejected],
    [ProjectStatus.assigned, ProjectStatus.in_progress],
    [ProjectStatus.assigned, ProjectStatus.rejected],
    [ProjectStatus.in_progress, ProjectStatus.closed],
    [ProjectStatus.in_progress, ProjectStatus.rejected],
  ])('accepts valid transition %s -> %s', (previousStatus, nextStatus) => {
    expect(isValidProjectStatusTransition(previousStatus, nextStatus)).toBe(
      true,
    );
  });

  it.each([
    [ProjectStatus.proposed, ProjectStatus.approved],
    [ProjectStatus.under_review, ProjectStatus.in_progress],
    [ProjectStatus.closed, ProjectStatus.rejected],
    [ProjectStatus.rejected, ProjectStatus.proposed],
  ])('rejects invalid transition %s -> %s', (previousStatus, nextStatus) => {
    expect(isValidProjectStatusTransition(previousStatus, nextStatus)).toBe(
      false,
    );
  });

  it('updates status and history in the same transaction', async () => {
    const { prisma, projectUpdate, historyCreate } = createPrismaMock();
    const authorization = createAuthorizationMock();
    const service = createService(prisma, authorization);
    jest.spyOn(service, 'project').mockResolvedValue(createProjectDetail());

    await service.transitionProjectStatus({
      user: EVALUATOR_USER,
      projectId: 10,
      nextStatus: ProjectStatus.under_review,
      description: 'Initial review',
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(projectUpdate).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { status: ProjectStatus.under_review },
    });
    expect(historyCreate).toHaveBeenCalledWith({
      data: {
        projectId: 10,
        previousStatus: ProjectStatus.proposed,
        nextStatus: ProjectStatus.under_review,
        description: 'Initial review',
        authorUserId: 4,
      },
    });
  });

  it('requires a reason for non-admin status changes', async () => {
    const { prisma } = createPrismaMock();
    const authorization = createAuthorizationMock();
    const service = createService(prisma, authorization);

    await expect(
      service.transitionProjectStatus({
        user: EVALUATOR_USER,
        projectId: 10,
        nextStatus: ProjectStatus.under_review,
      }),
    ).rejects.toThrow('A reason is required');
  });

  it('allows admin status changes without a reason', async () => {
    const { prisma, historyCreate } = createPrismaMock();
    const authorization = createAuthorizationMock();
    const service = createService(prisma, authorization);
    jest.spyOn(service, 'project').mockResolvedValue(createProjectDetail());

    await service.transitionProjectStatus({
      user: ADMIN_USER,
      projectId: 10,
      nextStatus: ProjectStatus.under_review,
    });

    expect(historyCreate).toHaveBeenCalledWith({
      data: {
        projectId: 10,
        previousStatus: ProjectStatus.proposed,
        nextStatus: ProjectStatus.under_review,
        description: null,
        authorUserId: 1,
      },
    });
  });

  it('rejects invalid transitions before authorization checks', async () => {
    const { prisma } = createPrismaMock();
    const authorization = createAuthorizationMock();
    const service = createService(prisma, authorization);

    await expect(
      service.transitionProjectStatus({
        user: ADMIN_USER,
        projectId: 10,
        nextStatus: ProjectStatus.approved,
      }),
    ).rejects.toThrow('Invalid project status transition');
    expect(authorization.assertCanTransitionProject).not.toHaveBeenCalled();
  });

  it('preserves duplicate-assignment protection', async () => {
    const createAssignment = jest.fn();
    const prisma = {
      project: {
        findUnique: jest.fn().mockResolvedValue({ id: 10, name: 'Project' }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 4,
          fullName: 'Student',
          email: 'student@example.com',
          isActive: true,
        }),
      },
      projectActorAssignment: {
        findUnique: jest.fn().mockResolvedValue({ id: 1 }),
        create: createAssignment,
      },
    };
    const authorization = createAuthorizationMock();
    const service = createService(prisma, authorization);

    await expect(
      service.addProjectActorAssignment({
        user: ADMIN_USER,
        projectId: 10,
        userId: 4,
        role: ActorRole.student,
      }),
    ).rejects.toThrow('already assigned');
    expect(createAssignment).not.toHaveBeenCalled();
  });
});
