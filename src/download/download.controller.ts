import { Logger } from "winston";
import { DownloadServices } from "./download.service";
import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { DownloadRouteParams } from "./download.types";

export class DownloadController {
  constructor(
    private downloadServices: DownloadServices,
    private logger: Logger,
  ) {}

  async downloadFile(
    req: Request<DownloadRouteParams>,
    res: Response,
    next: NextFunction,
  ) {
    const userId = req.auth.sub;
    const fileId = req.params.fileId;

    if (!fileId) {
      const error = createHttpError(400, "Missing required field");
      this.logger.error(`DownloadController.downloadFile: ${error.message}`);
      return next(error);
    }

    if (!userId) {
      const error = createHttpError(400, "Missing required field");
      this.logger.error(`DownloadController.downloadFile: ${error.message}`);
      return next(error);
    }

    const response = await this.downloadServices.downloadFile(fileId, userId);

    res.status(200).json({
      message: "File download initiated successfully",
      fileId: response.fileId,
      fileName: response.fileName,
      fileSize: response.fileSize,
      preSignedUrl: response.preSignedUrl,
    });
  }
}
