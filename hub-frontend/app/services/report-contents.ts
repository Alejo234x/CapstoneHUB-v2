import { ProjectReportContentItem } from "./schemas";
import { REPORT_CONFLICT_MESSAGE } from "./reports";
import { apiRequest, apiRequestVoid } from "@/lib/http";
import { getApiUrl } from "@/lib/api";

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

export function createReportContent(
  id: string,
  reportId: number,
  payload: CreateReportContentPayload,
): Promise<ProjectReportContentItem> {
  return apiRequest<ProjectReportContentItem>(
    `/api/projects/${id}/reports/${reportId}/contents`,
    {
      method: "POST",
      body: payload,
      action: "agregar el contenido de la entrega",
      conflictMessage: REPORT_CONFLICT_MESSAGE,
    },
  );
}

export type ReportFileUploadTarget = {
  storageKey: string;
  uploadUrl: string;
  method: "PUT";
  expiresInSeconds: number;
};

export function presignReportContentFile(
  id: string,
  reportId: number,
  metadata: ReportContentFileMetadata,
): Promise<ReportFileUploadTarget> {
  return apiRequest<ReportFileUploadTarget>(
    `/api/projects/${id}/reports/${reportId}/contents/files/presign`,
    {
      method: "POST",
      body: metadata,
      action: "preparar la subida del contenido de la entrega",
      conflictMessage: REPORT_CONFLICT_MESSAGE,
    },
  );
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

export function confirmReportContentFile(
  id: string,
  reportId: number,
  metadata: ReportContentFileMetadata & { storageKey: string },
): Promise<ProjectReportContentItem> {
  return apiRequest<ProjectReportContentItem>(
    `/api/projects/${id}/reports/${reportId}/contents/files/confirm`,
    {
      method: "POST",
      body: metadata,
      action: "confirmar la subida del contenido de la entrega",
      conflictMessage: REPORT_CONFLICT_MESSAGE,
    },
  );
}

export function updateReportContent(
  id: string,
  reportId: number,
  contentId: number,
  payload: UpdateReportContentPayload,
): Promise<ProjectReportContentItem> {
  return apiRequest<ProjectReportContentItem>(
    `/api/projects/${id}/reports/${reportId}/contents/${contentId}`,
    {
      method: "PATCH",
      body: payload,
      action: "editar el contenido de la entrega",
      conflictMessage: REPORT_CONFLICT_MESSAGE,
    },
  );
}

export function deleteReportContent(
  id: string,
  reportId: number,
  contentId: number,
): Promise<void> {
  return apiRequestVoid(
    `/api/projects/${id}/reports/${reportId}/contents/${contentId}`,
    {
      method: "DELETE",
      action: "eliminar el contenido de la entrega",
      conflictMessage: REPORT_CONFLICT_MESSAGE,
    },
  );
}

/**
 * URL del stream inline (imagen/video/archivo). La cookie httpOnly de sesión
 * viaja sola en la petición same-origin, así que no hace falta token en query.
 */
export function getReportContentStreamUrl(
  id: string,
  reportId: number,
  contentId: number,
): string {
  return getApiUrl(
    `/api/projects/${id}/reports/${reportId}/contents/${contentId}/stream`,
  );
}
