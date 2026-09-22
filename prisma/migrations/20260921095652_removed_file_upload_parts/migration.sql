/*
  Warnings:

  - You are about to drop the `fileUploadParts` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[s3ETag]` on the table `fileUploads` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "fileUploadParts" DROP CONSTRAINT "fileUploadParts_fileUploadId_fkey";

-- AlterTable
ALTER TABLE "fileUploads" ADD COLUMN     "s3ETag" TEXT;

-- DropTable
DROP TABLE "fileUploadParts";

-- CreateIndex
CREATE UNIQUE INDEX "fileUploads_s3ETag_key" ON "fileUploads"("s3ETag");
