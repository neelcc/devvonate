import { Config } from "../../config";
import prisma from "../../config/prisma";
import { DeleteFolderBatch } from "../../folders/folder.types";
import { Prisma } from "../../generated/prisma/client";
import { FolderDeletionPayload } from "../../infrastructure/sqs/sqs.types";


export async function folderDeletionHandler(payload: FolderDeletionPayload) {
  const { userId, folderId } = payload;

  const now = new Date();

  await prisma.$transaction(async (tx) => { 

     await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
     
    const batches: DeleteFolderBatch[] = await tx.$queryRaw`
    WITH RECURSIVE folder_tree AS (
      -- Starting folder
      SELECT
        f.id
      FROM "folders" f
      WHERE f.id = ${folderId}
        AND f."userId" = ${userId}
        AND f."deletedAt" IS NULL
        AND f."status" = 'DELETING'

      UNION ALL

      -- Descendants
      SELECT
        child.id
      FROM "folders" child
      INNER JOIN folder_tree ft
        ON child."parentFolderId" = ft.id
      WHERE child."userId" = ${userId}
        AND child."deletedAt" IS NULL
        AND child."status" = 'ACTIVE'
    ),

    all_ids AS (
      -- Folder IDs
      SELECT
        'folder' AS "type",
        ft.id AS "id"
      FROM folder_tree ft

      UNION ALL

      -- File IDs
      SELECT
        'file' AS "type",
        file.id AS "id"
      FROM folder_tree ft
      INNER JOIN "files" file
        ON file."folderId" = ft.id
      WHERE file."userId" = ${userId}
        AND file."deletedAt" IS NULL
        AND file."status" = 'ACTIVE'
    ),

    numbered AS (
      SELECT
        "type",
        "id",
        FLOOR(
          (
            ROW_NUMBER() OVER (
              PARTITION BY "type"
              ORDER BY "id"
            ) - 1
          ) / 500
        )::int AS batch
      FROM all_ids
    )

    SELECT
      batch,

      COALESCE(
        ARRAY_AGG("id") FILTER (WHERE "type" = 'folder'),
        ARRAY[]::text[]
      ) AS "folderIds",

      COALESCE(
        ARRAY_AGG("id") FILTER (WHERE "type" = 'file'),
        ARRAY[]::text[]
      ) AS "fileIds"

    FROM numbered
    GROUP BY batch
    ORDER BY batch;
  `;
  console.log("Batches to delete:", batches);
  console.log(`Found ${batches.length} batches of folders/files to delete`);

      
  if (batches.length === 0) {
    console.log("Nothing to delete (already processed or not found)", { folderId });
    return;
  }

     for (const { folderIds, fileIds } of batches) {
      console.log(`Processing batch with ${folderIds.length} folders and ${fileIds.length} files for deletion`);
    if (folderIds.length) {
      const { count } = await tx.folder.updateMany({
        where: { id: { in: folderIds }, userId, deletedAt: null,
                 status: { in: ["ACTIVE", "DELETING"] } },
        data: { deletedAt: now, status: "DELETING" },
      });
      console.log(`Marked ${count} folders as DELETING for user ${userId}`);
      if (count !== folderIds.length) throw new Error("Folder tree changed, retry");
    }

    if (!fileIds.length) continue;

      // 1. Claim files atomically and get what we need from the claimed rows only
      const claimed = await tx.$queryRaw<{ id: string; blobId: string; size: bigint }[]>`
    UPDATE "files"
    SET "deletedAt" = ${now}, "status" = 'DELETING'
    WHERE id IN (${Prisma.join(fileIds)})
      AND "userId" = ${userId}
      AND "deletedAt" IS NULL
      AND "status" = 'ACTIVE'
      RETURNING id, "blobId", size`;

      console.log("Claimed ",claimed)
      console.log(`Claimed ${claimed.length} files for deletion, expected ${fileIds.length}`);



      if (claimed.length !== fileIds.length) {
        throw new Error("Files changed concurrently, retry");
      }

      const perBlob = new Map<string, number>();
      let bytes = 0n;
      for (const f of claimed) {
        perBlob.set(f.blobId, (perBlob.get(f.blobId) ?? 0) + 1);
        bytes += BigInt(f.size);
      }

      const blobIds = [...perBlob.keys()];
      const counts = blobIds.map(id => perBlob.get(id)!);

      console.log(`Claimed ${claimed.length} files, total bytes: ${bytes}, unique blobs: ${blobIds.length}`);
      console.log("COunts per blob:", counts);

      const updated = await tx.$queryRaw<
        { id: string; refCount: number; s3KeyName: string; size: bigint }[]
      >`
    UPDATE "blob" b
    SET "refCount" = b."refCount" - d.cnt,
        "status" = CASE WHEN b."refCount" - d.cnt = 0 THEN 'DELETING' ELSE b."status" END
    FROM (
      SELECT unnest(${blobIds}::text[]) AS id, unnest(${counts}::int[]) AS cnt
    ) d
    WHERE b.id = d.id
      AND b."userId" = ${userId}
    RETURNING b.id, b."refCount", b."s3KeyName", b.size`;

    console.log(`Updated ${updated.length} blob rows for claimed files, total bytes: ${bytes}`); 
    console.log("Updated blobs:", updated.map(b => ({ id: b.id, refCount: b.refCount, s3KeyName: b.s3KeyName, size: b.size })));
    console.log(`Blob IDs: ${blobIds.length}`);
      
      if (updated.length !== blobIds.length) {
        throw new Error("Blob rows missing for claimed files");
      }
      if (updated.some(b => b.refCount < 0)) {
        throw new Error("Negative refCount, aborting"); // rolls back; indicates a bug elsewhere
      }

      const orphaned = updated.filter(b => b.refCount === 0);
      console.log(`Orphaned blobs: ${orphaned.length}, bytes: ${orphaned.reduce((sum, b) => sum + BigInt(b.size), 0n)}`); 

      const bytesFreed = orphaned.reduce((sum, b) => sum + BigInt(b.size), 0n);

      if (bytesFreed > 0n) {
        await tx.userStorage.update({
          where: { userId },
          data: { usedBytes: { decrement: bytesFreed } },
        });
      }

      if (orphaned.length > 0) {
        await tx.outboxEvents.create({
          data: {
            aggregateType: "FOLDER",
            aggregateId: folderId,
            eventType: "FOLDER_FILES_DELETION",
            payload: {
              fileIds,
              blobs: orphaned.map(b => ({ id: b.id, s3Key: b.s3KeyName })),
            },
          },
        });
      }
    }

  })

}

const folderId = "56a823fc-5528-483a-bf75-2fa597daad45"
const userId = Config.TEST_USER_ID;


// folderDeletionHandler({ userId, folderId })
