import { Logger } from "winston";
import { UploadServices } from "./upload.services";
import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import fs from "fs";
import {  UploadRouteParams } from "./upload.types";
export class UploadController {
    constructor(
        private uploadServices: UploadServices, private logger: Logger
    ) { }   


    uploadFile = async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.auth.sub;
        const { fileName, size, contentType, folderId } = req.body;

        if(!folderId) {
            const error = createHttpError(400, "Missing required field");
            this.logger.error(`UploadController.uploadFile: ${error.message}`);
             next(error);
             return;
        }

        if(!fileName || !size || !contentType) {
            const error = createHttpError(400, "Missing required fields: fileName, size, contentType");
            this.logger.error(`UploadController.uploadFile: ${error.message}`);
             next(error);
                return;
        }
        

        const response = await this.uploadServices.uploadFile({ fileName, size: BigInt(size), contentType }, folderId, userId)

        this.logger.info(`UploadController.uploadFile: File uploaded successfully for user ${userId} in folder ${folderId}`);


        res.status(200).json({
            message: "File uploaded successfully",
            data : response
        })

    }

    generatePresignedUrl = async (req: Request<UploadRouteParams>, res: Response, next: NextFunction) => {
        const userId = req.auth.sub;
        const uploadId = req.params.uploadId;
        const {  key, partNumber } = req.body;

        if (!uploadId || !key || !partNumber) {
            const error = createHttpError(400, "Missing required fields: uploadId, key, partNumber");
            this.logger.error(`UploadController.generatePresignedUrl: ${error.message}`);
            return next(error);
        }

        const preSignedUrl = await this.uploadServices.generatePresignedUrl(uploadId, key, partNumber, userId);
        res.status(200).json({
            message: "Presigned URL generated successfully",
            data: {
                presignedUrl: preSignedUrl
            }
        });
    }

    completeMultipartUpload = async (req: Request, res: Response, next: NextFunction) => {

        const userId = req.auth.sub;
        const { uploadId, key, parts } = req.body;

        if (!uploadId || !key || !parts || !Array.isArray(parts)) {
            const error = createHttpError(400, "Missing required fields: uploadId, key, parts");
            this.logger.error(`UploadController.completeMultipartUpload: ${error.message}`);
            return next(error);
        }

        const response = await this.uploadServices.completeMultipartUpload(uploadId, key, userId, parts);

        this.logger.info(`UploadController.completeMultipartUpload: Multipart upload completed successfully for user ${userId}`);

        res.status(200).json({
            message: "Multipart upload completed successfully",
            data: response.completeResponse,
            headObjectResponse: response.headObjectResponse
        });
    }

    abortMultipartUpload = async (req: Request<UploadRouteParams>, res: Response, next: NextFunction) => {
        const userId = req.auth.sub;
        const uploadId = req.params.uploadId;
        const {  key } = req.body;

        if (!uploadId || !key) {
            const error = createHttpError(400, "Missing required fields: uploadId, key");
            this.logger.error(`UploadController.abortMultipartUpload: ${error.message}`);
            return next(error);
        }

        if (!userId) {
            const error = createHttpError(400, "Missing required field: userId");
            this.logger.error(`UploadController.abortMultipartUpload: ${error.message}`);
            return next(error);
        }

        const response = await this.uploadServices.abortMultipartUpload(uploadId, key, userId);

        this.logger.info(`UploadController.abortMultipartUpload: Multipart upload aborted successfully for user ${userId}`);

        res.status(200).json({
            message: "Multipart upload aborted successfully",
            data: response
        }); 

    }

    dummyEndpoint = async (req: Request, res: Response, next: NextFunction) => {
        const response = await this.uploadServices.dummyEndpoint();
        res.status(200).json({
            message: "Dummy endpoint reached successfully",
            data: response
        });
    }

    
}