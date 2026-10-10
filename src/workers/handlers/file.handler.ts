import { fileTypeFromTokenizer } from "file-type";
import { Config } from "../../config";
import prisma from "../../config/prisma";
import { s3Client } from "../../config/s3";
import { DeleteTrashFilePayload, FileValidationPayload, SQSMessageMetadata } from "../../infrastructure/sqs/sqs.types";
import {makeChunkedTokenizerFromS3} from '@tokenizer/s3';
import { s3Repository } from "../../infrastructure/s3/s3repository";

export async function fileValidationHandler(payload: FileValidationPayload, metadata: SQSMessageMetadata) {
    const { userId } = payload;
    const { aggregateId, eventId } = metadata;

    console.log("*****************************************************")
    console.log(`Starting file validation for userId: ${userId},  fileId: ${aggregateId}`);
    try {
        
        const file = await prisma.file.findUnique({
            where: {
                id: aggregateId,
                userId: userId,
            },
            select: {
                blobId: true,
                blob : {
                    select: {
                        s3KeyName: true,
                        contentType: true
                        
                    }
                }
            }
        })

        console.log(`File fetched for validation:`, file);

        if(!file || !file.blob) {
            console.error(`File or blob not found for validation. userId: ${userId}, fileId: ${aggregateId}`);
            return;
        }


        const s3Tokenizer = await makeChunkedTokenizerFromS3(s3Client, {
	            Bucket: Config.aws.bucketName,
	            Key: file.blob.s3KeyName,
            });

        const fileType = await fileTypeFromTokenizer(s3Tokenizer);    

        console.log(`fileType detected for blobId ${file.blobId}:`, fileType);

        if(!fileType || fileType.mime !== file.blob.contentType) {
            console.error(`File validation failed for blobId: ${file.blobId}. Expected MIME type: ${file.blob.contentType}, Detected MIME type: ${fileType?.mime}`);

           await prisma.$transaction(async (tx) => {
            
            await prisma.file.update({
                where: {
                    id: aggregateId,
                    userId: userId,
                    blobId: file.blobId
                },
                data: {
                    status: "INVALID",
                    blob: {
                        update: {
                            status: "INVALID",
                            refCount: {
                                increment: 1
                            }
                        }
                    }
                } 
            })

            await prisma.outboxEvents.update({
                where: {
                    id: eventId
                },
                data: {
                    status: "PROCESSED",
                    processedAt: new Date(),
                }
            })

           })
           return
        }

        await prisma.$transaction(async (tx) => {
            await prisma.file.update({
                where: {
                    userId: userId,
                    blobId: file.blobId,
                    id: aggregateId
                },
                data: {
                    status: "ACTIVE",
                    contentType: fileType.mime,
                    blob: {
                        update: {
                            status: "ACTIVE",
                            refCount: {
                                increment: 1
                            }
                        }
                    }
                } 
            })

            await prisma.outboxEvents.update({
                where: {
                    id: eventId
                },
                data: {
                    status: "PROCESSED",
                    processedAt: new Date(),
                }
            })

        })
         
        console.log("*****************************************************")

    } catch (error) {
        console.error(`Error during file validation for userId: ${userId}, fileId: ${aggregateId}`, error);
    }


}

export async function deleteTrashFile(payload: DeleteTrashFilePayload, metadata: SQSMessageMetadata) {
    const { objectKey } = payload;
    const { aggregateId, eventId } = metadata;

    try {
        
        await s3Repository.deleteObject(objectKey);

        


    } catch (error) {
        
    }

}




// fileValidationHandler({ userId: "6564ce13-a730-48e2-bb1b-8788e3c41128", fileId: "3e2471b8-72e5-44a5-a774-f4e186e85323" });

