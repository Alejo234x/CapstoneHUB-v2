export const MAX_ATTACHMENT_SIZE_BYTES =
  Number(process.env.MAX_FILE_SIZE_BYTES) || 10 * 1024 * 1024;

/** Los videos pesan mucho más que un documento, así que tienen su propio tope. */
export const MAX_VIDEO_SIZE_BYTES =
  Number(process.env.MAX_VIDEO_SIZE_BYTES) || 100 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_MIME_TYPES: ReadonlySet<string> = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
]);

/** Documentos admitidos como contenido de una entrega (`kind = file`). */
export const REPORT_DOCUMENT_MIME_TYPES: ReadonlySet<string> = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

/** Imágenes admitidas como contenido de una entrega (`kind = image`). */
export const REPORT_IMAGE_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

/** Videos reproducibles en el navegador (`kind = video`). */
export const REPORT_VIDEO_MIME_TYPES: ReadonlySet<string> = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
]);

/** Vigencia de la URL prefirmada de subida (1 hora por defecto). */
export const UPLOAD_URL_TTL_SECONDS =
  Number(process.env.S3_UPLOAD_URL_TTL_SECONDS) || 60 * 60;
