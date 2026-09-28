export function formatStatus(status: string): string {
  switch (status) {
    case "proposed":
      return "Propuesto";
    case "in_progress":
      return "En progreso";
    case "under_review":
      return "En revisión";
    case "approved":
      return "Aprobado";
    case "assigned":
      return "Asignado";
    case "closed":
      return "Cerrado";
    case "rejected":
      return "Rechazado";
    default:
      return status;
  }
}

export function formatProjectSource(source: string): string {
  switch (source) {
    case "external_entity":
      return "Entidad externa";
    case "research":
      return "Investigación";
    case "internal_need":
      return "Necesidad interna";
    case "social_impact":
      return "Impacto social";
    default:
      return source;
  }
}

export function formatRole(role: string): string {
  switch (role) {
    case "admin":
      return "Administrador";
    case "evaluator":
      return "Evaluador";
    case "coordinator":
      return "Coordinador";
    case "advisor":
      return "Asesor";
    case "student":
      return "Estudiante";
    default:
      return role;
  }
}

export function getInitials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
]);

export const ATTACHMENT_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg";

export function formatDate(dateValue: string | null): string {
  if (!dateValue) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

export function toDateTimeLocal(dateValue: string): string {
  const date = new Date(dateValue);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateAttachmentFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "El archivo supera el límite de 10 MB.";
  }

  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    return "Tipo de archivo no permitido.";
  }

  return null;
}

export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;

export const REPORT_TEXT_MAX_LENGTH = 20_000;

export const REPORT_DOCUMENT_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx";
export const REPORT_IMAGE_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif";
export const REPORT_VIDEO_ACCEPT = ".mp4,.webm,.ogg";

export const REPORT_DOCUMENT_MIME_TYPES: ReadonlySet<string> = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export const REPORT_IMAGE_MIME_TYPES: ReadonlySet<string> = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export const REPORT_VIDEO_MIME_TYPES: ReadonlySet<string> = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
]);

export type ReportFileContentKind = "image" | "video" | "file";

export function getReportContentAccept(kind: ReportFileContentKind): string {
  if (kind === "image") {
    return REPORT_IMAGE_ACCEPT;
  }

  if (kind === "video") {
    return REPORT_VIDEO_ACCEPT;
  }

  return REPORT_DOCUMENT_ACCEPT;
}

export function validateReportContentFile(
  kind: ReportFileContentKind,
  file: File,
): string | null {
  if (kind === "video") {
    if (!REPORT_VIDEO_MIME_TYPES.has(file.type)) {
      return "Formato de video no permitido (MP4, WebM u OGG).";
    }

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      return "El video supera el límite de 100 MB.";
    }

    return null;
  }

  const allowed =
    kind === "image" ? REPORT_IMAGE_MIME_TYPES : REPORT_DOCUMENT_MIME_TYPES;

  if (file.type && !allowed.has(file.type)) {
    return kind === "image"
      ? "Formato de imagen no permitido."
      : "Tipo de archivo no permitido.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "El archivo supera el límite de 10 MB.";
  }

  return null;
}

export function validateReportLink(url: string): string | null {
  const trimmed = url.trim();

  if (!trimmed) {
    return "Ingresa una URL.";
  }

  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    return "La URL no es válida.";
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "La URL debe comenzar por http:// o https://.";
  }

  return null;
}
