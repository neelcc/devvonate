/*
  Warnings:

  - You are about to drop the `OutboxEvents` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[fileId]` on the table `fileUploads` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OUTBOX_EVENT_TYPE" ADD VALUE 'USER_ONBOARDING';
ALTER TYPE "OUTBOX_EVENT_TYPE" ADD VALUE 'USER_DELETION';

-- DropTable
DROP TABLE "OutboxEvents";

-- CreateTable
CREATE TABLE "outboxEvents" (
    "id" TEXT NOT NULL,
    "eventType" "OUTBOX_EVENT_TYPE" NOT NULL,
    "payload" JSONB NOT NULL,
    "aggregateType" "AGGREGATE_TYPE" NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "status" "OUTBOX_EVENT_STATUS" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "outboxEvents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fileUploads_fileId_key" ON "fileUploads"("fileId");
