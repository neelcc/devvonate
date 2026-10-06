import { Config } from "../../config";
import prisma from "../../config/prisma";
import { DeleteFolderResult } from "../../folders/folder.types";
import { FolderDeletionPayload } from "../../infrastructure/sqs/sqs.types";


export async function folderDeletionHandler(payload: FolderDeletionPayload) {
    const { userId, folderId } = payload;
    const now = new Date();
    const folders : DeleteFolderResult[] = await prisma.$queryRaw`
        WITH RECURSIVE folder_tree AS (

    -- 1. Starting folder
    SELECT
      f.id,
      f."parentFolderId",
      0 AS depth
    FROM "folders" f
    WHERE f.id = ${folderId}
      AND f."userId" = ${userId}
      AND f."deletedAt" IS NULL
      AND f."status" = 'ACTIVE'

    UNION ALL

    -- 2. Find children recursively
    SELECT
      child.id,
      child."parentFolderId",
      ft.depth + 1
    FROM "folders" child
    JOIN folder_tree ft
      ON child."parentFolderId" = ft.id
    WHERE child."userId" = ${userId}
      AND child."deletedAt" IS NULL
      aND child."status" = 'ACTIVE'
  )
  -- 3. Connect each folder to its files
 SELECT
  ft.id AS "folderId",
  COALESCE(
    ARRAY_AGG(file.id) FILTER (WHERE file.id IS NOT NULL),
    ARRAY[]::text[]
  ) AS "fileIds"
FROM folder_tree ft
LEFT JOIN "files" file
  ON file."folderId" = ft.id
  AND file."userId" = ${userId}
  AND file."deletedAt" IS NULL
  AND file."status" = 'ACTIVE'
GROUP BY ft.id
ORDER BY ft.id;
`;  

    const folderIds = folders.map(f => f.folderId);
    const fileIds = folders.flatMap(f => f.fileIds);

    await prisma.$transaction(async (tx) => {

      await tx.folder.updateMany({
        where: {
          id: { in: folderIds },
          userId: userId,
          deletedAt: null,
          status: "ACTIVE",
        },
        data: {
          deletedAt: now,
          status: "DELETING",
        },
      })

      await tx.blobs.updateMany({
        where: {
          fileId: { in: fileIds },
          userId: userId,
          refCount: { gt: 1 },
        },
        data: {
          refCount: {
            decrement: 1
          }
        },
      })

      await tx.blobs.deleteMany({
        where: {
          fileId: { in: fileIds },
          userId: userId,
          refCount: 1,
        },  
      })

      for( let i = 0; i < fileIds.length; i += Config.DELETION_BATCH_SIZE) {
        const batch = fileIds.slice(i, i + Config.DELETION_BATCH_SIZE);
        console.log(`Batch ${i / Config.DELETION_BATCH_SIZE + 1}: Marking ${batch.length} files for deletion`);
        await tx.file.updateMany({
          where: {
            id: { in: batch },
            userId: userId,
            deletedAt: null,
            status: "ACTIVE",
          },
          data: {
            deletedAt: now,
            status: "DELETING",

          },
        });
        const outBoxEvent =  await tx.outboxEvents.create({
          data : {
            aggregateType : "USER",
            aggregateId : userId,
            eventType: "FILE_BATCH_DELETION",
            payload : JSON.stringify({ fileIds: batch }),
            createdAt : now,
          },
          })
        console.log(`Batch ${i / Config.DELETION_BATCH_SIZE + 1}: Marked ${batch.length} files for deletion and created outbox event with ID: ${outBoxEvent.id}`);
      }

    },
  )

}