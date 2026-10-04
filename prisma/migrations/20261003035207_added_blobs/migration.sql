/*
  Warnings:

  - You are about to drop the column `s3KeyName` on the `files` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "files_s3KeyName_key";

-- AlterTable
ALTER TABLE "files" DROP COLUMN "s3KeyName";

-- CreateTable
CREATE TABLE "blobs" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "s3KeyName" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "contentType" TEXT NOT NULL,
    "refCount" INTEGER NOT NULL DEFAULT 0,
    "sha256" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blobs_fileId_key" ON "blobs"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "blobs_s3KeyName_key" ON "blobs"("s3KeyName");

-- CreateIndex
CREATE UNIQUE INDEX "blobs_sha256_key" ON "blobs"("sha256");

-- CreateIndex
CREATE INDEX "blobs_sha256_refCount_size_idx" ON "blobs"("sha256", "refCount", "size");

-- AddForeignKey
ALTER TABLE "blobs" ADD CONSTRAINT "blobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blobs" ADD CONSTRAINT "blobs_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
