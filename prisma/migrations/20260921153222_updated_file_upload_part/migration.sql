-- DropForeignKey
ALTER TABLE "fileUploads" DROP CONSTRAINT "fileUploads_fileId_fkey";

-- AddForeignKey
ALTER TABLE "fileUploads" ADD CONSTRAINT "fileUploads_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
