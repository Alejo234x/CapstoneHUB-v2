-- AlterTable
ALTER TABLE "project" ALTER COLUMN "start_date" DROP NOT NULL;

-- AlterTable
ALTER TABLE "project" ADD COLUMN "faculty_advisor" VARCHAR(255);
ALTER TABLE "project" ADD COLUMN "team_requirements" TEXT;
ALTER TABLE "project" ADD COLUMN "expected_outcomes" TEXT;

-- AlterTable
ALTER TABLE "project_natural_proposer" ALTER COLUMN "id_number" DROP NOT NULL;

-- CreateTable
CREATE TABLE "project_deliverable" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_deliverable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_project_deliverable_project_id" ON "project_deliverable"("project_id");

-- AddForeignKey
ALTER TABLE "project_deliverable" ADD CONSTRAINT "project_deliverable_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
