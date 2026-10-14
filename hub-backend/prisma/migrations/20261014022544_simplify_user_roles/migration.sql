-- Simplificación de roles: coordinator + advisor -> teacher.
--
-- 1. Los roles globales coordinator y advisor se unifican en teacher. Antes de
--    convertir la columna hay que eliminar los duplicados que quedarían en
--    user_role_assignment si un usuario tenía ambos roles.
DELETE FROM "user_role_assignment" dup
USING "user_role_assignment" keep
WHERE dup.id > keep.id
  AND dup."user_id" = keep."user_id"
  AND dup."role"::text IN ('coordinator', 'advisor')
  AND keep."role"::text IN ('coordinator', 'advisor');

-- 2. ActorRole: coordinator | advisor -> teacher.
CREATE TYPE "ActorRole_new" AS ENUM ('teacher', 'evaluator', 'student');
ALTER TABLE "project_actor_assignment"
  ALTER COLUMN "role" TYPE "ActorRole_new"
  USING (
    CASE
      WHEN "role"::text IN ('coordinator', 'advisor') THEN 'teacher'
      ELSE "role"::text
    END
  )::"ActorRole_new";
ALTER TYPE "ActorRole" RENAME TO "ActorRole_old";
ALTER TYPE "ActorRole_new" RENAME TO "ActorRole";
DROP TYPE "ActorRole_old";

-- 3. UserRole: coordinator | advisor -> teacher.
CREATE TYPE "UserRole_new" AS ENUM ('admin', 'evaluator', 'teacher', 'proposer', 'student');
ALTER TABLE "user_role_assignment"
  ALTER COLUMN "role" TYPE "UserRole_new"
  USING (
    CASE
      WHEN "role"::text IN ('coordinator', 'advisor') THEN 'teacher'
      ELSE "role"::text
    END
  )::"UserRole_new";
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
