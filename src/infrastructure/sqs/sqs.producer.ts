import { S3Client } from "@aws-sdk/client-s3";
import { Config } from "../../config";
import { DeleteFilePayload, SQSMessageEnvelope, SQSMessageType } from "./sqs.types";
import { sqsClient } from "../../config/sqs";
import { SendMessageCommand } from "@aws-sdk/client-sqs";

class SQSProducer {

    s3BucketName: string = Config.aws.bucketName;
    queueName: string = Config.aws.queueName;

    constructor() {}


    async sendMessage(message: SQSMessageEnvelope) {

        console.log("Sending message to SQS:", message);
        const command = new SendMessageCommand({
            MessageBody: JSON.stringify(message),
            QueueUrl: Config.aws.queueUrl,
            DelaySeconds: 5,
        })

        const response = await sqsClient.send(command)

        console.log("Message sent to SQS:", response);

        return response;
    }   

    // async deleteS3Object(deleteFilePayload: DeleteFilePayload) {
    //     return this.sendMessage(
    //         {
    //             type: SQSMessageType.FILE_DELETION,
    //             payload: {
    //                 bucketName: this.s3BucketName,
    //                 objectKey: deleteFilePayload.objectKey
    //             },
    //         metadata: {
    //             messageId: deleteFilePayload.messageId,
    //             userId: deleteFilePayload.userId,
    //             triggeredAt: new Date().toISOString(),
    //         }
    //         }, 
    //     )
    // }

}

export const sqsProducer = new SQSProducer();