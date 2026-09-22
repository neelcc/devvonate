/*
  Warnings:

  - A unique constraint covering the columns `[rootFolderId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `category` to the `files` table without a default value. This is not possible if the table is not empty.
  - Made the column `rootFolderId` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'ARCHIVE');

-- AlterTable
ALTER TABLE "files" ADD COLUMN     "category" "FileCategory" NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "rootFolderId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_rootFolderId_key" ON "users"("rootFolderId");
