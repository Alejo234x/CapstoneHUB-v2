import type { ProjectDetails } from "./schemas";

/**
 * Reglas de permisos del proyecto en el cliente. Reflejan
 * `AuthorizationService` en el backend: el rol asignado al proyecto decide lo
 * que se puede hacer; los roles globales solo habilitan la asignación (más el
 * caso especial del evaluador global, que revisa cualquier proyecto).
 */

export type ProjectViewer = {
  id: number;
  roles: readonly string[];
};

export type ProjectAssignment = {
  userId: number;
  role: string;
};

export const PROJECT_STATUS_OPTIONS = [
  { value: "proposed", label: "Propuesto" },
  { value: "under_review", label: "En revisión" },
  { value: "approved", label: "Aprobado" },
  { value: "in_progress", label: "En progreso" },
  { value: "paused", label: "En pausa" },
  { value: "closed", label: "Finalizado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "rejected", label: "Rechazado" },
] as const;

/** Estados terminales en los que el proyecto pasa a ser de solo lectura. */
const READ_ONLY_STATUSES = new Set(["closed", "rejected"]);

/** Estados en los que el proponente todavía puede corregir su propuesta. */
const PROPOSER_EDITABLE_STATUSES = new Set(["proposed", "under_review"]);

/** Roles de proyecto que supervisan la ejecución. */
const TEACHER_ROLES = ["teacher"] as const;

/** Roles de proyecto que gestionan hitos, entregas y datos. */
const MANAGEMENT_ROLES = ["teacher", "evaluator"] as const;

export function isAdmin(viewer: ProjectViewer): boolean {
  return viewer.roles.includes("admin");
}

/** Admin y evaluadores globales revisan cualquier proyecto sin asignarse. */
export function reviewsAnyProject(viewer: ProjectViewer): boolean {
  return isAdmin(viewer) || viewer.roles.includes("evaluator");
}

function isAssignedWith(
  viewer: ProjectViewer,
  assignments: readonly ProjectAssignment[],
  roles: readonly string[],
): boolean {
  return assignments.some(
    (assignment) =>
      assignment.userId === viewer.id && roles.includes(assignment.role),
  );
}

export function isAssignedMember(
  viewer: ProjectViewer,
  assignments: readonly ProjectAssignment[],
): boolean {
  return assignments.some((assignment) => assignment.userId === viewer.id);
}

export function isAssignedTeacher(
  viewer: ProjectViewer,
  assignments: readonly ProjectAssignment[],
): boolean {
  return isAssignedWith(viewer, assignments, TEACHER_ROLES);
}

export function canViewSensitiveData(
  viewer: ProjectViewer | null | undefined,
  project: Pick<ProjectDetails, "isProposer" | "actorAssignments">,
): boolean {
  if (!viewer) {
    return false;
  }

  if (reviewsAnyProject(viewer)) {
    return true;
  }

  if (project.isProposer) {
    return true;
  }

  return isAssignedMember(viewer, project.actorAssignments ?? []);
}

export function canEditProjectDetails(
  viewer: ProjectViewer,
  project: Pick<ProjectDetails, "status" | "isProposer" | "actorAssignments">,
): boolean {
  if (READ_ONLY_STATUSES.has(project.status)) {
    return false;
  }

  if (reviewsAnyProject(viewer)) {
    return true;
  }

  if (
    isAssignedWith(viewer, project.actorAssignments ?? [], MANAGEMENT_ROLES)
  ) {
    return true;
  }

  return Boolean(project.isProposer) && PROPOSER_EDITABLE_STATUSES.has(
    project.status,
  );
}

/** Gestionar el proyecto: asignar actores, borrarlo. */
export function canManageProject(
  viewer: ProjectViewer,
  assignments: readonly ProjectAssignment[],
): boolean {
  return isAdmin(viewer) || isAssignedTeacher(viewer, assignments);
}

/** Gestionar hitos y entregas. */
export function canManageMilestones(
  viewer: ProjectViewer,
  assignments: readonly ProjectAssignment[],
): boolean {
  return isAdmin(viewer) || isAssignedWith(viewer, assignments, MANAGEMENT_ROLES);
}

/** Avanzar de fase (semestre). */
export function canAdvancePhase(
  viewer: ProjectViewer,
  assignments: readonly ProjectAssignment[],
): boolean {
  return isAdmin(viewer) || isAssignedTeacher(viewer, assignments);
}

/** Enviar entregas: cualquier miembro asignado (o un admin). */
export function canSubmitReports(
  viewer: ProjectViewer,
  assignments: readonly ProjectAssignment[],
): boolean {
  return isAdmin(viewer) || isAssignedMember(viewer, assignments);
}

/** Comentar/observar el proyecto: cualquier miembro asignado. */
export function canComment(
  viewer: ProjectViewer,
  assignments: readonly ProjectAssignment[],
): boolean {
  return isAssignedMember(viewer, assignments);
}

export function canDeleteAttachment(
  viewer: ProjectViewer,
  assignments: readonly ProjectAssignment[],
  uploadedById: number | null | undefined,
): boolean {
  if (uploadedById === viewer.id) {
    return true;
  }

  return isAdmin(viewer) || isAssignedTeacher(viewer, assignments);
}

function getManagedStatuses(
  viewer: ProjectViewer,
  assignments: readonly ProjectAssignment[],
  currentStatus: string,
): ReadonlyArray<(typeof PROJECT_STATUS_OPTIONS)[number]> {
  if (isAdmin(viewer)) {
    return PROJECT_STATUS_OPTIONS;
  }

  const isEvaluator = isAssignedWith(viewer, assignments, ["evaluator"]);
  const isTeacher = isAssignedTeacher(viewer, assignments);
  const allowed = new Set<string>();

  switch (currentStatus) {
    case "proposed":
      if (isEvaluator) {
        allowed.add("under_review");
        allowed.add("rejected");
      }
      break;
    case "under_review":
      if (isEvaluator) {
        allowed.add("approved");
        allowed.add("rejected");
      }
      break;
    case "approved":
      if (isEvaluator) {
        allowed.add("rejected");
      }
      if (isTeacher) {
        allowed.add("in_progress");
      }
      break;
    case "in_progress":
      if (isTeacher) {
        allowed.add("paused");
        allowed.add("closed");
        allowed.add("cancelled");
      }
      break;
    case "paused":
      if (isTeacher) {
        allowed.add("in_progress");
        allowed.add("cancelled");
      }
      break;
    default:
      break;
  }

  return PROJECT_STATUS_OPTIONS.filter((status) => allowed.has(status.value));
}

export function getAvailableStatuses(
  viewer: ProjectViewer,
  assignments: readonly ProjectAssignment[],
  currentStatus: string,
): ReadonlyArray<(typeof PROJECT_STATUS_OPTIONS)[number]> {
  return getManagedStatuses(viewer, assignments, currentStatus);
}

export function canManageStatus(
  viewer: ProjectViewer,
  assignments: readonly ProjectAssignment[],
  currentStatus: string,
): boolean {
  return getManagedStatuses(viewer, assignments, currentStatus).length > 0;
}
