import { Config } from "../../config";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { s3Client } from "../../config/s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// class DownloadRepository {
//   bucketName: string = Config.aws.bucketName;
//   constructor() {}

//   async downloadFile(key: string, destinationPath: string) {
//     const command = new GetObjectCommand({
//       Bucket: this.bucketName,
//       Key: key,
//       ResponseContentDisposition: `attachment; filename="${"code.jpg"}"`,
//     });

//     try {
//       //   const response = await s3Client.send(command);

//       console.log(
//         `Downloading file ${key} from S3 bucket ${this.bucketName} to ${destinationPath}`,
//       );
//       //   console.log("Response from S3:", response);
//       const preSignedUrl = await getSignedUrl(s3Client, command, {
//         expiresIn: 3600,
//       });
//       console.log(`Presigned URL for downloading file ${key}: ${preSignedUrl}`);

//       // if (!response.Body) {
//       // throw new Error("No response body received from S3");
//       // }
//       // @ts-ignore
//       //  await pipeline(response.Body, createWriteStream(destinationPath));
//       //  console.log(`File downloaded successfully to ${destinationPath}`);
//     } catch (error) {
//       console.error("Error downloading file:", error);
//       throw error;
//     }
//   }

 


// }

// const downloadRepository = new DownloadRepository();
// downloadRepository.downloadFile("code.jpg", "./codes.jpg");
// downloadRepository.previewFile("users/6564ce13-a730-48e2-bb1b-8788e3c41128/objects/b64f7449-34da-4489-bae7-748e9a79bf92/images.png")

// export default downloadRepository;

