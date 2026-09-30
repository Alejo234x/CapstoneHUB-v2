-- AlterTable
ALTER TABLE "project_report" ADD COLUMN "allowed_mime_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "project_report" ADD COLUMN "max_files" INTEGER;

-- Backfill: los tipos con archivo reciben todos los MIME de su tipo y un máximo
-- igual al contenido actual (mínimo 1). Texto y enlace quedan sin configuración.
UPDATE "project_report" AS report
SET
    "allowed_mime_types" = CASE report."type"
        WHEN 'image' THEN ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
        WHEN 'video' THEN ARRAY['video/mp4', 'video/webm', 'video/ogg']
        WHEN 'file' THEN ARRAY[
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ]
        ELSE ARRAY[]::TEXT[]
    END,
    "max_files" = CASE
        WHEN report."type" IN ('image', 'video', 'file') THEN GREATEST(
            1,
            (
                SELECT COUNT(*)::INTEGER
                FROM "project_report_content" AS content
                WHERE content."report_id" = report."id"
            )
        )
        ELSE NULL
    END;