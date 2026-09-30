import {
  ProjectAttachmentItem,
  ProjectDetails,
  ProjectItem,
  ProjectMilestoneItem,
  ProjectObservationItem,
  ProjectReportContentItem,
  ProjectReportContentKind,
  ProjectReportItem,
  ProjectSource,
  UserSummary,
  MyProject,
  UpdateProjectPayload,
} from "./schemas";
import { getAuthToken } from "./auth";
import { ensureOk, readBackendMessage } from "@/lib/http";

const PROJECT_EDIT_CONFLICT_MESSAGE =
  "El proyecto está cerrado o rechazado y ya no se puede editar.";

const REPORT_CONFLICT_MESSAGE =
  "La entrega no está en un estado válido para esta acción.";

const apiBaseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

function getApiUrl(path: string) {
  if (typeof window === "undefined") {
    const fallback = "http://localhost:3000";
    return `${apiBaseUrl || fallback}${path}`;
  }

  return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();

  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export type CreateProjectPayload = {
  name: string;
  namep: string;
  correo: string;
  description: string;
  context: string;
  requiresLegalization?: boolean;
  isPrivate?: boolean;
  source?: ProjectSource;
  ncedua?: string;
  facultyAdvisor?: string;
  teamRequirements?: string;
  expectedOutcomes?: string;
  deliverables?: string[];
};

export async function getProjects(): Promise<{
  projects: ProjectItem[];
  status?: number;
  error?: string;
}> {
  try {
    const response = await fetch(getApiUrl("/api/projects"), {
      headers: getAuthHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        projects: [],
        status: response.status,
        error: await readBackendMessage(response),
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
      headers: getAuthHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        projects: [],
        error: await readBackendMessage(response),
      };
    }

    const data = (await response.json()) as MyProject[];
    return {
      projects: Array.isArray(data) ? data : [],
    };
  } catch (err) {
    return {
      projects: [],
      error:
        "Unable to reach the backend projects endpoint: " + err,
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
      headers: getAuthHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        status: response.status,
        error: await readBackendMessage(response),
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

export async function updateProjectStatus(
  id: string,
  status: string,
  description?: string,
): Promise<ProjectDetails> {
  const response = await fetch(getApiUrl(`/api/projects/${id}/status`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ status, description }),
  });

  await ensureOk(response, { action: "cambiar el estado del proyecto" });

  return (await response.json()) as ProjectDetails;
}

export async function updateProject(
  id: string,
  payload: UpdateProjectPayload,
): Promise<ProjectDetails> {
  const response = await fetch(getApiUrl(`/api/projects/${id}`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  await ensureOk(response, {
    action: "editar el proyecto",
    conflictMessage: PROJECT_EDIT_CONFLICT_MESSAGE,
  });

  return (await response.json()) as ProjectDetails;
}

export async function createProjectObservation(
  id: string,
  content: string,
): Promise<ProjectObservationItem> {
  const response = await fetch(getApiUrl(`/api/projects/${id}/observations`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ content }),
  });

  await ensureOk(response, { action: "añadir una observación" });

  return (await response.json()) as ProjectObservationItem;
}

export type CreateProjectMilestonePayload = {
  title: string;
  description?: string | null;
  dueDate: string;
  completed?: boolean;
};

export type UpdateProjectMilestonePayload = Partial<
  CreateProjectMilestonePayload
>;

export async function getProjectMilestones(
  id: string,
): Promise<ProjectMilestoneItem[]> {
  const response = await fetch(getApiUrl(`/api/projects/${id}/milestones`), {
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  await ensureOk(response, { action: "consultar los hitos del proyecto" });

  return (await response.json()) as ProjectMilestoneItem[];
}

export async function createProjectMilestone(
  id: string,
  payload: CreateProjectMilestonePayload,
): Promise<ProjectMilestoneItem> {
  const response = await fetch(getApiUrl(`/api/projects/${id}/milestones`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  await ensureOk(response, { action: "crear un hito" });

  return (await response.json()) as ProjectMilestoneItem;
}

export async function updateProjectMilestone(
  id: string,
  milestoneId: number,
  payload: UpdateProjectMilestonePayload,
): Promise<ProjectMilestoneItem> {
  const response = await fetch(
    getApiUrl(`/api/projects/${id}/milestones/${milestoneId}`),
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    },
  );

  await ensureOk(response, { action: "editar un hito" });

  return (await response.json()) as ProjectMilestoneItem;
}

export async function deleteProjectMilestone(
  id: string,
  milestoneId: number,
): Promise<void> {
  const response = await fetch(
    getApiUrl(`/api/projects/${id}/milestones/${milestoneId}`),
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    },
  );

  await ensureOk(response, { action: "eliminar un hito" });
}

export async function createProject(
  payload: CreateProjectPayload,
): Promise<ProjectDetails> {
  const res = await fetch(getApiUrl("/api/projects"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  await ensureOk(res, { action: "proponer un proyecto" });

  return (await res.json()) as ProjectDetails;
}

export async function getAssignableUsers(
  projectId: number,
): Promise<{ users: UserSummary[]; error?: string }> {
  try {
    const response = await fetch(
      getApiUrl(`/api/projects/${projectId}/assignable-users`),
      {
        headers: getAuthHeaders(),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return {
        users: [],
        error: await readBackendMessage(response),
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

export async function addProjectActorAssignment(
  projectId: number,
  payload: { userId: number; role: string },
): Promise<{
  id: number;
  projectId: number;
  userId: number;
  role: string;
  assignedAt: string;
  project: { id: number; name: string };
  user: { id: number; fullName: string; email: string };
}> {
  const response = await fetch(getApiUrl(`/api/projects/${projectId}/actors`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  await ensureOk(response, { action: "asignar actores al proyecto" });

  return (await response.json()) as {
    id: number;
    projectId: number;
    userId: number;
    role: string;
    assignedAt: string;
    project: { id: number; name: string };
    user: { id: number; fullName: string; email: string };
  };
}

export async function getProjectAttachments(
  id: string,
): Promise<ProjectAttachmentItem[]> {
  const response = await fetch(getApiUrl(`/api/projects/${id}/attachments`), {
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  await ensureOk(response, { action: "consultar el anexo" });

  return (await response.json()) as ProjectAttachmentItem[];
}

export async function uploadProjectAttachment(
  id: string,
  file: File,
  reportId?: number,
): Promise<ProjectAttachmentItem> {
  const formData = new FormData();
  formData.append("file", file);

  if (reportId !== undefined) {
    formData.append("reportId", String(reportId));
  }

  const response = await fetch(getApiUrl(`/api/projects/${id}/attachments`), {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });

  await ensureOk(response, { action: "subir el anexo" });

  return (await response.json()) as ProjectAttachmentItem;
}

export async function deleteProjectAttachment(
  id: string,
  attachmentId: number,
): Promise<void> {
  const response = await fetch(
    getApiUrl(`/api/projects/${id}/attachments/${attachmentId}`),
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    },
  );

  await ensureOk(response, { action: "eliminar el anexo" });
}

export async function downloadProjectAttachment(
  id: string,
  attachmentId: number,
  fileName: string,
): Promise<void> {
  const response = await fetch(
    getApiUrl(`/api/projects/${id}/attachments/${attachmentId}/download`),
    {
      headers: getAuthHeaders(),
      cache: "no-store",
    },
  );

  await ensureOk(response, { action: "descargar el anexo" });

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export type CreateProjectReportPayload = {
  title: string;
  description?: string | null;
  dueDate: string;
  type: ProjectReportContentKind;
  allowedMimeTypes?: string[];
  maxFiles?: number;
};

export type UpdateProjectReportPayload = Partial<CreateProjectReportPayload>;

export async function getProjectReports(
  id: string,
): Promise<ProjectReportItem[]> {
  const response = await fetch(getApiUrl(`/api/projects/${id}/reports`), {
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  await ensureOk(response, {
    action: "consultar la entrega",
    conflictMessage: REPORT_CONFLICT_MESSAGE,
  });

  return (await response.json()) as ProjectReportItem[];
}

export async function createProjectReport(
  id: string,
  payload: CreateProjectReportPayload,
): Promise<ProjectReportItem> {
  const response = await fetch(getApiUrl(`/api/projects/${id}/reports`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  await ensureOk(response, {
    action: "crear la entrega",
    conflictMessage: REPORT_CONFLICT_MESSAGE,
  });

  return (await response.json()) as ProjectReportItem;
}

export async function updateProjectReport(
  id: string,
  reportId: number,
  payload: UpdateProjectReportPayload,
): Promise<ProjectReportItem> {
  const response = await fetch(
    getApiUrl(`/api/projects/${id}/reports/${reportId}`),
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    },
  );

  await ensureOk(response, {
    action: "editar la entrega",
    conflictMessage: REPORT_CONFLICT_MESSAGE,
  });

  return (await response.json()) as ProjectReportItem;
}

export async function deleteProjectReport(
  id: string,
  reportId: number,
): Promise<void> {
  const response = await fetch(
    getApiUrl(`/api/projects/${id}/reports/${reportId}`),
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    },
  );

  await ensureOk(response, {
    action: "eliminar la entrega",
    conflictMessage: REPORT_CONFLICT_MESSAGE,
  });
}

export async function submitProjectReport(
  id: string,
  reportId: number,
): Promise<ProjectReportItem> {
  const response = await fetch(
    getApiUrl(`/api/projects/${id}/reports/${reportId}/submit`),
    {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
      },
    },
  );

  await ensureOk(response, {
    action: "enviar la entrega",
    conflictMessage: REPORT_CONFLICT_MESSAGE,
  });

  return (await response.json()) as ProjectReportItem;
}

export async function reviewProjectReport(
  id: string,
  reportId: number,
  decision: "accepted" | "rejected",
  comment?: string,
): Promise<ProjectReportItem> {
  const response = await fetch(
    getApiUrl(`/api/projects/${id}/reports/${reportId}/review`),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ decision, comment }),
    },
  );

  await ensureOk(response, {
    action: "revisar la entrega",
    conflictMessage: REPORT_CONFLICT_MESSAGE,
  });

  return (await response.json()) as ProjectReportItem;
}

export type CreateReportContentPayload =
  | { kind: "text"; textContent: string }
  | { kind: "link"; url: string; label?: string | null };

export type UpdateReportContentPayload = {
  textContent?: string;
  url?: string;
  label?: string | null;
};

export type ReportContentFileMetadata = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export async function createReportContent(
  id: string,
  reportId: number,
  payload: CreateReportContentPayload,
): Promise<ProjectReportContentItem> {
  const response = await fetch(
    getApiUrl(`/api/projects/${id}/reports/${reportId}/contents`),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    },
  );

  await ensureOk(response, {
    action: "agregar el contenido de la entrega",
    conflictMessage: REPORT_CONFLICT_MESSAGE,
  });

  return (await response.json()) as ProjectReportContentItem;
}

export type ReportFileUploadTarget = {
  storageKey: string;
  uploadUrl: string;
  method: "PUT";
  expiresInSeconds: number;
};

export async function presignReportContentFile(
  id: string,
  reportId: number,
  metadata: ReportContentFileMetadata,
): Promise<ReportFileUploadTarget> {
  const response = await fetch(
    getApiUrl(
      `/api/projects/${id}/reports/${reportId}/contents/files/presign`,
    ),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(metadata),
    },
  );

  await ensureOk(response, {
    action: "preparar la subida del contenido de la entrega",
    conflictMessage: REPORT_CONFLICT_MESSAGE,
  });

  return (await response.json()) as ReportFileUploadTarget;
}

/**
 * Sube el archivo directamente al almacenamiento con la URL prefirmada. Usa
 * XMLHttpRequest porque `fetch` no expone el progreso de subida.
 */
export function uploadFileToStorage(
  uploadUrl: string,
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadUrl);
    request.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded / event.total);
      }
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }

      reject(new Error(`No se pudo subir el archivo (HTTP ${request.status}).`));
    };

    request.onerror = () =>
      reject(
        new Error(
          "No se pudo conectar con el almacenamiento para subir el archivo.",
        ),
      );
    request.onabort = () => reject(new Error("La subida fue cancelada."));

    request.send(file);
  });
}

export async function confirmReportContentFile(
  id: string,
  reportId: number,
  metadata: ReportContentFileMetadata & { storageKey: string },
): Promise<ProjectReportContentItem> {
  const response = await fetch(
    getApiUrl(
      `/api/projects/${id}/reports/${reportId}/contents/files/confirm`,
    ),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(metadata),
    },
  );

  await ensureOk(response, {
    action: "confirmar la subida del contenido de la entrega",
    conflictMessage: REPORT_CONFLICT_MESSAGE,
  });

  return (await response.json()) as ProjectReportContentItem;
}

export async function updateReportContent(
  id: string,
  reportId: number,
  contentId: number,
  payload: UpdateReportContentPayload,
): Promise<ProjectReportContentItem> {
  const response = await fetch(
    getApiUrl(
      `/api/projects/${id}/reports/${reportId}/contents/${contentId}`,
    ),
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    },
  );

  await ensureOk(response, {
    action: "editar el contenido de la entrega",
    conflictMessage: REPORT_CONFLICT_MESSAGE,
  });

  return (await response.json()) as ProjectReportContentItem;
}

export async function deleteReportContent(
  id: string,
  reportId: number,
  contentId: number,
): Promise<void> {
  const response = await fetch(
    getApiUrl(
      `/api/projects/${id}/reports/${reportId}/contents/${contentId}`,
    ),
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    },
  );

  await ensureOk(response, {
    action: "eliminar el contenido de la entrega",
    conflictMessage: REPORT_CONFLICT_MESSAGE,
  });
}

/**
 * URL del stream inline (imagen/video/archivo). El token viaja como query
 * porque `<img>` y `<video>` no pueden enviar la cabecera Authorization.
 */
export function getReportContentStreamUrl(
  id: string,
  reportId: number,
  contentId: number,
): string {
  const base = getApiUrl(
    `/api/projects/${id}/reports/${reportId}/contents/${contentId}/stream`,
  );
  const token = getAuthToken();

  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}
