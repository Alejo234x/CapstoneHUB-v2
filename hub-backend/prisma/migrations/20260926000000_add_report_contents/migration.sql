-- CreateEnum
CREATE TYPE "ReportContentKind" AS ENUM ('text', 'link', 'image', 'video', 'file');

-- CreateTable
CREATE TABLE "project_report_content" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "attachment_id" INTEGER,
    "created_by_user_id" INTEGER,
    "kind" "ReportContentKind" NOT NULL,
    "text_content" TEXT,
    "url" VARCHAR(2048),
    "label" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_report_content_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uk_project_report_content_attachment" ON "project_report_content"("attachment_id");

-- CreateIndex
CREATE INDEX "idx_project_report_content_report_id" ON "project_report_content"("report_id");

-- CreateIndex
CREATE INDEX "idx_project_report_content_kind" ON "project_report_content"("kind");

-- CreateIndex
CREATE INDEX "idx_project_report_content_created_by_user_id" ON "project_report_content"("created_by_user_id");

-- AddForeignKey
ALTER TABLE "project_report_content" ADD CONSTRAINT "project_report_content_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "project_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_report_content" ADD CONSTRAINT "project_report_content_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "project_attachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_report_content" ADD CONSTRAINT "project_report_content_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: los adjuntos vinculados a una entrega pasan a ser contenido de la
-- misma, conservando el archivo, el autor y la fecha originales.
INSERT INTO "project_report_content" (
    "report_id",
    "attachment_id",
    "created_by_user_id",
    "kind",
    "created_at"
)
SELECT
    attachment."report_id",
    attachment."id",
    attachment."uploaded_by_user_id",
    CASE
        WHEN attachment."mime_type" LIKE 'image/%' THEN 'image'
        WHEN attachment."mime_type" LIKE 'video/%' THEN 'video'
        ELSE 'file'
    END::"ReportContentKind",
    attachment."created_at"
FROM "project_attachment" AS attachment
WHERE attachment."report_id" IS NOT NULL;