import { AbortMultipartUploadCommand, CompleteMultipartUploadCommand, CreateMultipartUploadCommand, DeleteObjectCommand, DeleteObjectsCommand, HeadObjectCommand, ListPartsCommand, UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Config } from "../../config";
import { FileData } from "../../upload/upload.types";
import { s3Client } from "../../config/s3";
import logger from "../../config/logger";
class UploadRepository {
    
    bucketName: string = Config.aws.bucketName;

    constructor() {
    }

   async uploadFile(fileData: FileData, key: string, partSize: bigint) {
        const command = new CreateMultipartUploadCommand({
            Bucket: this.bucketName,
            Key: key,
            ContentType : fileData.contentType,
        })
        const response = await s3Client.send(command);
        console.log("Multipart upload initiated:", response.UploadId);
        return response;
    }

    async generatePresignedUrl(uploadId: string, key: string, partNumber: number) {
        const command = new UploadPartCommand({
            Bucket: this.bucketName,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber,
        });
        const preSignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        
        return preSignedUrl;
    }

    async completeMultipartUpload(uploadId: string, key: string, parts: { ETag: string; PartNumber: number }[]) {
        console.log(`Completing multipart upload for key ${key} with uploadId ${uploadId} and parts:`, parts);
        const command = new CompleteMultipartUploadCommand({
            Bucket : this.bucketName,
            Key : key,
            UploadId : uploadId,
            MultipartUpload : {
                Parts : parts
            }
        })
        const completeMultipartUploadResponse = await s3Client.send(command);

        return completeMultipartUploadResponse;
        
    }

    async headObject(key: string) {
        const command = new HeadObjectCommand({
            Bucket: this.bucketName,
            Key: key,

        })
        const response = await s3Client.send(command);
        console.log("HeadObject response:", response);
        return response;
    }

    async abortMultipartUpload(uploadId: string, key: string) {
        const command = new AbortMultipartUploadCommand({
            Bucket: this.bucketName,
            Key: key,
            UploadId: uploadId,
        })
        const response = await s3Client.send(command);
        console.log("AbortMultipartUpload response:", response);
        return response;
    }

    async listParts(key: string, uploadId: string) {
        const params = {
            Bucket: this.bucketName,
            Key: key,
            UploadId: uploadId,
            MaxParts: 1000,
        }

        const command = new ListPartsCommand(params);
        const response = await s3Client.send(command);
        console.log("ListParts response:", response);
        return response;

    }

    async deleteObject(key: string) {
        const command = new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        })
        const response = await s3Client.send(command);
        console.log("DeleteObject response:", response);
        return response;
    }

    async deleteMultipleObjects(keys: string[]) {
        const objects = keys.map(key => ({ Key: key }))

        logger.info(`Deleting multiple objects from bucket ${this.bucketName}:`, objects);

        const command = new DeleteObjectsCommand({
            Bucket: this.bucketName,
            Delete: {
                Objects: objects,
                Quiet: false,
            },
        })
       try {
        const {Deleted, Errors} = await s3Client.send(command);

       logger.info(`Deleted ${Deleted?.length || 0} objects successfully.`);

       
    if (Errors && Errors.length > 0) {
      logger.error(`${Errors.length} errors occurred during deletion:`, Errors);
    }
  }     catch (err) {
        logger.error("Critical error executing delete operation:", err);
  }
    }

   }

  

export const uploadRepository = new UploadRepository();


