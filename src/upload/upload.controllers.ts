import { Logger } from "winston";
import { UploadServices } from "./upload.services";
import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import fs from "fs";
import { PartStatusRouteParams, UploadRouteParams } from "./upload.types";
export class UploadController {
  constructor(
    private uploadServices: UploadServices,
    private logger: Logger,
  ) {}

  uploadFile = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.auth.sub;
    const { fileName, size, contentType, folderId } = req.body;

    if (!folderId) {
      const error = createHttpError(400, "Missing required field");
      this.logger.error(`UploadController.uploadFile: ${error.message}`);
      next(error);
      return;
    }

    if (!fileName || !size || !contentType) {
      const error = createHttpError(
        400,
        "Missing required fields: fileName, size, contentType",
      );
      this.logger.error(`UploadController.uploadFile: ${error.message}`);
      next(error);
      return;
    }

    const response = await this.uploadServices.CreateMultipartUpload(
      { fileName, size: BigInt(size), contentType },
      folderId,
      userId,
    );

    this.logger.info(
      `UploadController.uploadFile: File uploaded successfully for user ${userId} in folder ${folderId}`,
    );

    res.status(200).json({
      message: "File uploaded successfully",
      data: response,
    });
  };

  generatePresignedUrl = async (
    req: Request<UploadRouteParams>,
    res: Response,
    next: NextFunction,
  ) => {
    const userId = req.auth.sub;
    const uploadId = req.params.uploadId;
    const { key, PartNumber } = req.body;

    this.logger.info(
      `UploadController.generatePresignedUrl: Generating presigned URL for user ${userId}, uploadId ${uploadId}, key ${key}, PartNumber ${PartNumber}`,
    );

    if (!uploadId || !key || !PartNumber) {
      const error = createHttpError(
        400,
        "Missing required fields: uploadId, key, PartNumber",
      );
      this.logger.error(
        `UploadController.generatePresignedUrl: ${error.message}`,
      );
      return next(error);
    }

    const preSignedUrl = await this.uploadServices.generatePresignedUrl(
      uploadId,
      key,
      PartNumber,
      userId,
    );
    res.status(200).json({
      message: "Presigned URL generated successfully",
      url: preSignedUrl,
    });
  };

  completeMultipartUpload = async (
    req: Request<UploadRouteParams>,
    res: Response,
    next: NextFunction,
  ) => {
    const userId = req.auth.sub;
    const uploadId = req.params.uploadId;
    const { key, parts } = req.body;
    this.logger.info(
      `UploadController.completeMultipartUpload: Completing multipart upload for user ${userId}, uploadId ${uploadId}, key ${key}, parts ${JSON.stringify(parts)}`,
    );
    if (!uploadId || !key || !parts || !Array.isArray(parts)) {
      const error = createHttpError(
        400,
        "Missing required fields: uploadId, key, parts",
      );
      this.logger.error(
        `UploadController.completeMultipartUpload: ${error.message}`,
      );
      return next(error);
    }

    const response = await this.uploadServices.completeMultipartUpload(
      uploadId,
      key,
      userId,
      parts,
    );

    this.logger.info(
      `UploadController.completeMultipartUpload: Multipart upload completed successfully for user ${userId}`,
    );

    res.status(200).json({
      message: "Multipart upload completed successfully",
      data: response.completeResponse,
      headObjectResponse: response.headObjectResponse,
    });
  };

  abortMultipartUpload = async (
    req: Request<UploadRouteParams>,
    res: Response,
    next: NextFunction,
  ) => {
    const userId = req.auth.sub;
    const uploadId = req.params.uploadId;
    const { key } = req.body;

    if (!uploadId || !key) {
      const error = createHttpError(
        400,
        "Missing required fields: uploadId, key",
      );
      this.logger.error(
        `UploadController.abortMultipartUpload: ${error.message}`,
      );
      return next(error);
    }

    if (!userId) {
      const error = createHttpError(400, "Missing required field: userId");
      this.logger.error(
        `UploadController.abortMultipartUpload: ${error.message}`,
      );
      return next(error);
    }

    const response = await this.uploadServices.abortMultipartUpload(
      uploadId,
      key,
      userId,
    );

    this.logger.info(
      `UploadController.abortMultipartUpload: Multipart upload aborted successfully for user ${userId}`,
    );

    res.status(200).json({
      message: "Multipart upload aborted successfully",
      data: response,
    });
  };

  abortAllStuckUploads = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.auth.sub;
    if (!userId) {
      const error = createHttpError(400, "Missing required field: userId");
      this.logger.error(
        `UploadController.abortAllStuckUploads: ${error.message}`,
      );
      return next(error);
    }

    const response = await this.uploadServices.abortAllStuckUploads(userId);

    this.logger.info(
      `UploadController.abortAllStuckUploads: Aborted all stuck uploads successfully for user ${userId}`,
    );
    
    res.status(200).json({
      message: "Aborted all stuck uploads successfully",
      data: response,
    });
  }

  checkPartStatus = async (req: Request<PartStatusRouteParams>, res: Response, next: NextFunction) => {
    const userId = req.auth.sub;
    const uploadId = req.params.uploadId;
    const status = req.query.status as string;
    const partNumber = parseInt(req.params.partNumber, 10);

    if (!uploadId || !partNumber || !status) {
      const error = createHttpError(
        400,
        "Missing required fields: uploadId, partNumber, status",
      );
      this.logger.error(
        `UploadController.checkPartStatus: ${error.message}`,
      );
      return next(error);
    }

    const response = await this.uploadServices.checkPartStatus(uploadId, partNumber, status, userId);

    this.logger.info(
      `UploadController.checkPartStatus: Checked part status successfully for user ${userId}, uploadId ${uploadId}, partNumber ${partNumber}`,
    );
    
    res.status(200).json({
      message: "Checked part status successfully",
      data: response,
    });
    
  }

  dummyEndpoint = async (req: Request, res: Response, next: NextFunction) => {
    const response = await this.uploadServices.dummyEndpoint();
    res.status(200).json({
      message: "Dummy endpoint reached successfully",
      data: response,
    });
  };


}
