-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('pending', 'submitted');

-- AlterTable
ALTER TABLE "project_attachment" ADD COLUMN     "report_id" INTEGER;

-- CreateTable
CREATE TABLE "project_report" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "milestone_id" INTEGER NOT NULL,
    "created_by_user_id" INTEGER,
    "status" "ReportStatus" NOT NULL DEFAULT 'pending',
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uk_project_report_milestone" ON "project_report"("milestone_id");

-- CreateIndex
CREATE INDEX "idx_project_report_project_id" ON "project_report"("project_id");

-- CreateIndex
CREATE INDEX "idx_project_report_status" ON "project_report"("status");

-- CreateIndex
CREATE INDEX "idx_project_report_created_by_user_id" ON "project_report"("created_by_user_id");

-- CreateIndex
CREATE INDEX "idx_project_attachment_report_id" ON "project_attachment"("report_id");

-- AddForeignKey
ALTER TABLE "project_attachment" ADD CONSTRAINT "project_attachment_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "project_report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_report" ADD CONSTRAINT "project_report_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_report" ADD CONSTRAINT "project_report_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "project_milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_report" ADD CONSTRAINT "project_report_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
