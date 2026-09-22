/*
  Warnings:

  - You are about to drop the column `s3KeyName` on the `fileUploadParts` table. All the data in the column will be lost.
  - You are about to drop the column `uploadStatus` on the `fileUploadParts` table. All the data in the column will be lost.
  - You are about to drop the column `uploadStatus` on the `fileUploads` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[fileUploadId,partNumber]` on the table `fileUploadParts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[s3UploadId]` on the table `fileUploads` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "FileStatus" ADD VALUE 'DELETING';

-- DropIndex
DROP INDEX "fileUploadParts_s3KeyName_key";

-- AlterTable
ALTER TABLE "fileUploadParts" DROP COLUMN "s3KeyName",
DROP COLUMN "uploadStatus",
ALTER COLUMN "size" DROP NOT NULL,
ALTER COLUMN "ETag" DROP NOT NULL;

-- AlterTable
ALTER TABLE "fileUploads" DROP COLUMN "uploadStatus",
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "s3UploadId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "status" "UploadStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "fileUploadParts_fileUploadId_partNumber_key" ON "fileUploadParts"("fileUploadId", "partNumber");

-- CreateIndex
CREATE UNIQUE INDEX "fileUploads_s3UploadId_key" ON "fileUploads"("s3UploadId");
