import { SQSClient } from "@aws-sdk/client-sqs";
import { Config } from ".";


export const sqsClient = new SQSClient({
    region: Config.aws.region,
    credentials: {
        secretAccessKey: Config.aws.secretAccessKey,
        accessKeyId: Config.aws.accessKeyId,
    }
 
})