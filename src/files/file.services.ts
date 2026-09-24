import createHttpError from "http-errors";
import prisma from "../config/prisma";
import { sqsProducer } from "../infrastructure/sqs/sqs.producer";

export class FileService {

    constructor() { }

    renameFile = async (userId: string, fileId: string, name: string) => {
        const file = await prisma.file.findFirst({
            where: {
                id: fileId,
                userId: userId,
                deletedAt: null,
                status: "ACTIVE"
            }
        });

        console.log("File found:", file);


        if (!file) {
            const error = createHttpError(404, "File not found");
            throw error;
        }

        const updatedFile = await prisma.file.update({
            where: {
                id: fileId
            },
            data: {
                name: name
            },
            select: {
                id: true,
                name: true
            }
        });

        return updatedFile;

    }

    deleteFile = async (userId: string, fileId: string) => {
        const file = await prisma.file.findFirst({
            where: {
                id: fileId,
                userId: userId,
                deletedAt: null,
                status: "ACTIVE"
            }

        });


        if (!file) {
            const error = createHttpError(404, "File not found");
            throw error;
        }


        const UpdatedFile = await prisma.$transaction(async (tx) => {
            const updatedFile = await tx.file.update({
                where: {
                    id: fileId
                },
                data: {
                    status: "TRASHED",
                    deletedAt: new Date()
                },
                select: {
                    size: true,
                    name: true
                }
            });

            await tx.userStorage.update({
                where: {
                    userId: userId
                },
                data: {
                    usedBytes: {
                        decrement: updatedFile.size
                    },
                    trashBytes: {
                        increment: updatedFile.size
                    }
                }
            })

            return updatedFile;

        })


        return {
            ...UpdatedFile,
            size: UpdatedFile.size.toString(),
        };

    }

    restoreFile = async (userId: string, fileId: string) => {
        const file = await prisma.file.findFirst({
            where: {
                id: fileId,
                userId: userId,
                deletedAt: {
                    not: null
                },
                status: "TRASHED"
            }
        });

        if (!file) {
            const error = createHttpError(404, "File not found");
            throw error;
        }

        const UpdatedFile = await prisma.$transaction(async (tx) => {
            const updatedFile = await tx.file.update({
                where: {
                    id: fileId,
                    userId: userId
                },
                data: {
                    status: "ACTIVE",
                    deletedAt: null
                },
                select: {
                    size: true,
                    name: true,
                    id: true
                }
            });

            await tx.userStorage.update({
                where: {
                    userId: userId
                },
                data: {
                    usedBytes: {
                        increment: updatedFile.size
                    },
                    trashBytes: {
                        decrement: updatedFile.size
                    }
                }
            })
            return updatedFile;
        })
        return {
            ...UpdatedFile,
            size: UpdatedFile.size.toString(),
        };
    }

    getTrashFiles = async (userId: string) => {
        const files = await prisma.file.findMany({
            where: {
                userId: userId,
                deletedAt: {
                    not: null
                },
                status: "DELETED"
            },
            select: {
                id: true,
                name: true,
                size: true,
                deletedAt: true
            }
        });


        return files;
    }

    moveFile = async (userId: string, fileId: string, newParentId: string) => {
        const file = await prisma.file.findFirst({
            where: {
                id: fileId,
                userId: userId,
                deletedAt: null,
                status: "ACTIVE"
            },
            select: {
                id: true,
                name: true,
                folderId: true
            }
        });

        if (!file) {
            const error = createHttpError(404, "File not found");
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
                name: true
            }
        });

        if (!newParentFolder) {
            const error = createHttpError(404, "New parent folder not found");
            throw error;
        }



        if (file.folderId === newParentFolder.id) {
            const error = createHttpError(400, "File is already in the specified folder");
            throw error;
        }

        const updatedFile = await prisma.file.update({
            where: {
                id: file.id,
                userId: userId
            },
            data: {
                folderId: newParentFolder.id
            },
            select: {
                id: true,
                name: true,
                folderId: true
            }
        });

        return updatedFile;

    }

    permanentlyDeleteFile = async (userId: string, fileId: string) => {
        const file = await prisma.file.findFirst({
            where: {
                id: fileId,
                userId: userId,
                deletedAt: {
                    not: null
                },
                status: "TRASHED"
            },
            select: {
                id: true,
                name: true,
                size: true,
                s3KeyName: true
            }
        });

        if (!file) {
            const error = createHttpError(404, "File not found or It is not in the trash");
            throw error;
        }

        const deletedFile = await prisma.$transaction(async (tx) => {

            const deletedFile = await tx.file.delete({
                where: {
                    id: file.id,
                    userId: userId
                },
                select: {
                    id: true,
                    name: true,
                    size: true
                }
            });

            await tx.userStorage.update({
                where: {
                    userId: userId
                },
                data: {
                    trashBytes: {
                        decrement: file.size
                    }
                }
            })

            await tx.outboxEvents.create({
                data: {
                    eventType: "FILE_DELETION",
                    aggregateType: "FILE",
                    aggregateId: file.id,
                    payload: {
                        objectKey: file.s3KeyName,
                    },
                }
            })

            return {
                ...deletedFile,
                size: deletedFile.size.toString(),
            };

        });


        return deletedFile;

    }

    deleteAllTrashFiles = async (userId: string) => {
        const trashedFiles = await prisma.file.findMany({
            where: {
                userId: userId,
                deletedAt: {
                    not: null
                },
                status: "TRASHED"
            },
            select: {
                id: true,
                name: true,
                s3KeyName: true,
            }
        });

        if (trashedFiles.length === 0) {
            const error = createHttpError(404, "No trashed files found");
            throw error;
        }

        const deletedFiles = await prisma.$transaction(async (tx) => {
            const deletedFiles = await tx.file.deleteMany({
                where: {
                    id: {
                        in: trashedFiles.map(file => file.id)
                    },
                    userId: userId
                }
            });

            await tx.userStorage.update({
                where: {
                    userId: userId
                },
                data: {
                    trashBytes: 0
                }
            })

            await tx.outboxEvents.createMany({
                data: {
                    aggregateType: "USER",
                    eventType: "FILE_BATCH_DELETION",
                    aggregateId: userId,
                    payload: {
                        objectKeys: trashedFiles.map(file => file.s3KeyName)
                    }
                },
            });
            return deletedFiles;
        })

    return deletedFiles;

    }

}