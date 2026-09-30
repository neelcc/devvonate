import createHttpError from "http-errors";
import prisma from "../config/prisma";
import { FileData } from "./upload.types";
import {
  calculatePartSize,
  fileValidated,
  getFileCategory,
  isPartsValidated,
  sortPartsByPartNumber,
} from "../utils";
import { s3Repository } from "../infrastructure/s3/s3repository";
import { clearPartFailCount, incrementPartFailCount } from "../utils/uploadAttempt";
import { Config } from "../config";

export class UploadServices {
  constructor() { }

  async CreateMultipartUpload(
    fileData: FileData,
    folderId: string,
    userId: string,
  ) {
    // save metadata and status pending to database and also check if the folder exists and belongs to the user and folder should not root folder

    console.log(
      `UploadServices.uploadFile: Received upload request for user ${userId} in folder ${folderId} with fileName: ${fileData.fileName}, size: ${fileData.size}, contentType: ${fileData.contentType}`,
    );

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

    const availableBytes =
      availableStorage?.totalBytes -
      availableStorage?.usedBytes -
      availableStorage?.trashBytes -
      availableStorage?.reservedBytes;

    if (availableBytes < fileData.size) {
      const error = createHttpError(400, "Insufficient storage space");
      throw error;
    }

    const fileName = folder.name + "_" + "_" + Date.now().toString();

    const partSize = calculatePartSize(fileData.size);

    const s3KeyName = `${folder.id}/${fileName}`;

    const totalParts = Math.ceil(Number(fileData.size) / Number(partSize));

    const file = await prisma.$transaction(async (tx) => {
      const file = await tx.file.create({
        data: {
          name: fileData.fileName,
          size: fileData.size,
          contentType: fileData.contentType,
          userId: userId,
          folderId: folderId,
          category: category,
          status: "IN_PROGRESS",
          s3KeyName: s3KeyName,
        },
        select: {
          id: true,
          name: true,
          size: true,
          category: true,
          status: true,
          s3KeyName: true,
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
          s3UploadId: "", // This will be updated after initiating the multipart upload
          status: "PENDING",
        },
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
        fileUploadId: fileUpload.id,
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

    const objectResponse = {
      ...file,

      uploadId: response.UploadId,
    };

    console.log("Object Response:", objectResponse);

    return {
      ...file,
      totalSize: fileData.size.toString(),
      uploadId: response.UploadId,
    };
  }

  async generatePresignedUrl(
    uploadId: string,
    key: string,
    PartNumber: number,
    userId: string,
  ) {
    const fileUpload = await prisma.fileUpload.findFirst({
      where: {
        s3UploadId: uploadId,
        userId: userId,
        AND: {
          file: {
            s3KeyName: key,
            userId: userId,
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        fileId: true,
      },
    });

    if (!fileUpload) {
      const error = createHttpError(404, "File upload not found");
      throw error;
    }

    const preSignedUrl = await s3Repository.generatePresignedUrl(
      uploadId,
      key,
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
    uploadId: string,
    key: string,
    userId: string,
    parts: { ETag: string; PartNumber: number }[],
  ) {
    const fileUpload = await prisma.fileUpload.findFirst({
      where: {
        s3UploadId: uploadId,
        file: {
          s3KeyName: key,
          userId: userId,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        fileId: true,
        file: {
          select: {
            id: true,
            size: true,
            contentType: true,
          },
        },
      },
    });

    if (!fileUpload) {
      const error = createHttpError(404, "File upload not found");
      throw error;
    }

    const s3PartList = await s3Repository.listParts(key, uploadId);

    if (!s3PartList || !s3PartList.Parts || s3PartList.Parts.length === 0) {
      const error = createHttpError(
        400,
        "No parts found in S3 for the given uploadId and key",
      );
      throw error;
    }
    const sortedParts = sortPartsByPartNumber(parts);
    console.log(
      `S3 Parts List for uploadId ${uploadId} and key ${key}:`,
      s3PartList.Parts,
    );
    console.log(`Received parts for completion:`, parts);
    const isPartsValid = isPartsValidated(sortedParts, s3PartList.Parts);
    console.log(
      `Parts validation result for uploadId ${uploadId} and key ${key}:`,
      isPartsValid,
    );
    if (!isPartsValid) {
      const error = createHttpError(
        400,
        "Parts validation failed. The provided parts do not match the parts in S3.",
      );
      throw error;
    }
    console.log(`parts: `, sortedParts);

    const completeMultipartUploadResponse =
      await s3Repository.completeMultipartUpload(uploadId, key, sortedParts);
    console.log("----------------------------------------------");
    console.log(
      `CompleteMultipartUploadResponse for uploadId ${uploadId} and key ${key}:`,
      completeMultipartUploadResponse,
    );
    console.log("----------------------------------------------");

    const headObjectResponse = await s3Repository.headObject(key);
    console.log("******************************");
    console.log(`HeadObjectResponse for key ${key}:`, headObjectResponse);
    console.log("******************************");
    const contentLength = headObjectResponse.ContentLength;
    const contentType = headObjectResponse.ContentType;

    if (!contentLength || !contentType) {
      const error = createHttpError(
        500,
        "Failed to retrieve object metadata from S3",
      );
      throw error;
    }

    console.log(`FileUpload : ${fileUpload}`);
    console.log(`HeadObjectResponse : ${headObjectResponse}`);

    const isFileValidated = fileValidated(
      contentLength,
      contentType,
      fileUpload.file.size,
      fileUpload.file.contentType,
    );

    let updatedFile = null;

    if (fileUpload.file && isFileValidated) {
      updatedFile = await prisma.$transaction(async (tx) => {
        const file = await tx.file.update({
          where: {
            id: fileUpload.file.id,
          },
          data: {
            createdAt: new Date(),
            updatedAt: new Date(),
            status: "ACTIVE",
            FileUpload: {
              update: {
                where: {
                  id: fileUpload.id,
                },
                data: {
                  status: "COMPLETED",
                  ...(completeMultipartUploadResponse.ETag
                    ? {
                      s3ETag: completeMultipartUploadResponse.ETag,
                    }
                    : {}),
                },
              },
            },
          },
          select: {
            id: true,
            name: true,
            size: true,
            contentType: true,
            status: true,
            s3KeyName: true,
            createdAt: true,
            updatedAt: true,
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
    }

    return {
      completeResponse: completeMultipartUploadResponse,
      headObjectResponse,
      updatedFile: updatedFile
        ? {
          ...updatedFile,
          size: updatedFile.size.toString(),
        }
        : null,
    };
  }

  async abortMultipartUpload(uploadId: string, key: string, userId: string) {
      const file = await prisma.file.findFirst({
      where: {
        userId: userId,
        deletedAt: null,
        s3KeyName: key,
        fileUpload: {
          s3UploadId: uploadId,
        }
      },
      select: {
        id: true,
        size: true,
      },
    });

    if (!file) {
      const error = createHttpError(404, "File not found for the given uploadId and key");
      throw error;
    }

    const response = await s3Repository.abortMultipartUpload(uploadId, key);

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

  async checkPartStatus(uploadId: string, partNumber: number, status: string, userId: string) {
  console.log(
    `UploadServices.checkPartStatus: Checking part status for user ${userId}, uploadId ${uploadId}, partNumber ${partNumber}, status ${status}`,
  );

  const fileUpload = await prisma.fileUpload.findFirst({
    where: {
      s3UploadId: uploadId,
      file: { userId, deletedAt: null },
    },
    select: {
      id: true,
      fileId: true,
      file: { select: { id: true, size: true, s3KeyName: true } },
    },
  });

  if (!fileUpload) {
    throw createHttpError(404, "File upload not found");
  }

  await prisma.fileUpload.update({
    where: { id: fileUpload.id },
    data: { updatedAt: new Date() },
  });

  const s3PartList = await s3Repository.listParts(fileUpload.file.s3KeyName, uploadId);
  const parts = s3PartList?.Parts ?? []; // empty is a valid state, not an error

  const part = parts.find((p) => p.PartNumber === partNumber);
  const isVerifiedSuccess = status === "SUCCESS" && !!part && !!part.ETag;

  if (isVerifiedSuccess) {
    await clearPartFailCount({ uploadId, partNumber }); // clear stale counter
    return {
      action: "NONE",
      partNumber,
      message: `Part ${partNumber} has been uploaded successfully.`,
    };
  }

  const attempt = await incrementPartFailCount({ uploadId, partNumber });

  if (attempt > Config.MAX_PART_RETRIES) {
    await this.abortMultipartUpload(uploadId, fileUpload.file.s3KeyName, userId);
    return {
      action: "ABORT",
      partNumber,
      message: `Part ${partNumber} has failed ${attempt} times. The upload has been aborted.`,
    };
  }

  const url = await s3Repository.generatePresignedUrl(uploadId, fileUpload.file.s3KeyName, partNumber);
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
