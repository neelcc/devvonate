import createHttpError from "http-errors";
import prisma from "../config/prisma";
import { CreateFolderData, Folder } from "./folder.types";
import { decodeCursor, encodeCursor } from "../utils";

export class FolderServices {

    constructor() { }

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
                    throw createHttpError(
                        400,
                        "Parent folder does not exist"
                    );
                }
            }

            console.log("Parent Folder:", parentFolder);

            const user = await tx.user.findUnique({
                where: {
                    id: userId,
                },
                select: {
                    rootFolderId: true,
                },
            });

            console.log("User Root Folder ID:", user?.rootFolderId);

            const newFolder = await tx.folder.create({
                data: {
                    name: data.name,
                    parentFolderId: parentFolder?.id ?? user?.rootFolderId ?? null,
                    userId,
                    path: "",
                },
                select: {
                    id: true,
                    name: true,
                    parentFolderId: true,
                }
            });

            console.log("New Folder Created:", newFolder);

            const path = parentFolder
                ? `${parentFolder.path}/${newFolder.id}`
                : `${newFolder.parentFolderId}/${newFolder.id}`;

            console.log("Computed Path:", path);

            return tx.folder.update({
                where: {
                    id: newFolder.id,
                },
                data: {
                    path,
                },
            });
        });
    }

    async getChildFolders(folderId: string, userId: string, cursor?: string, pageSize: number = 5) {

        const folder = await prisma.folder.findFirst({
            where: {
                id: folderId,
                userId: userId,
                deletedAt: null
            }
        });

        if (!folder) {
            const error = createHttpError(404, "Folder not found");
            throw error;
        }

        const decodedCursor = cursor ? decodeCursor(cursor) : null;


        const folders = await prisma.folder.findMany({

            take: pageSize + 1,
            orderBy: [
                {
                    createdAt: 'asc'
                },
                {
                    id: 'asc'
                }
            ],
            where: {
                parentFolderId: folderId,
                userId: userId,
                deletedAt: null,
                ...(decodedCursor &&
                {
                    OR: [
                        {
                            createdAt: {
                                gt: new Date(decodedCursor.createdAt)
                            }
                        },
                        {
                            createdAt: new Date(decodedCursor.createdAt),
                            id: {
                                gt: decodedCursor.id
                            }
                        }
                    ]
                }
                ),
            }
        })
        const hasNextPage = folders.length > pageSize;

        return {
            data: folders,
            nextCursor: hasNextPage
                ? encodeCursor(folders[folders.length - 1]?.id, folders[folders.length - 1]?.createdAt)
                : null
        }

    }

    async listRootFolders(userId: string, cursor?: string, pageSize: number = 10,) {

        const decodedCursor = cursor ? decodeCursor(cursor) : null;

        const user = await prisma.user.findUnique({
            where: {
                id: userId
            },
            select: {
                rootFolderId: true
            }
        })

        if (!user || !user.rootFolderId) {
            const error = createHttpError(404, "User or root folder not found");
            throw error;
        }


        const folders = await prisma.folder.findMany({
            take: pageSize + 1,

            orderBy: [
                {
                    createdAt: 'asc'
                },
                {
                    id: 'asc'
                }
            ],
            where: {
                userId,
                parentFolderId: user.rootFolderId,
                deletedAt: null,
                ...(decodedCursor &&
                {
                    OR: [
                        {
                            createdAt: {
                                gt: new Date(decodedCursor.createdAt)
                            }
                        },
                        {
                            createdAt: new Date(decodedCursor.createdAt),
                            id: {
                                gt: decodedCursor.id
                            }
                        }
                    ]
                }
                ),
            }
        })

        const hasNextPage = folders.length > pageSize;
        const items = hasNextPage ? folders.slice(0, -1) : folders;
        const nextCursor = hasNextPage
            ? encodeCursor(items[items.length - 1]?.id, items[items.length - 1]?.createdAt)
            : null;

        return {
            data: items,
            nextCursor: nextCursor
        }

    }

    async moveFolder(folderId: string, newParentId: string, userId: string) {


        const folder = await prisma.folder.findFirst({
            where: {
                id: folderId,
                userId: userId,
                deletedAt: null
            },
            select: {
                id: true,
                path: true,
                parentFolderId: true,
            }
        });

        if (!folder) {
            const error = createHttpError(404, "Folder not found");
            throw error;
        }

        const user = await prisma.user.findUnique({
            where: {
                id: userId
            },
            select: {
                rootFolderId: true
            }
        });

        if (folder.id === user?.rootFolderId) {
            const error = createHttpError(400, "Cannot move root folder");
            throw error;
        }

        const newParentFolder = await prisma.folder.findFirst({
            where: {
                id: newParentId,
                userId: userId,
                deletedAt: null
            },
            select: {
                id: true,
                path: true,
                updatedAt: true
            }
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

        const isDescendant = newParentFolder.path.includes(folderId)

        console.log("Is Descendant:", isDescendant);

        if (isDescendant) {
            const error = createHttpError(409, "Cannot move folder to its descendant");
            throw error;
        }

        const newPath = `${newParentFolder.path}/${folder.id}`;

        return await prisma.folder.update({
            where: { id: folderId },
            data: {
                parentFolderId: newParentId,
                path: newPath,
                updatedAt: new Date()
            },
            select: {
                id: true,
                name: true,
                parentFolderId: true,
                path: true,
                updatedAt: true
            }
        });

    }

    async deleteFolder(folderId: string, userId: string) {

        console.log("Deleting folder with ID:", folderId, "for user:", userId);
        
        const folder = await prisma.folder.findFirst({
            where: {
                id: folderId,
                userId: userId,
                deletedAt: null
            },
            select: {
                children: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            },
        })

        if (!folder) {
            const error = createHttpError(404, "Folder not found");
            throw error;
        }

        const deletedFolder = await prisma.$transaction(async (tx) => {

            if(folder.children && folder.children.length > 0) {
                await tx.folder.updateMany({
                where: {
                    parentFolderId: folderId,
                    userId: userId,
                    deletedAt: null
                },
                data: {
                    deletedAt: new Date()
                }
            })
            }

            return await prisma.folder.update({
                where: { id: folderId },
                data: { deletedAt: new Date() },
                select: {
                    id: true,
                    name: true,
                }
            });
        })

        return deletedFolder;
    }

    async renameFolder(folderId: string, newName: string, userId: string) {
        const folder = await prisma.folder.findFirst({
            where: {
                id: folderId,
                userId: userId,
                deletedAt: null
            }
        })

        if (!folder) {
            const error = createHttpError(404, "Folder not found");
            throw error;
        }

        return await prisma.folder.update({
            where: { id: folderId },
            data: {
                name: newName,
                updatedAt: new Date()
            },
            select: {
                id: true,
                name: true,
                parentFolderId: true,
            }
        });
    }
}