import createHttpError from "http-errors";
import prisma from "../config/prisma";
import { FileData } from "./upload.types";
import {
  fileValidated,
  getAvailableBytes,
  getFileCategory,
  getPartsInfo,
  isPartsValidated,
  sortPartsByPartNumber,
} from "../utils";
import { s3Repository } from "../infrastructure/s3/s3repository";
import { clearPartFailCount, incrementPartFailCount } from "../utils/uploadAttempt";
import { Config } from "../config";

export class UploadServices {
  constructor() { }



  async InitUpload(
    fileData: FileData,
    folderId: string,
    userId: string,
    sha256: string,
  ) {


    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        parentFolderId: true,
        createdAt: true,
      },
    });


    if (!folder) {
      const error = createHttpError(
        404,
        "Folder not found or does not belong to the user",
      );
      throw error;
    }

    const category = getFileCategory(fileData.contentType);

    if (!category) {
      const error = createHttpError(400, "Invalid file type");
      throw error;
    }

    const existingBlob = await prisma.blob.findFirst({
      where: {
        sha256: sha256,
        contentType: fileData.contentType,
        size: fileData.size,
        AND : {
          files: {
            some: {
              status: "ACTIVE",
            }
          }
        }
      },
      select: {
        id: true,
        refCount: true,
        s3KeyName: true,
        files: {
          select: {
            folderId: true,
            id: true,
            name: true,
          }
        }
      },
    })

     const availableStorage = await prisma.userStorage.findFirst({
      where: {
        userId: userId,
      },
      select: {
        usedBytes: true,
        totalBytes: true,
        trashBytes: true,
        reservedBytes: true,
      },
    });

    
    if (!availableStorage) {
      const error = createHttpError(404, "User storage not found");
      throw error;
    }

    if (existingBlob) {

      const availableBytes = getAvailableBytes(availableStorage);

      if (availableBytes < fileData.size) {
      const error = createHttpError(400, "Insufficient storage space");
      throw error;
    }
      
      const updatedFileName = existingBlob.files[0]?.folderId === folderId ? existingBlob.files[0]?.name + "(" + existingBlob.refCount + ")" : fileData.fileName;



      return await prisma.$transaction(async (tx) => {
        const file = await tx.file.create({
          data: {
            name: updatedFileName,
            size: fileData.size,
            contentType: fileData.contentType,
            userId: userId,
            folderId: folderId,
            category: category,
            status: "ACTIVE",
          },
          select: {
            id: true,
            name: true,
            size: true,
            category: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        await tx.blob.update({
          where: {
            id: existingBlob.id,
            status: "ACTIVE"
          },
          data: {
            refCount: {
              increment: 1,
            },
          }
        })

        await tx.userStorage.update({
          where: {
            userId: userId,
          },
          data: {
            usedBytes: {
              increment: file.size,
            }
          }
        })


        return {
          ...file,
          size: file.size.toString(),
          uploadId: null,
          ACTION: "DUPLICATE",
        }
      }
      )

    }


    const availableBytes = getAvailableBytes(availableStorage);


    if (availableBytes < fileData.size) {
      const error = createHttpError(400, "Insufficient storage space");
      throw error;
    }

    const s3KeyName = `users/${userId}/objects/${folderId}/${fileData.fileName}`;


    // if (fileData.size > Config.aws.maxFileSizeForSingleUpload) {

    //   const file = await prisma.$transaction(async (tx) => {
    //     const file = await tx.file.create({
    //       data: {
    //         name: fileData.fileName,
    //         size: fileData.size,
    //         contentType: fileData.contentType,
    //         userId: userId,
    //         folderId: folderId,
    //         category: category,
    //         status: "IN_PROGRESS",

    //       },
    //       select: {
    //         id: true,
    //         name: true,
    //         size: true,
    //         category: true,
    //         status: true,
    //         createdAt: true,
    //         updatedAt: true,
    //       },
    //     });

    //     const blob = await tx.blob.create({
    //       data: {
    //         fileId: file.id,
    //         contentType: fileData.contentType,
    //         size: fileData.size,
    //         s3KeyName: s3KeyName,
    //         userId: userId,
    //         refCount: 1,
    //         sha256: sha256,
            
    //       },
    //       select: {
    //         s3KeyName: true,
    //       }
    //     })

    //     await tx.userStorage.update({
    //       where: {
    //         userId: userId,
    //       },
    //       data: {
    //         reservedBytes: {
    //           increment: fileData.size,
    //         },
    //       },
    //     });
    //     return file
    //   })

    //   const response = await s3Repository.SinglePutUpload(
    //     fileData,
    //     s3KeyName,
    //   );

    //   return {
    //     ...file,
    //     size: file.size.toString(),
    //     uploadId: null,
    //     ACTION: "SINGLE_PUT",
    //     presignedUrl: response,
    //   };
    // }

    const { partSize, totalParts } = getPartsInfo(fileData.size, userId, folderId, fileData.fileName);

    const file = await prisma.$transaction(async (tx) => {

      const blob = await tx.blob.create({
        data: {
          contentType: fileData.contentType,
          size: fileData.size,
          s3KeyName: s3KeyName,
          userId: userId,
          refCount: 1,
          sha256: sha256,
        },
        select: {
          id: true,
          s3KeyName: true,
        }
      })

       const file = await tx.file.create({
        data: {
          name: fileData.fileName,
          size: fileData.size,
          contentType: fileData.contentType,
          userId: userId,
          folderId: folderId,
          category: category,
          status: "IN_PROGRESS",
          blobId: blob.id,

        },
        select: {
          id: true,
          name: true,
          size: true,
          category: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });


       const fileUpload = await tx.fileUpload.create({
        data: {
          fileId: file.id,
          userId: userId,
          partsSize: partSize,
          totalParts: totalParts,
          s3UploadId: "",
          status: "PENDING",
        },
        select: {
          id: true,
        }
      });

      await tx.userStorage.update({
        where: {
          userId: userId,
        },
        data: {
          reservedBytes: {
            increment: fileData.size,
          },
        },
      });

      return {
        ...file,
        size: file.size.toString(),
        fileUploadId: fileUpload.id,
        s3KeyName: blob.s3KeyName,
      };
    });

    const response = await s3Repository.CreateMultipartUpload(
      fileData,
      s3KeyName,
    );

    if (!response || !response.UploadId) {
      const error = createHttpError(500, "Failed to initiate multipart upload");
      throw error;
    }

    await prisma.fileUpload.update({
      where: {
        id: file.fileUploadId,
      },
      data: {
        s3UploadId: response.UploadId,
      },
    });

    return {
      ...file,
      totalSize: fileData.size.toString(),
      uploadId: response.UploadId,
      ACTION: "MULTIPART",
    };

  }

  async generatePresignedUrl(
    fileUploadId: string,
    PartNumber: number,
    userId: string,
  ) {
    const fileUpload = await prisma.fileUpload.findFirst({
      where: {
        id: fileUploadId,
        userId: userId,
        file: {
          userId: userId,
          deletedAt: null,
        },

      },
      select: {
        id: true,
        fileId: true,
        s3UploadId: true,
        file: {
          select: {
            blob: {
              select: {
                s3KeyName: true,
              }
            }
          }
        }
      },
    });

    if (!fileUpload) {
      const error = createHttpError(404, "File upload not found");
      throw error;
    }

    const s3KeyName = fileUpload.file.blob?.s3KeyName;

    if (!s3KeyName) {
      const error = createHttpError(404, "S3 key name not found for the file upload");
      throw error;
    }

    const preSignedUrl = await s3Repository.generatePresignedUrl(
      fileUpload.s3UploadId,
      s3KeyName,
      PartNumber,
    );

    await prisma.fileUpload.update({
      where: {
        id: fileUpload.id
      },
      data: { updatedAt: new Date() },
    });

    return preSignedUrl;
  }

  async completeMultipartUpload(  
    fileUploadId: string,
    userId: string,
    parts: { ETag: string; PartNumber: number }[],
  ) {
    const fileUpload = await prisma.fileUpload.findFirst({
      where: {
        id: fileUploadId,
        file: {
          userId: userId,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        fileId: true,
        status: true,
        s3UploadId: true,
        file: {
          select: {
            id: true,
            size: true,
            contentType: true,
            blob: {
              select: {
                s3KeyName: true,
              }    
          },
        },
      },
    }
  });

    if (fileUpload && fileUpload.status === "COMPLETED") {
      return {
        message: "Multipart upload already completed",

      }
    }

    if (!fileUpload) {
      const error = createHttpError(404, "File upload not found");
      throw error;
    }

    const s3KeyName = fileUpload.file.blob?.s3KeyName;

    if (!s3KeyName) {
      const error = createHttpError(404, "S3 key name not found for the file upload");
      throw error;
    }

    const s3PartList = await s3Repository.listParts(s3KeyName, fileUpload.s3UploadId);

    if (!s3PartList || !s3PartList.Parts || s3PartList.Parts.length === 0) {
      const error = createHttpError(
        400,
        "No parts found in S3 for the given uploadId and key",
      );
      throw error;
    }
    const sortedParts = sortPartsByPartNumber(parts);

    console.log("Sorted parts:", sortedParts);
    console.log("S3 parts:", s3PartList.Parts);

    const isPartsValid = isPartsValidated(sortedParts, s3PartList.Parts);


    if (!isPartsValid) {
      const error = createHttpError(
        400,
        "Parts validation failed. The provided parts do not match the parts in S3.",
      );
      throw error;
    }

    const completeMultipartUploadResponse =
      await s3Repository.completeMultipartUpload(fileUpload.s3UploadId, s3KeyName, sortedParts);

    const headObjectResponse = await s3Repository.headObject(s3KeyName);
    const contentLength = headObjectResponse.ContentLength;
    const contentType = headObjectResponse.ContentType;

    if (contentLength==null || !contentType) {
      const error = createHttpError(
        500,
        "Failed to retrieve object metadata from S3",
      );
      throw error;
    }



    const isFileValidated = fileValidated(
      contentLength,
      contentType,
      fileUpload.file.size,
      fileUpload.file.contentType,
    );

    if (!isFileValidated) {
      const error = createHttpError(
        400,
        "File validation failed. The uploaded file does not match the expected size or content type.",
      );
      throw error;
    }

    const updatedFile = await prisma.$transaction(async (tx) => {
      const file = await tx.file.update({
        where: {
          id: fileUpload.file.id,
        },
        data: {
          updatedAt: new Date(),
          status: "ACTIVE",
          fileUpload: {
            update: {
              status: "COMPLETED",
               ...(completeMultipartUploadResponse.ETag
                  ? {
                    s3ETag: completeMultipartUploadResponse.ETag,
                  }
                  : {}),
            }
            // update: {
            //   where: {
            //     id: fileUpload.id,
            //   },
            //   data: {
            //     status: "COMPLETED",
            //     ...(completeMultipartUploadResponse.ETag
            //       ? {
            //         s3ETag: completeMultipartUploadResponse.ETag,
            //       }
            //       : {}),
            //   },
            // },
          },
        },
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
        },
      });

      await tx.userStorage.update({
        where: {
          userId,
        },
        data: {
          reservedBytes: {
            decrement: fileUpload.file.size,
          },
          usedBytes: {
            increment: fileUpload.file.size,
          },
        },
      });

      return file;
    });

    return {
      ...updatedFile,
      message: "Multipart upload completed successfully",
  }
}
  


  async abortMultipartUpload(fileUploadId: string, key: string, userId: string) {
  const file = await prisma.file.findFirst({
    where: {
      userId: userId,
      deletedAt: null,
      blob: {
        s3KeyName: key,
      },
      fileUpload: {
        id: fileUploadId,
      }
    },
    select: {
      id: true,
      size: true,
      fileUpload: {
        select: {
          s3UploadId: true,
        }
      },
    },
  });

  if (!file) {
    const error = createHttpError(404, "File not found for the given uploadId and key");
    throw error;
  }

  if(!file.fileUpload || !file.fileUpload.s3UploadId) {
    const error = createHttpError(404, "S3 upload ID not found for the given file");
    throw error;
  }

  const s3UploadId = file.fileUpload.s3UploadId;

  const response = await s3Repository.abortMultipartUpload(s3UploadId, key);

  await prisma.$transaction(async (tx) => {
    await tx.file.delete({
      where: {
        id: file.id,
      },
    });

    await tx.userStorage.update({
      where: {
        userId: userId,
      },
      data: {
        reservedBytes: {
          decrement: file.size,
        },
      },
    });
  });

  return response;
}

  async abortAllStuckUploads(userId: string) {
  const response = await prisma.outboxEvents.create({
    data: {
      eventType: "ABORT_STUCK_UPLOADS",
      aggregateType: "USER",
      aggregateId: userId,
      payload: {
        userId: userId,
      },
      status: "PENDING",
    },
    select: {
      id: true,
      eventType: true,
      aggregateType: true,
      aggregateId: true,
      status: true,
    }
  });
  return response;
}

  async checkPartStatus(fileUploadId: string, partNumber: number, status: string, userId: string) {

  const fileUpload = await prisma.fileUpload.findFirst({
    where: {
      id: fileUploadId,
      file: { userId, deletedAt: null },
    },
    select: {
      id: true,
      fileId: true,
      s3UploadId: true,
      file: { select: { id: true, size: true, blob: { select: { s3KeyName: true } } } },
    },
  });


  if (!fileUpload) {
    throw createHttpError(404, "File upload not found");
  }

  const s3UploadId = fileUpload.s3UploadId;

  const s3KeyName = fileUpload.file.blob?.s3KeyName;

  if (!s3KeyName) {
    throw createHttpError(404, "S3 key name not found for the file upload");
  }

  await prisma.fileUpload.update({
    where: { id: fileUpload.id },
    data: { updatedAt: new Date() },
  });

  const s3PartList = await s3Repository.listParts(s3KeyName, s3UploadId);
  const parts = s3PartList?.Parts ?? []; // empty is a valid state, not an error

  const part = parts.find((p) => p.PartNumber === partNumber);
  const isVerifiedSuccess = status === "SUCCESS" && !!part && !!part.ETag;

  if (isVerifiedSuccess) {
    await clearPartFailCount({  s3UploadId, partNumber }); // clear stale counter
    return {
      action: "NONE",
      partNumber,
      message: `Part ${partNumber} has been uploaded successfully.`,
    };
  }

  const attempt = await incrementPartFailCount({ s3UploadId, partNumber });

  if (attempt > Config.MAX_PART_RETRIES) {
    await this.abortMultipartUpload(fileUpload.id, s3KeyName, userId);
    return {
      action: "ABORT",
      partNumber,
      message: `Part ${partNumber} has failed ${attempt} times. The upload has been aborted.`,
    };
  }

  const url = await s3Repository.generatePresignedUrl(s3UploadId, s3KeyName, partNumber);
  return {
    action: "RETRY",
    partNumber,
    message: `Part ${partNumber} has failed ${attempt} times. Please retry the upload.`,
    presignedUrl: url,
  };
}

  async dummyEndpoint() {
  const key =
    "34c2789e-37e0-4fa1-8347-dcd849b80a26/a09a893a-2ac5-493d-8d5c-67de6d9e9bf8/FirsT__1789973812978";
  const uploadId =
    "Ah5CDO5d4Ca7jtk4dj8EWbOjTeGKd30XUQGsbU2Ww0sfdUzjwWvR5sbdcuGsXW1qfB4n3OwW_WqWofr_CXhK.aXkdE.hXCdEGmhdzNaT5zGCzgJFqaWeJlspNG8QsouL";

  const response = await s3Repository.listParts(key, uploadId);

  return {
    message: "Dummy endpoint reached successfully",
    data: response,
  };
}
}
