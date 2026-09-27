import createHttpError from "http-errors";
import prisma from "../config/prisma";
import { s3Repository } from "../infrastructure/s3/s3repository";

export class DownloadServices {
  constructor() {}

  downloadFile = async (fileId: string, userId: string) => {
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: userId,
        deletedAt: null,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        size: true,
        s3KeyName: true,
      },
    });

    if (!file) {
      const error = createHttpError(404, "File not found");
      throw error;
    }

    const response = await s3Repository.headObject(file.s3KeyName);

    if (response && Number(response.ContentLength) !== Number(file.size)) {
      const error = createHttpError(500, "File size mismatch");
      throw error;
    }

    const preSignedUrl = await s3Repository.downloadFile(file.s3KeyName);

    return {
      fileId: file.id,
      fileName: file.name,
      fileSize: file.size.toString(),
      preSignedUrl: preSignedUrl,
    };
  };
}
