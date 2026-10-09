-- DropForeignKey
ALTER TABLE "blobs" DROP CONSTRAINT "blobs_fileId_fkey";

-- AlterTable
ALTER TABLE "files" ADD COLUMN     "blobId" TEXT;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_blobId_fkey" FOREIGN KEY ("blobId") REFERENCES "blobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
