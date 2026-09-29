/*
  Warnings:

  - You are about to drop the column `path` on the `files` table. All the data in the column will be lost.
  - You are about to drop the column `path` on the `folders` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "files_path_idx";

-- DropIndex
DROP INDEX "folders_path_idx";

-- AlterTable
ALTER TABLE "files" DROP COLUMN "path";

-- AlterTable
ALTER TABLE "folders" DROP COLUMN "path";

-- CreateIndex
CREATE INDEX "files_folderId_deletedAt_idx" ON "files"("folderId", "deletedAt");

-- CreateIndex
CREATE INDEX "folders_parentFolderId_deletedAt_idx" ON "folders"("parentFolderId", "deletedAt");
