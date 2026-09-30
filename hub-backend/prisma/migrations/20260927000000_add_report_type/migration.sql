-- AlterTable
ALTER TABLE "project_report" ADD COLUMN "type" "ReportContentKind" NOT NULL DEFAULT 'file';

-- Backfill: el tipo de cada entrega existente se infiere de su contenido más
-- antiguo; si no tiene contenido queda como 'file'.
UPDATE "project_report" AS report
SET "type" = (
    SELECT content."kind"
    FROM "project_report_content" AS content
    WHERE content."report_id" = report."id"
    ORDER BY content."created_at" ASC, content."id" ASC
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1
    FROM "project_report_content" AS content
    WHERE content."report_id" = report."id"
);