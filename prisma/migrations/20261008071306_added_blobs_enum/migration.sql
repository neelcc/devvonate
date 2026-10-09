-- CreateEnum
CREATE TYPE "BlobStatus" AS ENUM ('ACTIVE', 'DELETING', 'DELETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OUTBOX_EVENT_TYPE" ADD VALUE 'FOLDER_DELETION';
ALTER TYPE "OUTBOX_EVENT_TYPE" ADD VALUE 'FOLDER_FILES_DELETION';

-- AlterTable
ALTER TABLE "blobs" ADD COLUMN     "status" "BlobStatus" NOT NULL DEFAULT 'ACTIVE';
