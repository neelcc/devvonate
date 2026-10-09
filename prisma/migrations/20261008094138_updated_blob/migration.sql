/*
  Warnings:

  - You are about to drop the column `fileId` on the `blobs` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "blobs_fileId_key";

-- AlterTable
ALTER TABLE "blobs" DROP COLUMN "fileId";
