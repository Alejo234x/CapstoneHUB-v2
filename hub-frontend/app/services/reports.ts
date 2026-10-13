import { ProjectReportContentKind, ProjectReportItem } from "./schemas";
import { apiRequest, apiRequestVoid } from "@/lib/http";

export const REPORT_CONFLICT_MESSAGE =
  "La entrega no está en un estado válido para esta acción.";

export type CreateProjectReportPayload = {
  title: string;
  description?: string | null;
  dueDate: string;
  type: ProjectReportContentKind;
  allowedMimeTypes?: string[];
  maxFiles?: number;
};

export type UpdateProjectReportPayload = Partial<CreateProjectReportPayload>;

export function getProjectReports(id: string): Promise<ProjectReportItem[]> {
  return apiRequest<ProjectReportItem[]>(`/api/projects/${id}/reports`, {
    action: "consultar la entrega",
    conflictMessage: REPORT_CONFLICT_MESSAGE,
  });
}

export function createProjectReport(
  id: string,
  payload: CreateProjectReportPayload,
): Promise<ProjectReportItem> {
  return apiRequest<ProjectReportItem>(`/api/projects/${id}/reports`, {
    method: "POST",
    body: payload,
    action: "crear la entrega",
    conflictMessage: REPORT_CONFLICT_MESSAGE,
  });
}

export function updateProjectReport(
  id: string,
  reportId: number,
  payload: UpdateProjectReportPayload,
): Promise<ProjectReportItem> {
  return apiRequest<ProjectReportItem>(
    `/api/projects/${id}/reports/${reportId}`,
    {
      method: "PATCH",
      body: payload,
      action: "editar la entrega",
      conflictMessage: REPORT_CONFLICT_MESSAGE,
    },
  );
}

export function deleteProjectReport(
  id: string,
  reportId: number,
): Promise<void> {
  return apiRequestVoid(`/api/projects/${id}/reports/${reportId}`, {
    method: "DELETE",
    action: "eliminar la entrega",
    conflictMessage: REPORT_CONFLICT_MESSAGE,
  });
}

export function submitProjectReport(
  id: string,
  reportId: number,
): Promise<ProjectReportItem> {
  return apiRequest<ProjectReportItem>(
    `/api/projects/${id}/reports/${reportId}/submit`,
    {
      method: "POST",
      action: "enviar la entrega",
      conflictMessage: REPORT_CONFLICT_MESSAGE,
    },
  );
}

export function reviewProjectReport(
  id: string,
  reportId: number,
  decision: "accepted" | "rejected",
  comment?: string,
): Promise<ProjectReportItem> {
  return apiRequest<ProjectReportItem>(
    `/api/projects/${id}/reports/${reportId}/review`,
    {
      method: "POST",
      body: { decision, comment },
      action: "revisar la entrega",
      conflictMessage: REPORT_CONFLICT_MESSAGE,
    },
  );
}
