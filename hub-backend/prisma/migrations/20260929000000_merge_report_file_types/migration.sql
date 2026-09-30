-- Unifica los tipos de entrega image/video en file (Archivo). El enum
-- ReportContentKind conserva sus valores para no recrear el tipo en Postgres;
-- la API solo admite text, link y file.
UPDATE "project_report"
SET "type" = 'file'
WHERE "type" IN ('image', 'video');

UPDATE "project_report_content"
SET "kind" = 'file'
WHERE "kind" IN ('image', 'video');