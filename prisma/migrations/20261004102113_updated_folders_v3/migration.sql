-- DropIndex
DROP INDEX "folders_userId_deletedAt_idx";

-- CreateIndex
CREATE INDEX "folders_userId_deletedAt_id_idx" ON "folders"("userId", "deletedAt", "id");
