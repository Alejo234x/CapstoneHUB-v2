export const MAX_ATTACHMENT_SIZE_BYTES =
  Number(process.env.MAX_FILE_SIZE_BYTES) || 10 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_MIME_TYPES: ReadonlySet<string> = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
]);
