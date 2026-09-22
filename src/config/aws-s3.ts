import { S3Client } from "@aws-sdk/client-s3";
import { Config } from ".";

export  const s3Client = new S3Client({
  region: Config.aws.region,
  credentials: {
    accessKeyId: Config.aws.accessKeyId,
    secretAccessKey: Config.aws.secretAccessKey,
  },
});

