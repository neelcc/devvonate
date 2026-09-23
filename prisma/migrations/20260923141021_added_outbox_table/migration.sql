/*
  Warnings:

  - Changed the type of `aggregateType` on the `OutboxEvents` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AGGREGATE_TYPE" AS ENUM ('FILE', 'FOLDER', 'USER');

-- AlterTable
ALTER TABLE "OutboxEvents" DROP COLUMN "aggregateType",
ADD COLUMN     "aggregateType" "AGGREGATE_TYPE" NOT NULL;
