import {
  ProjectDetails,
  ProjectItem,
  ProjectSource,
  UserSummary,
  MyProject,
  UpdateProjectPayload,
} from "./schemas";
import { getApiUrl } from "@/lib/api";
import {
  apiErrorMessage,
  apiRequest,
  notifyUnauthorized,
} from "@/lib/http";

const PROJECT_EDIT_CONFLICT_MESSAGE =
  "El proyecto está finalizado o rechazado y ya no se puede editar.";

export type CreateProjectPayload = {
  name: string;
  namep: string;
  correo: string;
  description: string;
  context: string;
  requiresLegalization?: boolean;
  isPrivate?: boolean;
  source?: ProjectSource;
  sourceDetails?: string;
  ncedua?: string;
  facultyAdvisor?: string;
  teamRequirements?: string;
  expectedOutcomes?: string;
  deliverables?: string[];
  submissionConsentAt: string;
};

export async function getProjects(): Promise<{
  projects: ProjectItem[];
  status?: number;
  error?: string;
}> {
  try {
    const response = await fetch(getApiUrl("/api/projects"), {
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        notifyUnauthorized();
      }

      return {
        projects: [],
        status: response.status,
        error: await apiErrorMessage(response),
      };
    }

    const data = (await response.json()) as ProjectItem[];
    return {
      projects: Array.isArray(data) ? data : [],
    };
  } catch (err) {
    return {
      projects: [],
      error: "Unable to reach the backend projects endpoint: " + err,
    };
  }
}

export async function getMyProjects(): Promise<{
  projects: MyProject[];
  error?: string;
}> {
  try {
    const response = await fetch(getApiUrl("/api/projects/mine"), {
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        notifyUnauthorized();
      }

      return {
        projects: [],
        error: await apiErrorMessage(response),
      };
    }

    const data = (await response.json()) as MyProject[];
    return {
      projects: Array.isArray(data) ? data : [],
    };
  } catch (err) {
    return {
      projects: [],
      error: "Unable to reach the backend projects endpoint: " + err,
    };
  }
}

export async function getProjectById(id: string): Promise<{
  project?: ProjectDetails;
  status?: number;
  error?: string;
}> {
  try {
    const response = await fetch(getApiUrl(`/api/projects/${id}`), {
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        notifyUnauthorized();
      }

      return {
        status: response.status,
        error: await apiErrorMessage(response),
      };
    }

    const data = (await response.json()) as ProjectDetails;
    return {
      project: data,
    };
  } catch (err) {
    return {
      error: "Unable to reach the backend project endpoint: " + err,
    };
  }
}

export function updateProjectStatus(
  id: string,
  status: string,
  description?: string,
): Promise<ProjectDetails> {
  return apiRequest<ProjectDetails>(`/api/projects/${id}/status`, {
    method: "PATCH",
    body: { status, description },
    action: "cambiar el estado del proyecto",
  });
}

export function advanceProjectPhase(id: string): Promise<ProjectDetails> {
  return apiRequest<ProjectDetails>(`/api/projects/${id}/phase/advance`, {
    method: "POST",
    action: "avanzar la fase del proyecto",
  });
}

export function approveProjectPhase(id: string): Promise<ProjectDetails> {
  return apiRequest<ProjectDetails>(`/api/projects/${id}/phase/approvals`, {
    method: "POST",
    action: "dar el visto bueno de fase",
  });
}

export function revokeProjectPhaseApproval(id: string): Promise<ProjectDetails> {
  return apiRequest<ProjectDetails>(`/api/projects/${id}/phase/approvals`, {
    method: "DELETE",
    action: "retirar el visto bueno de fase",
  });
}

export function updateProject(
  id: string,
  payload: UpdateProjectPayload,
): Promise<ProjectDetails> {
  return apiRequest<ProjectDetails>(`/api/projects/${id}`, {
    method: "PUT",
    body: payload,
    action: "editar el proyecto",
    conflictMessage: PROJECT_EDIT_CONFLICT_MESSAGE,
  });
}

export function createProject(payload: CreateProjectPayload): Promise<ProjectDetails> {
  return apiRequest<ProjectDetails>("/api/projects", {
    method: "POST",
    body: payload,
    action: "proponer un proyecto",
  });
}

export async function getAssignableUsers(
  projectId: number,
): Promise<{ users: UserSummary[]; error?: string }> {
  try {
    const response = await fetch(
      getApiUrl(`/api/projects/${projectId}/assignable-users`),
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return {
        users: [],
        error: await apiErrorMessage(response),
      };
    }

    const data = (await response.json()) as UserSummary[];
    return {
      users: Array.isArray(data) ? data : [],
    };
  } catch (err) {
    return {
      users: [],
      error: "Unable to reach the backend users endpoint: " + err,
    };
  }
}

type ProjectActorAssignmentResult = {
  id: number;
  projectId: number;
  userId: number;
  role: string;
  assignedAt: string;
  project: { id: number; name: string };
  user: { id: number; fullName: string; email: string };
};

export function addProjectActorAssignment(
  projectId: number,
  payload: { userId: number; role: string },
): Promise<ProjectActorAssignmentResult> {
  return apiRequest<ProjectActorAssignmentResult>(
    `/api/projects/${projectId}/actors`,
    {
      method: "POST",
      body: payload,
      action: "asignar actores al proyecto",
    },
  );
}
