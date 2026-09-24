/*
  Warnings:

  - The values [ARCHIVED] on the enum `FileStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FileStatus_new" AS ENUM ('ACTIVE', 'IN_PROGRESS', 'TRASHED', 'DELETING', 'DELETED');
ALTER TABLE "public"."files" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "files" ALTER COLUMN "status" TYPE "FileStatus_new" USING ("status"::text::"FileStatus_new");
ALTER TYPE "FileStatus" RENAME TO "FileStatus_old";
ALTER TYPE "FileStatus_new" RENAME TO "FileStatus";
DROP TYPE "public"."FileStatus_old";
ALTER TABLE "files" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;
