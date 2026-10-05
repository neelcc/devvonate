-- CreateEnum
CREATE TYPE "FolderStatus" AS ENUM ('ACTIVE', 'TRASHED', 'DELETING', 'DELETED');

-- AlterTable
ALTER TABLE "folders" ADD COLUMN     "status" "FolderStatus" NOT NULL DEFAULT 'ACTIVE';
