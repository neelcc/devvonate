import { AbortMultipartUploadCommand, CompleteMultipartUploadCommand, CreateMultipartUploadCommand, HeadObjectCommand, ListPartsCommand, UploadPartCommand } from "@aws-sdk/client-s3";
import { Config } from "../config";
import { FileData } from "./upload.types";
import { s3Client } from "../config/aws-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

   }

  

export const uploadRepository = new UploadRepository();