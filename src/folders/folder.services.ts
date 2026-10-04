import createHttpError from "http-errors";
import prisma from "../config/prisma";
import { CreateFolderData, Folder, PaginatedResultFile, PaginatedResultFolder } from "./folder.types";
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
    let resultFolders : PaginatedResultFolder[] = [];
    let resultFiles : PaginatedResultFile[] = [];
    let remaining : number = pageSize;
    const decodedCursor = cursor ? decodeCursor(cursor) : null;
    let nextCursor : string | null = null;

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
          createdAt: true,
        }
      });
      const hasNextPage = folders.length > pageSize;
      remaining = remaining - folders.length;
      console.log("remainingItems", remaining);
      resultFolders = hasNextPage ? folders.slice(0, pageSize) : folders;

      if(hasNextPage){
         nextCursor = encodeCursor(
          "folder",
          resultFolders[resultFolders.length - 1]?.id,
          resultFolders[resultFolders.length - 1]?.createdAt,
         )
      } else if(remaining === 0){
        console.log("Fetching ifelse:", remaining);
        nextCursor = encodeCursor("file", undefined, undefined);
        console.log("nextCursor ifelse:", nextCursor);
      }
    }


    if( !nextCursor && remaining > 0 ) {
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
          folderId: true,
          createdAt: true,
        }
      });
      const hasNextPage = files.length > remaining;
      resultFiles = hasNextPage ? files.slice(0, remaining) : files;

      if(hasNextPage){
         nextCursor = encodeCursor(
          "file",
          resultFiles[resultFiles.length - 1]?.id,
          resultFiles[resultFiles.length - 1]?.createdAt,
        )
      }
    }


    return {
      folders : resultFolders,
      files : resultFiles,
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

    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId: userId,
        deletedAt: null,
      },
      select: {
        children: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!folder) {
      const error = createHttpError(404, "Folder not found");
      throw error;
    }

    const deletedFolder = await prisma.$transaction(async (tx) => {
      if (folder.children && folder.children.length > 0) {
        await tx.folder.updateMany({
          where: {
            parentFolderId: folderId,
            userId: userId,
            deletedAt: null,
          },
          data: {
            deletedAt: new Date(),
          },
        });
      }

      return await prisma.folder.update({
        where: { id: folderId },
        data: { deletedAt: new Date() },
        select: {
          id: true,
          name: true,
        },
      });
    });

    return deletedFolder;
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
