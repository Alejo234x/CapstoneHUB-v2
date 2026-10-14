import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ActorRole, ProjectStatus, UserRole } from '../generated/prisma/client';
import { AuthorizationService } from './authorization.service';

describe('AuthorizationService', () => {
  const user = (roles: UserRole[]) => ({
    id: 7,
    fullName: 'Test User',
    email: 'test@example.com',
    roles,
  });

  it('allows admins to manage projects without a project assignment', async () => {
    const findAssignment = jest.fn();
    const prisma = { projectActorAssignment: { findFirst: findAssignment } };
    const service = new AuthorizationService(prisma as never);

    await expect(
      service.assertCanManageProject(user([UserRole.admin]), 10),
    ).resolves.toBeUndefined();
    expect(findAssignment).not.toHaveBeenCalled();
  });

  it('requires a teacher assignment to manage a project', async () => {
    const findAssignment = jest.fn().mockResolvedValue({ id: 3 });
    const prisma = {
      projectActorAssignment: { findFirst: findAssignment },
    };
    const service = new AuthorizationService(prisma as never);

    await expect(
      service.assertCanManageProject(user([UserRole.teacher]), 10),
    ).resolves.toBeUndefined();
    expect(findAssignment).toHaveBeenCalledWith({
      where: { projectId: 10, userId: 7, role: ActorRole.teacher },
      select: { id: true },
    });
  });

  it('rejects an unassigned teacher from managing a project', async () => {
    const findAssignment = jest.fn().mockResolvedValue(null);
    const prisma = {
      projectActorAssignment: { findFirst: findAssignment },
    };
    const service = new AuthorizationService(prisma as never);

    await expect(
      service.assertCanManageProject(user([UserRole.teacher]), 10),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('only requires a project assignment for evaluator transitions', async () => {
    const findAssignment = jest.fn().mockResolvedValue({ id: 3 });
    const prisma = {
      projectActorAssignment: { findFirst: findAssignment },
    };
    const service = new AuthorizationService(prisma as never);

    await expect(
      service.assertCanTransitionProject(
        user([UserRole.teacher]),
        10,
        'proposed',
        'under_review',
      ),
    ).resolves.toBeUndefined();
    expect(findAssignment).toHaveBeenCalledWith({
      where: { projectId: 10, userId: 7, role: ActorRole.evaluator },
      select: { id: true },
    });
  });

  it('rejects evaluator transitions without an evaluator assignment', async () => {
    const findAssignment = jest.fn().mockResolvedValue(null);
    const prisma = {
      projectActorAssignment: { findFirst: findAssignment },
    };
    const service = new AuthorizationService(prisma as never);

    await expect(
      service.assertCanTransitionProject(
        user([UserRole.evaluator]),
        10,
        'under_review',
        'approved',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(findAssignment).toHaveBeenCalledWith({
      where: { projectId: 10, userId: 7, role: ActorRole.evaluator },
      select: { id: true },
    });
  });

  it('requires a teacher assignment for post-approval transitions', async () => {
    const findAssignment = jest.fn().mockResolvedValue({ id: 3 });
    const prisma = {
      projectActorAssignment: { findFirst: findAssignment },
    };
    const service = new AuthorizationService(prisma as never);

    await expect(
      service.assertCanTransitionProject(
        user([UserRole.teacher]),
        10,
        'approved',
        'in_progress',
      ),
    ).resolves.toBeUndefined();
    expect(findAssignment).toHaveBeenCalledWith({
      where: { projectId: 10, userId: 7, role: ActorRole.teacher },
      select: { id: true },
    });
  });

  describe('assertAssignableUser', () => {
    const userWith = (overrides: Record<string, unknown>) =>
      ({
        id: 8,
        isActive: true,
        roleAssignments: [{ role: UserRole.student }],
        ...overrides,
      }) as never;

    it('rejects inactive users', async () => {
      const prisma = {
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue(userWith({ isActive: false })),
        },
      };
      const service = new AuthorizationService(prisma as never);

      await expect(
        service.assertAssignableUser(8, ActorRole.teacher),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects users whose global role does not license the actor role', async () => {
      const prisma = {
        user: { findUnique: jest.fn().mockResolvedValue(userWith({})) },
      };
      const service = new AuthorizationService(prisma as never);

      await expect(
        service.assertAssignableUser(8, ActorRole.teacher),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows teachers to be assigned as project evaluators', async () => {
      const prisma = {
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue(
              userWith({ roleAssignments: [{ role: UserRole.teacher }] }),
            ),
        },
      };
      const service = new AuthorizationService(prisma as never);

      await expect(
        service.assertAssignableUser(8, ActorRole.evaluator),
      ).resolves.toBeUndefined();
    });

    it('allows students to be assigned as students', async () => {
      const prisma = {
        user: { findUnique: jest.fn().mockResolvedValue(userWith({})) },
      };
      const service = new AuthorizationService(prisma as never);

      await expect(
        service.assertAssignableUser(8, ActorRole.student),
      ).resolves.toBeUndefined();
    });

    it('rejects missing users', async () => {
      const prisma = {
        user: { findUnique: jest.fn().mockResolvedValue(null) },
      };
      const service = new AuthorizationService(prisma as never);

      await expect(
        service.assertAssignableUser(999, ActorRole.student),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('requires an assigned teacher or evaluator for milestones', async () => {
    const findAssignment = jest.fn().mockResolvedValue({ id: 3 });
    const prisma = {
      projectActorAssignment: { findFirst: findAssignment },
    };
    const service = new AuthorizationService(prisma as never);

    await expect(
      service.assertCanManageMilestone(user([UserRole.teacher]), 10),
    ).resolves.toBeUndefined();
    expect(findAssignment).toHaveBeenCalledWith({
      where: {
        projectId: 10,
        userId: 7,
        role: { in: [ActorRole.teacher, ActorRole.evaluator] },
      },
      select: { id: true },
    });
  });

  it('allows admins to manage milestones without a project assignment', async () => {
    const findAssignment = jest.fn();
    const prisma = {
      projectActorAssignment: { findFirst: findAssignment },
    };
    const service = new AuthorizationService(prisma as never);

    await expect(
      service.assertCanManageMilestone(user([UserRole.admin]), 10),
    ).resolves.toBeUndefined();
    expect(findAssignment).not.toHaveBeenCalled();
  });

  it('rejects an unassigned global evaluator for milestones', async () => {
    const findAssignment = jest.fn().mockResolvedValue(null);
    const prisma = {
      projectActorAssignment: { findFirst: findAssignment },
    };
    const service = new AuthorizationService(prisma as never);

    await expect(
      service.assertCanManageMilestone(user([UserRole.evaluator]), 10),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows admins to manage reports without a project assignment', async () => {
    const findAssignment = jest.fn();
    const prisma = {
      projectActorAssignment: { findFirst: findAssignment },
    };
    const service = new AuthorizationService(prisma as never);

    await expect(
      service.assertCanManageReports(user([UserRole.admin]), 10),
    ).resolves.toBeUndefined();
    expect(findAssignment).not.toHaveBeenCalled();
  });

  it('allows global evaluators to manage reports without a project assignment', async () => {
    const findAssignment = jest.fn();
    const prisma = {
      projectActorAssignment: { findFirst: findAssignment },
    };
    const service = new AuthorizationService(prisma as never);

    await expect(
      service.assertCanManageReports(user([UserRole.evaluator]), 10),
    ).resolves.toBeUndefined();
    expect(findAssignment).not.toHaveBeenCalled();
  });

  it('requires an assigned teacher or evaluator to manage reports', async () => {
    const findAssignment = jest.fn().mockResolvedValue({ id: 3 });
    const prisma = {
      projectActorAssignment: { findFirst: findAssignment },
    };
    const service = new AuthorizationService(prisma as never);

    await expect(
      service.assertCanManageReports(user([UserRole.teacher]), 10),
    ).resolves.toBeUndefined();
    expect(findAssignment).toHaveBeenCalledWith({
      where: {
        projectId: 10,
        userId: 7,
        role: { in: [ActorRole.teacher, ActorRole.evaluator] },
      },
      select: { id: true },
    });
  });

  it('rejects an unassigned teacher from managing reports', async () => {
    const findAssignment = jest.fn().mockResolvedValue(null);
    const prisma = {
      projectActorAssignment: { findFirst: findAssignment },
    };
    const service = new AuthorizationService(prisma as never);

    await expect(
      service.assertCanManageReports(user([UserRole.teacher]), 10),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows admins to assign actors without a project assignment', async () => {
    const findAssignment = jest.fn();
    const prisma = {
      projectActorAssignment: { findFirst: findAssignment },
    };
    const service = new AuthorizationService(prisma as never);

    await expect(
      service.assertCanAssignActors(user([UserRole.admin]), 10),
    ).resolves.toBeUndefined();
    expect(findAssignment).not.toHaveBeenCalled();
  });

  it('allows global evaluators to assign actors without a project assignment', async () => {
    const findAssignment = jest.fn();
    const prisma = {
      projectActorAssignment: { findFirst: findAssignment },
    };
    const service = new AuthorizationService(prisma as never);

    await expect(
      service.assertCanAssignActors(user([UserRole.evaluator]), 10),
    ).resolves.toBeUndefined();
    expect(findAssignment).not.toHaveBeenCalled();
  });

  it('requires a teacher assignment for other users to assign actors', async () => {
    const findAssignment = jest.fn().mockResolvedValue({ id: 3 });
    const prisma = {
      projectActorAssignment: { findFirst: findAssignment },
    };
    const service = new AuthorizationService(prisma as never);

    await expect(
      service.assertCanAssignActors(user([UserRole.teacher]), 10),
    ).resolves.toBeUndefined();
    expect(findAssignment).toHaveBeenCalledWith({
      where: { projectId: 10, userId: 7, role: ActorRole.teacher },
      select: { id: true },
    });
  });

  it('rejects an unassigned teacher from assigning actors', async () => {
    const findAssignment = jest.fn().mockResolvedValue(null);
    const prisma = {
      projectActorAssignment: { findFirst: findAssignment },
    };
    const service = new AuthorizationService(prisma as never);

    await expect(
      service.assertCanAssignActors(user([UserRole.teacher]), 10),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets the project proposer approve the phase without an assignment', async () => {
    const findAssignment = jest.fn();
    const service = new AuthorizationService({
      projectActorAssignment: { findFirst: findAssignment },
    } as never);

    await expect(
      service.assertCanApproveProjectPhase(user([UserRole.student]), {
        id: 10,
        proposerUserId: 7,
      }),
    ).resolves.toBe('proposer');
    expect(findAssignment).not.toHaveBeenCalled();
  });

  it('lets an assigned evaluator approve the phase', async () => {
    const findAssignment = jest.fn().mockResolvedValue({ id: 3 });
    const service = new AuthorizationService({
      projectActorAssignment: { findFirst: findAssignment },
    } as never);

    await expect(
      service.assertCanApproveProjectPhase(user([UserRole.teacher]), {
        id: 10,
        proposerUserId: null,
      }),
    ).resolves.toBe('evaluator');
    expect(findAssignment).toHaveBeenCalledWith({
      where: { projectId: 10, userId: 7, role: ActorRole.evaluator },
      select: { id: true },
    });
  });

  it('rejects phase approvals from users who are neither proposer nor assigned evaluator', async () => {
    const service = new AuthorizationService({
      projectActorAssignment: { findFirst: jest.fn().mockResolvedValue(null) },
    } as never);

    await expect(
      service.assertCanApproveProjectPhase(user([UserRole.admin]), {
        id: 10,
        proposerUserId: 999,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  const editableProject = (
    overrides: Partial<{
      id: number;
      proposerUserId: number | null;
      status: ProjectStatus;
    }> = {},
  ) => ({
    id: 10,
    proposerUserId: null,
    status: ProjectStatus.proposed,
    ...overrides,
  });

  it('allows admins to edit project details without an assignment', async () => {
    const findAssignment = jest.fn();
    const service = new AuthorizationService({
      projectActorAssignment: { findFirst: findAssignment },
    } as never);

    await expect(
      service.assertCanEditProjectDetails(
        user([UserRole.admin]),
        editableProject(),
      ),
    ).resolves.toBeUndefined();
    expect(findAssignment).not.toHaveBeenCalled();
  });

  it('allows a global evaluator to edit project details without an assignment', async () => {
    const findAssignment = jest.fn();
    const service = new AuthorizationService({
      projectActorAssignment: { findFirst: findAssignment },
    } as never);

    await expect(
      service.assertCanEditProjectDetails(
        user([UserRole.evaluator]),
        editableProject(),
      ),
    ).resolves.toBeUndefined();
    expect(findAssignment).not.toHaveBeenCalled();
  });

  it('allows an assigned teacher to edit project details', async () => {
    const findAssignment = jest.fn().mockResolvedValue({ id: 3 });
    const service = new AuthorizationService({
      projectActorAssignment: { findFirst: findAssignment },
    } as never);

    await expect(
      service.assertCanEditProjectDetails(
        user([UserRole.teacher]),
        editableProject(),
      ),
    ).resolves.toBeUndefined();
    expect(findAssignment).toHaveBeenCalledWith({
      where: {
        projectId: 10,
        userId: 7,
        role: { in: [ActorRole.teacher, ActorRole.evaluator] },
      },
      select: { id: true },
    });
  });

  it('allows a teacher assigned as evaluator to edit project details', async () => {
    const findAssignment = jest.fn().mockResolvedValue({ id: 3 });
    const service = new AuthorizationService({
      projectActorAssignment: { findFirst: findAssignment },
    } as never);

    await expect(
      service.assertCanEditProjectDetails(
        user([UserRole.teacher]),
        editableProject(),
      ),
    ).resolves.toBeUndefined();
  });

  it('rejects an unassigned teacher', async () => {
    const findAssignment = jest.fn().mockResolvedValue(null);
    const service = new AuthorizationService({
      projectActorAssignment: { findFirst: findAssignment },
    } as never);

    await expect(
      service.assertCanEditProjectDetails(
        user([UserRole.teacher]),
        editableProject(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a student who is not the proposer', async () => {
    const service = new AuthorizationService({
      projectActorAssignment: { findFirst: jest.fn().mockResolvedValue(null) },
    } as never);

    await expect(
      service.assertCanEditProjectDetails(
        user([UserRole.student]),
        editableProject(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([ProjectStatus.proposed, ProjectStatus.under_review])(
    'allows the proposer to edit while the project is %s',
    async (status) => {
      const service = new AuthorizationService({
        projectActorAssignment: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      } as never);

      await expect(
        service.assertCanEditProjectDetails(
          user([UserRole.student]),
          editableProject({ proposerUserId: 7, status }),
        ),
      ).resolves.toBeUndefined();
    },
  );

  it('rejects the proposer once the project leaves the review window', async () => {
    const service = new AuthorizationService({
      projectActorAssignment: { findFirst: jest.fn().mockResolvedValue(null) },
    } as never);

    await expect(
      service.assertCanEditProjectDetails(
        user([UserRole.student]),
        editableProject({
          proposerUserId: 7,
          status: ProjectStatus.approved,
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows any assigned project member to comment', async () => {
    const findAssignment = jest.fn().mockResolvedValue({ id: 4 });
    const prisma = {
      projectActorAssignment: { findFirst: findAssignment },
    };
    const service = new AuthorizationService(prisma as never);

    await expect(
      service.assertCanComment(user([UserRole.student]), 10),
    ).resolves.toBeUndefined();
    expect(findAssignment).toHaveBeenCalledWith({
      where: { projectId: 10, userId: 7 },
      select: { id: true },
    });
  });

  it('allows admins to comment without a project assignment', async () => {
    const findAssignment = jest.fn();
    const prisma = {
      projectActorAssignment: { findFirst: findAssignment },
    };
    const service = new AuthorizationService(prisma as never);

    await expect(
      service.assertCanComment(user([UserRole.admin]), 10),
    ).resolves.toBeUndefined();
    expect(findAssignment).not.toHaveBeenCalled();
  });

  it('allows global evaluators to comment without a project assignment', async () => {
    const findAssignment = jest.fn();
    const prisma = {
      projectActorAssignment: { findFirst: findAssignment },
    };
    const service = new AuthorizationService(prisma as never);

    await expect(
      service.assertCanComment(user([UserRole.evaluator]), 10),
    ).resolves.toBeUndefined();
    expect(findAssignment).not.toHaveBeenCalled();
  });

  it('rejects commenting without a project assignment', async () => {
    const findAssignment = jest.fn().mockResolvedValue(null);
    const prisma = {
      projectActorAssignment: { findFirst: findAssignment },
    };
    const service = new AuthorizationService(prisma as never);

    await expect(
      service.assertCanComment(user([UserRole.teacher]), 10),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(findAssignment).toHaveBeenCalledWith({
      where: { projectId: 10, userId: 7 },
      select: { id: true },
    });
  });

  describe('project visibility', () => {
    function visibilityPrisma(project: unknown) {
      return {
        project: { findUnique: jest.fn().mockResolvedValue(project) },
      };
    }

    it('grants reviewers access without a project assignment', async () => {
      const prisma = visibilityPrisma({
        proposerUserId: 999,
        actorAssignments: [],
      });
      const service = new AuthorizationService(prisma as never);

      await expect(
        service.assertProjectMember(user([UserRole.evaluator]), 10),
      ).resolves.toBeUndefined();
    });

    it('keeps teachers scoped to their own or assigned projects', async () => {
      const prisma = visibilityPrisma({
        proposerUserId: 999,
        actorAssignments: [],
        status: ProjectStatus.in_progress,
        isPrivate: true,
      });
      const service = new AuthorizationService(prisma as never);

      await expect(
        service.assertProjectMember(user([UserRole.teacher]), 10),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('grants the proposer access to their own project', async () => {
      const prisma = visibilityPrisma({
        proposerUserId: 7,
        actorAssignments: [],
      });
      const service = new AuthorizationService(prisma as never);

      await expect(
        service.assertProjectMember(user([UserRole.student]), 10),
      ).resolves.toBeUndefined();
    });

    it('denies access to an unassigned user when the project is private', async () => {
      const prisma = {
        project: {
          findUnique: jest.fn().mockResolvedValue({
            proposerUserId: 999,
            actorAssignments: [],
            status: ProjectStatus.in_progress,
            isPrivate: true,
          }),
        },
      };
      const service = new AuthorizationService(prisma as never);

      await expect(
        service.assertProjectMember(user([UserRole.student]), 10),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows anonymous viewers when the project is closed and not private', async () => {
      const prisma = {
        project: {
          findUnique: jest.fn().mockResolvedValue({
            proposerUserId: 999,
            actorAssignments: [],
            status: ProjectStatus.closed,
            isPrivate: false,
          }),
        },
      };
      const service = new AuthorizationService(prisma as never);

      await expect(
        service.assertProjectMember(user([UserRole.student]), 10),
      ).resolves.toBeUndefined();
    });

    it('keeps a private closed project hidden from strangers', async () => {
      const prisma = {
        project: {
          findUnique: jest.fn().mockResolvedValue({
            proposerUserId: 999,
            actorAssignments: [],
            status: ProjectStatus.closed,
            isPrivate: true,
          }),
        },
      };
      const service = new AuthorizationService(prisma as never);

      await expect(
        service.assertProjectMember(user([UserRole.student]), 10),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('limits anonymous listings to closed, non-private projects', () => {
      const service = new AuthorizationService({} as never);

      expect(service.projectVisibilityWhere(undefined)).toEqual({
        isPrivate: false,
        status: ProjectStatus.closed,
      });
    });

    it('lets reviewers list every project', () => {
      const service = new AuthorizationService({} as never);

      expect(service.projectVisibilityWhere(user([UserRole.admin]))).toEqual(
        {},
      );
    });

    it('scopes teacher listings to public, proposed and assigned projects', () => {
      const service = new AuthorizationService({} as never);

      expect(service.projectVisibilityWhere(user([UserRole.teacher]))).toEqual({
        OR: [
          { isPrivate: false, status: ProjectStatus.closed },
          { proposerUserId: 7 },
          { actorAssignments: { some: { userId: 7 } } },
        ],
      });
    });

    it('scopes listings to public, proposed and assigned projects', () => {
      const service = new AuthorizationService({} as never);

      expect(service.projectVisibilityWhere(user([UserRole.student]))).toEqual({
        OR: [
          { isPrivate: false, status: ProjectStatus.closed },
          { proposerUserId: 7 },
          { actorAssignments: { some: { userId: 7 } } },
        ],
      });
    });

    it('exposes the pure membership check for loaded projects', () => {
      const service = new AuthorizationService({} as never);
      const project = {
        proposerUserId: 999,
        actorAssignments: [{ userId: 7 }],
      };

      expect(
        service.canViewProjectData(user([UserRole.teacher]), project),
      ).toBe(true);
      expect(
        service.canViewProjectData(user([UserRole.student]), project),
      ).toBe(true);
      expect(
        service.canViewProjectData(user([UserRole.student]), {
          proposerUserId: 999,
          actorAssignments: [],
        }),
      ).toBe(false);
    });
  });

  describe('assertCanWriteProjectData', () => {
    function writePrisma(project: unknown) {
      return {
        project: { findUnique: jest.fn().mockResolvedValue(project) },
      };
    }

    it('allows admins without a project assignment', async () => {
      const service = new AuthorizationService(writePrisma(null) as never);

      await expect(
        service.assertCanWriteProjectData(user([UserRole.admin]), 10),
      ).resolves.toBeUndefined();
    });

    it('allows the project proposer', async () => {
      const service = new AuthorizationService(
        writePrisma({ proposerUserId: 7, actorAssignments: [] }) as never,
      );

      await expect(
        service.assertCanWriteProjectData(user([UserRole.student]), 10),
      ).resolves.toBeUndefined();
    });

    it('allows an assigned actor', async () => {
      const service = new AuthorizationService(
        writePrisma({
          proposerUserId: 999,
          actorAssignments: [{ userId: 7 }],
        }) as never,
      );

      await expect(
        service.assertCanWriteProjectData(user([UserRole.student]), 10),
      ).resolves.toBeUndefined();
    });

    it('rejects an unassigned global evaluator', async () => {
      const service = new AuthorizationService(
        writePrisma({ proposerUserId: 999, actorAssignments: [] }) as never,
      );

      await expect(
        service.assertCanWriteProjectData(user([UserRole.evaluator]), 10),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects an unassigned user even when the project is public', async () => {
      const service = new AuthorizationService(
        writePrisma({ proposerUserId: 999, actorAssignments: [] }) as never,
      );

      await expect(
        service.assertCanWriteProjectData(user([UserRole.student]), 10),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects writes to a missing project', async () => {
      const service = new AuthorizationService(writePrisma(null) as never);

      await expect(
        service.assertCanWriteProjectData(user([UserRole.student]), 10),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('assertCanCreateProject', () => {
    it('allows a self-registered proposer to create projects', () => {
      const service = new AuthorizationService({} as never);

      expect(() =>
        service.assertCanCreateProject(user([UserRole.proposer])),
      ).not.toThrow();
    });

    it('rejects users without any global role', () => {
      const service = new AuthorizationService({} as never);

      expect(() => service.assertCanCreateProject(user([]))).toThrow(
        ForbiddenException,
      );
    });
  });
});
