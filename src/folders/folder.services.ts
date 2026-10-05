import createHttpError from "http-errors";
import prisma from "../config/prisma";
import { CreateFolderData, DeleteFolderResult, Folder, PaginatedResultFile, PaginatedResultFolder } from "./folder.types";
import { decodeCursor, encodeCursor } from "../utils";
import { Logger } from "winston";

export class FolderServices {
  constructor(private readonly logger: Logger) { }

  async createFolder(data: CreateFolderData, userId: string) {
    return prisma.$transaction(async (tx) => {
      let parentFolder = null;

      if (data.parentId) {
        parentFolder = await tx.folder.findFirst({
          where: {
            id: data.parentId,
            userId,
            deletedAt: null,
          },
        });

        if (!parentFolder) {
          throw createHttpError(400, "Parent folder does not exist");
        }
      }

      const user = await tx.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          rootFolderId: true,
        },
      });

      const newFolder = await tx.folder.create({
        data: {
          name: data.name,
          parentFolderId: parentFolder?.id ?? user?.rootFolderId ?? null,
          userId,
        },
        select: {
          id: true,
          name: true,
          parentFolderId: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
        },
      });


      this.logger.info(
        `FolderServices.createFolder: Folder created successfully for user ${userId} with name ${data.name}`,
      );

      return newFolder;
    });
  }

  async getChildFolders(
    folderId: string,
    userId: string,
    cursor?: string,
    pageSize: number = 3,
  ) {
    let resultFolders: PaginatedResultFolder[] = [];
    let resultFiles: PaginatedResultFile[] = [];
    let remaining: number = pageSize;
    const decodedCursor = cursor ? decodeCursor(cursor) : null;
    let nextCursor: string | null = null;

    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId: userId,
        deletedAt: null,
      },
    });

    if (!folder) {
      const error = createHttpError(404, "Folder not found");
      throw error;
    }


    if (!decodedCursor || decodedCursor.cursorType === "folder") {
      const folders = await prisma.folder.findMany({
        take: remaining + 1,
        orderBy: [
          {
            createdAt: "asc",
          },
          {
            id: "asc",
          },
        ],
        where: {
          parentFolderId: folderId,
          userId: userId,
          deletedAt: null,
          ...(decodedCursor && {
            OR: [
              {
                createdAt: {
                  gt: new Date(decodedCursor.createdAt),
                },
              },
              {
                createdAt: new Date(decodedCursor.createdAt),
                id: {
                  gt: decodedCursor.id,
                },
              },
            ],
          }),
        },
        select: {
          id: true,
          name: true,
          parentFolderId: true,
          userId: true,
          status: true,
          updatedAt: true,
          deletedAt: true,
          createdAt: true,
        }
      });
      const hasNextPage = folders.length > pageSize;
      remaining = remaining - folders.length;
      console.log("remainingItems", remaining);
      resultFolders = hasNextPage ? folders.slice(0, pageSize) : folders;

      if (hasNextPage) {
        nextCursor = encodeCursor(
          "folder",
          resultFolders[resultFolders.length - 1]?.id,
          resultFolders[resultFolders.length - 1]?.createdAt,
        )
      } else if (remaining === 0) {
        console.log("Fetching ifelse:", remaining);
        nextCursor = encodeCursor("file", undefined, undefined);
        console.log("nextCursor ifelse:", nextCursor);
      }
    }


    if (!nextCursor && remaining > 0) {
      const fileCursor = decodedCursor?.cursorType === "file" && decodedCursor.id ? decodedCursor : null;
      console.log("Fetching files with remaining items:", remaining);
      const files = await prisma.file.findMany({
        take: remaining + 1,
        orderBy: [
          {
            createdAt: "asc",
          },
          {
            id: "asc",
          },
        ],
        where: {
          folderId: folderId,
          userId: userId,
          deletedAt: null,
          status: "ACTIVE",
          ...(fileCursor && {
            OR: [
              {
                createdAt: {
                  gt: new Date(fileCursor.createdAt),
                },
              },
              {
                createdAt: new Date(fileCursor.createdAt),
                id: {
                  gt: fileCursor.id,
                },
              },
            ],
          }),
        },
        select: {
          id: true,
          name: true,
          category: true,
          size: true,
          status: true,
          folderId: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          userId: true,
        }
      });

      const hasNextPage = files.length > remaining;

      const updatedFile = files.map((file) => ({
        ...file,
        size: file.size.toString(),
      }));

      resultFiles = hasNextPage ? updatedFile.slice(0, remaining) : updatedFile;

      if (hasNextPage) {
        nextCursor = encodeCursor(
          "file",
          resultFiles[resultFiles.length - 1]?.id,
          resultFiles[resultFiles.length - 1]?.createdAt,
        )
      }
    }


    return {
      folders: resultFolders,
      files: resultFiles,
      nextCursor,
    };

  }

  async moveFolder(folderId: string, newParentId: string, userId: string) {
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        parentFolderId: true,
      },
    });

    if (!folder) {
      const error = createHttpError(404, "Folder not found");
      throw error;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        rootFolderId: true,
      },
    });

    if (folder.id === user?.rootFolderId) {
      const error = createHttpError(400, "Cannot move root folder");
      throw error;
    }

    const newParentFolder = await prisma.folder.findFirst({
      where: {
        id: newParentId,
        userId: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        updatedAt: true,
      },
    });

    if (!newParentFolder) {
      const error = createHttpError(404, "Parent folder not found");
      throw error;
    }

    if (newParentFolder.id === folder.parentFolderId) {
      const error = createHttpError(400, "Cannot move folder to itself");
      throw error;
    }

    console.log("New Parent Folder:", newParentFolder);


    return await prisma.folder.update({
      where: { id: folderId },
      data: {
        parentFolderId: newParentId,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        parentFolderId: true,
        updatedAt: true,
      },
    });
  }

  async deleteFolder(folderId: string, userId: string) {
   
    console.log("Deleting folder with ID:", folderId, "for user:", userId);

    // const folder = await prisma.folder.findFirst({
    //   where: {
    //     id: folderId,
    //     userId: userId,
    //     deletedAt: null,
    //   },
    //   select: {
    //     name: true,
    //     children: {
    //       select: {
    //         id: true,
    //         name: true,
    //       },
    //     },
    //   },
    // });

    const folders: DeleteFolderResult[] = await prisma.$queryRaw`
    WITH RECURSIVE folder_tree AS (
    SELECT
      f.id,
      f."parentFolderId" AS "parentId",
      f."userId",
      f."name" as name,
      f."status" as status,
      0 AS depth
    FROM "folders" f
    WHERE f.id = ${folderId}
      AND f."userId" = ${userId}
      AND f."deletedAt" IS NULL
      AND f."status" = 'ACTIVE'

    UNION ALL

    SELECT
      child.id,
      child."parentFolderId" AS "parentId",
      child."userId",
      child."name" ,
      child."status" as status,
      ft.depth + 1 AS depth
    FROM "folders" child
    INNER JOIN folder_tree ft
      ON child."parentFolderId" = ft.id
    WHERE child."userId" = ${userId}
      AND child."deletedAt" IS NULL
      AND child."status" = 'ACTIVE'
  )

  SELECT *
  FROM folder_tree  
  ORDER BY depth, id;
    `;

    const result = await prisma.$queryRaw`
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

   

    if (!folders) {
      const error = createHttpError(404, "Folders not found");
      throw error;
    }


    const folderIds = folders.map(f => f.id);





    // await prisma.$transaction(async (tx) => {

    //   const files = await tx.file.findMany({
    //     where: {
    //       folderId: { in: folderIds },
    //       userId: userId,
    //       deletedAt: null,
    //       status: "ACTIVE",
    //     },
    //     select: {
    //       id: true,
    //       folderId: true,
    //     },
    //   });

    //   const fileIds = files.map(f => f.id);

    //   const deletedFolders = await tx.folder.updateMany({
    //     where: {
    //       id: { in: folderIds },
    //       userId: userId,
    //       deletedAt: null,
    //     },
    //     data: {
    //       deletedAt: new Date(),
    //       status: "DELETING",

    //     },
    //   });

    //   const deletedFiles = await tx.file.updateMany({
    //     where: {
    //       id: { in: fileIds },
    //       userId: userId,
    //       deletedAt: null,
    //     },
    //     data: {
    //       deletedAt: new Date(),
    //       status: "DELETING",
    //     },
    //   })



      




    // })


    // const deletedFolder = await prisma.$transaction(async (tx) => {
    //   if (folder.children && folder.children.length > 0) {
    //     await tx.folder.updateMany({
    //       where: {
    //         parentFolderId: folderId,
    //         userId: userId,
    //         deletedAt: null,
    //       },
    //       data: {
    //         deletedAt: new Date(),
    //       },
    //     });
    //   }

    //   return await prisma.folder.update({
    //     where: { id: folderId },
    //     data: { deletedAt: new Date() },
    //     select: {
    //       id: true,
    //       name: true,
    //     },
    //   });
    // });

    return {
      result : result,
      folders: folders,
    }
  }

  async renameFolder(folderId: string, newName: string, userId: string) {
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId: userId,
        deletedAt: null,
      },
    });

    if (!folder) {
      const error = createHttpError(404, "Folder not found");
      throw error;
    }

    return await prisma.folder.update({
      where: { id: folderId },
      data: {
        name: newName,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        parentFolderId: true,
      },
    });
  }

}
