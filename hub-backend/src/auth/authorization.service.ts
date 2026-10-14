import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActorRole,
  Prisma,
  UserRole,
  ProjectStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import { AuthenticatedUser } from './auth.types';
import { ACTOR_ROLE_LICENSES, hasActorRoleLicense } from './actor-role-license';
import { PhaseApprovalKind } from '../projects/projects.phase';

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Acceso de LECTURA: un miembro del proyecto o, si el proyecto es público
   * (cerrado y no privado), cualquier usuario autenticado. No autoriza
   * mutaciones; para eso usa {@link assertCanWriteProjectData}.
   */
  async assertProjectMember(
    user: AuthenticatedUser,
    projectId: number,
  ): Promise<void> {
    if (await this.canViewProject(user, projectId)) {
      return;
    }

    if (await this.projectIsPublic(projectId)) {
      return;
    }

    throw new ForbiddenException('You do not have access to this project');
  }

  /**
   * Acceso de ESCRITURA: solo administradores, el proponente o un actor
   * asignado al proyecto. A diferencia de la lectura, un revisor global
   * (evaluator) sin asignación NO puede escribir en proyectos ajenos, y los
   * proyectos públicos no otorgan escritura a extraños.
   */
  async assertCanWriteProjectData(
    user: AuthenticatedUser,
    projectId: number,
  ): Promise<void> {
    if (user.roles.includes(UserRole.admin)) {
      return;
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        proposerUserId: true,
        actorAssignments: { select: { userId: true } },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    if (project.proposerUserId === user.id) {
      return;
    }

    if (
      project.actorAssignments.some(
        (assignment) => assignment.userId === user.id,
      )
    ) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to modify this project',
    );
  }

  /**
   * Los evaluadores globales revisan cualquier proyecto sin asignarse y los
   * administradores pasan siempre. El resto de roles solo ve proyectos en los
   * que participa (proponente o actor asignado).
   */
  private canReviewAnyProject(user: AuthenticatedUser): boolean {
    return (
      user.roles.includes(UserRole.admin) ||
      user.roles.includes(UserRole.evaluator)
    );
  }

  /**
   * Un proyecto es visible públicamente cuando ya finalizó (`closed`) y el
   * proponente no pidió privacidad. Los proyectos rechazados nunca son
   * públicos.
   */
  private async projectIsPublic(projectId: number): Promise<boolean> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true, isPrivate: true },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return !project.isPrivate && project.status === ProjectStatus.closed;
  }

  /**
   * Los miembros son usuarios con una relación sensible con el proyecto: su
   * proponente, sus actores asignados o un evaluador global/admin.
   */
  async canViewProject(
    user: AuthenticatedUser,
    projectId: number,
  ): Promise<boolean> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        proposerUserId: true,
        actorAssignments: { select: { userId: true } },
      },
    });

    if (!project) {
      return false;
    }

    return this.canViewProjectData(user, project);
  }

  /**
   * Variante pura para quien ya tiene el proyecto cargado (por ejemplo los
   * listados), de modo que no se dispare una consulta por proyecto.
   */
  canViewProjectData(
    user: AuthenticatedUser,
    project: {
      proposerUserId: number | null;
      actorAssignments: readonly { userId: number }[];
    },
  ): boolean {
    if (this.canReviewAnyProject(user)) {
      return true;
    }

    if (project.proposerUserId === user.id) {
      return true;
    }

    return project.actorAssignments.some(
      (assignment) => assignment.userId === user.id,
    );
  }

  /**
   * Construye la cláusula `where` que limita los listados de proyectos a los
   * que el espectador puede ver: los públicos más los propios.
   */
  projectVisibilityWhere(
    user: AuthenticatedUser | undefined,
  ): Prisma.ProjectWhereInput {
    const publicWhere: Prisma.ProjectWhereInput = {
      isPrivate: false,
      status: ProjectStatus.closed,
    };

    if (!user) {
      return publicWhere;
    }

    if (this.canReviewAnyProject(user)) {
      return {};
    }

    return {
      OR: [
        publicWhere,
        { proposerUserId: user.id },
        { actorAssignments: { some: { userId: user.id } } },
      ],
    };
  }

  async assertAssignedProjectMember(
    user: AuthenticatedUser,
    projectId: number,
  ): Promise<void> {
    const assignment = await this.prisma.projectActorAssignment.findFirst({
      where: { projectId, userId: user.id },
      select: { id: true },
    });

    if (!assignment) {
      throw new ForbiddenException('Project assignment is required');
    }
  }

  assertCanCreateProject(user: AuthenticatedUser): void {
    if (user.roles.length === 0) {
      throw new ForbiddenException('A role is required to create projects');
    }
  }

  async assertCanManageProject(
    user: AuthenticatedUser,
    projectId: number,
  ): Promise<void> {
    if (user.roles.includes(UserRole.admin)) {
      return;
    }

    await this.assertProjectAssignment(user, projectId, ActorRole.teacher);
  }

  /**
   * Exige que el usuario pueda dar su visto bueno para avanzar de fase: el
   * proponente del proyecto o un evaluador asignado. Devuelve el papel con el
   * que participa en la aprobación.
   */
  async assertCanApproveProjectPhase(
    user: AuthenticatedUser,
    project: { id: number; proposerUserId: number | null },
  ): Promise<PhaseApprovalKind> {
    if (project.proposerUserId === user.id) {
      return 'proposer';
    }

    const assignment = await this.prisma.projectActorAssignment.findFirst({
      where: {
        projectId: project.id,
        userId: user.id,
        role: ActorRole.evaluator,
      },
      select: { id: true },
    });

    if (assignment) {
      return 'evaluator';
    }

    throw new ForbiddenException(
      'Only the project proposer or an assigned evaluator can approve the phase',
    );
  }

  /**
   * Editar los datos del proyecto está disponible para administradores,
   * evaluadores globales, docentes/evaluadores asignados al proyecto y,
   * mientras el proyecto siga en propuesta o revisión, para su proponente (sea
   * cual sea su rol global).
   */
  async assertCanEditProjectDetails(
    user: AuthenticatedUser,
    project: {
      id: number;
      proposerUserId: number | null;
      status: ProjectStatus;
    },
  ): Promise<void> {
    if (user.roles.includes(UserRole.admin)) {
      return;
    }

    if (user.roles.includes(UserRole.evaluator)) {
      return;
    }

    const assignment = await this.prisma.projectActorAssignment.findFirst({
      where: {
        projectId: project.id,
        userId: user.id,
        role: { in: [ActorRole.teacher, ActorRole.evaluator] },
      },
      select: { id: true },
    });

    if (assignment) {
      return;
    }

    const isEditableProposer =
      project.proposerUserId === user.id &&
      (project.status === ProjectStatus.proposed ||
        project.status === ProjectStatus.under_review);

    if (isEditableProposer) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to edit this project',
    );
  }

  async assertCanAssignActors(
    user: AuthenticatedUser,
    projectId: number,
  ): Promise<void> {
    if (user.roles.includes(UserRole.admin)) {
      return;
    }

    await this.assertProjectAssignment(user, projectId, ActorRole.teacher);
  }

  async assertCanManageMilestone(
    user: AuthenticatedUser,
    projectId: number,
  ): Promise<void> {
    if (user.roles.includes(UserRole.admin)) {
      return;
    }

    const assignment = await this.prisma.projectActorAssignment.findFirst({
      where: {
        projectId,
        userId: user.id,
        role: { in: [ActorRole.teacher, ActorRole.evaluator] },
      },
      select: { id: true },
    });

    if (!assignment) {
      throw new ForbiddenException(
        'A project teacher or evaluator assignment is required for this action',
      );
    }
  }

  async assertCanTransitionProject(
    user: AuthenticatedUser,
    projectId: number,
    previousStatus: ProjectStatus,
    nextStatus: ProjectStatus,
  ): Promise<void> {
    if (user.roles.includes(UserRole.admin)) {
      return;
    }

    const evaluatorTransitions =
      previousStatus === ProjectStatus.proposed ||
      previousStatus === ProjectStatus.under_review ||
      (previousStatus === ProjectStatus.approved &&
        nextStatus === ProjectStatus.rejected);

    if (evaluatorTransitions) {
      await this.assertProjectAssignment(user, projectId, ActorRole.evaluator);
      return;
    }

    await this.assertProjectAssignment(user, projectId, ActorRole.teacher);
  }

  async assertAssignableUser(userId: number, role: ActorRole): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isActive: true,
        roleAssignments: { select: { role: true } },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (!user.isActive) {
      throw new ForbiddenException('Inactive users cannot be assigned');
    }

    const globalRoles = user.roleAssignments.map(({ role: r }) => r);

    if (!hasActorRoleLicense(globalRoles, role)) {
      const licenses = ACTOR_ROLE_LICENSES[role];
      throw new ForbiddenException(
        `User ${userId} needs a global ${licenses.join(' or ')} role to be assigned as ${role}`,
      );
    }
  }

  private async assertProjectAssignment(
    user: AuthenticatedUser,
    projectId: number,
    role: ActorRole,
  ): Promise<void> {
    const assignment = await this.prisma.projectActorAssignment.findFirst({
      where: { projectId, userId: user.id, role },
      select: { id: true },
    });

    if (!assignment) {
      throw new ForbiddenException(
        `A project ${role} assignment is required for this action`,
      );
    }
  }
}
