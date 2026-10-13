import { ProjectMilestoneItem, ProjectPhase } from "./schemas";
import { apiRequest, apiRequestVoid } from "@/lib/http";

export type CreateProjectMilestonePayload = {
  title: string;
  description?: string | null;
  dueDate: string;
  completed?: boolean;
  isMinimum?: boolean;
  phase?: ProjectPhase;
  reportIds?: number[];
};

export type UpdateProjectMilestonePayload = Partial<
  CreateProjectMilestonePayload
>;

export function getProjectMilestones(
  id: string,
): Promise<ProjectMilestoneItem[]> {
  return apiRequest<ProjectMilestoneItem[]>(`/api/projects/${id}/milestones`, {
    action: "consultar los hitos del proyecto",
  });
}

export function createProjectMilestone(
  id: string,
  payload: CreateProjectMilestonePayload,
): Promise<ProjectMilestoneItem> {
  return apiRequest<ProjectMilestoneItem>(`/api/projects/${id}/milestones`, {
    method: "POST",
    body: payload,
    action: "crear un hito",
  });
}

export function updateProjectMilestone(
  id: string,
  milestoneId: number,
  payload: UpdateProjectMilestonePayload,
): Promise<ProjectMilestoneItem> {
  return apiRequest<ProjectMilestoneItem>(
    `/api/projects/${id}/milestones/${milestoneId}`,
    {
      method: "PATCH",
      body: payload,
      action: "editar un hito",
    },
  );
}

export function deleteProjectMilestone(
  id: string,
  milestoneId: number,
): Promise<void> {
  return apiRequestVoid(`/api/projects/${id}/milestones/${milestoneId}`, {
    method: "DELETE",
    action: "eliminar un hito",
  });
}
