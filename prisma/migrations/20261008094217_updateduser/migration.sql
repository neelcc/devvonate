/*
  Warnings:

  - You are about to drop the `blobs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "blobs" DROP CONSTRAINT "blobs_userId_fkey";

-- DropForeignKey
ALTER TABLE "files" DROP CONSTRAINT "files_blobId_fkey";

-- DropTable
DROP TABLE "blobs";

-- CreateTable
CREATE TABLE "blob" (
    "id" TEXT NOT NULL,
    "s3KeyName" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "contentType" TEXT NOT NULL,
    "refCount" INTEGER NOT NULL DEFAULT 0,
    "sha256" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "BlobStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blob_s3KeyName_key" ON "blob"("s3KeyName");

-- CreateIndex
CREATE UNIQUE INDEX "blob_sha256_key" ON "blob"("sha256");

-- CreateIndex
CREATE INDEX "blob_sha256_refCount_size_idx" ON "blob"("sha256", "refCount", "size");

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_blobId_fkey" FOREIGN KEY ("blobId") REFERENCES "blob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blob" ADD CONSTRAINT "blob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
