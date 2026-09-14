-- Add standalone report fields, backfilling from the previously linked milestone
ALTER TABLE "project_report" ADD COLUMN "title" VARCHAR(255);
ALTER TABLE "project_report" ADD COLUMN "description" TEXT;
ALTER TABLE "project_report" ADD COLUMN "due_date" TIMESTAMP(3);

UPDATE "project_report" AS r
SET "title" = m."title",
    "description" = m."description",
    "due_date" = m."due_date"
FROM "project_milestones" AS m
WHERE r."milestone_id" = m."id";

ALTER TABLE "project_report" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "project_report" ALTER COLUMN "due_date" SET NOT NULL;

-- Drop the milestone coupling
ALTER TABLE "project_report" DROP CONSTRAINT "project_report_milestone_id_fkey";
DROP INDEX "uk_project_report_milestone";
ALTER TABLE "project_report" DROP COLUMN "milestone_id";

-- CreateIndex
CREATE INDEX "idx_project_report_due_date" ON "project_report"("due_date");
