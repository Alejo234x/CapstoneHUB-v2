-- CreateEnum
CREATE TYPE "ProjectPhase" AS ENUM ('semester_1', 'semester_2');

-- AlterTable
ALTER TABLE "project" ADD COLUMN     "phase" "ProjectPhase" NOT NULL DEFAULT 'semester_1';

-- AlterTable
ALTER TABLE "project_milestones" ADD COLUMN     "is_minimum" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phase" "ProjectPhase";

-- CreateIndex
CREATE INDEX "idx_project_milestones_is_minimum" ON "project_milestones"("is_minimum");
