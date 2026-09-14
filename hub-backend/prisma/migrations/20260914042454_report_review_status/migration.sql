-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReportStatus" ADD VALUE 'accepted';
ALTER TYPE "ReportStatus" ADD VALUE 'rejected';

-- AlterTable
ALTER TABLE "project_report" ADD COLUMN     "review_comment" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by_user_id" INTEGER;

-- CreateIndex
CREATE INDEX "idx_project_report_reviewed_by_user_id" ON "project_report"("reviewed_by_user_id");

-- AddForeignKey
ALTER TABLE "project_report" ADD CONSTRAINT "project_report_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
