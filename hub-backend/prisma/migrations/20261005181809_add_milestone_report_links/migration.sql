-- CreateTable
CREATE TABLE "milestone_report" (
    "milestone_id" INTEGER NOT NULL,
    "report_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestone_report_pkey" PRIMARY KEY ("milestone_id","report_id")
);

-- CreateIndex
CREATE INDEX "idx_milestone_report_report_id" ON "milestone_report"("report_id");

-- CreateIndex
CREATE INDEX "idx_milestone_report_milestone_id" ON "milestone_report"("milestone_id");

-- AddForeignKey
ALTER TABLE "milestone_report" ADD CONSTRAINT "milestone_report_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "project_milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_report" ADD CONSTRAINT "milestone_report_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "project_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
