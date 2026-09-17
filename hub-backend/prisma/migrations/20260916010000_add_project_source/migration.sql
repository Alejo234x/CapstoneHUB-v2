-- CreateEnum
CREATE TYPE "ProjectSource" AS ENUM ('external_entity', 'research', 'internal_need', 'social_impact');

-- AlterTable
ALTER TABLE "project" ADD COLUMN "source" "ProjectSource" NOT NULL DEFAULT 'external_entity';
