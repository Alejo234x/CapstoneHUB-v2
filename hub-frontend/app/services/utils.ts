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

export function formatDate(dateValue: string): string {
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
