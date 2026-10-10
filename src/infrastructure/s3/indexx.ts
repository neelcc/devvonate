// import { ListPartsCommand } from "@aws-sdk/client-s3";
// import { Config } from "../../config";
// import { s3Client } from "../../config/s3";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Config } from "../../config";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../../config/s3";

// console.log("Deleting multiple objects from bucket learning-s3-bucket-neel:");

// async function listParts(key: string, uploadId: string) {
//   const params = {
//     Bucket: Config.aws.bucketName,
//     Key: key,
//     UploadId: uploadId,
//     MaxParts: 1000,
//   };

//   const command = new ListPartsCommand(params);
//   const response = await s3Client.send(command);
//   console.log("ListParts response:", response);
//   return response;
// }

// const key="758c7533-47de-4f6f-9751-45e1ea1b481b/First son 1__1790658659839";
// const uploadId="tJns3pFPngCamkgdDl5AWF3ZmZEoBosusQcK0NKf4eMpMZ9lGXGbsh3mNj.h4f6O.88GH6BL6LPWjcG7S1RbqTWRLQa3TCi5ruYqo1N.AZHHOAEREUL8B.ShOx8WLzl2"

// const listPartsResult =  listParts(key, uploadId).then((result) => {
//   console.log("ListParts result:", result);
// }).catch((error) => {
//   console.error("Error listing parts:", error);
// });



 const previewFile = async (key: string) => {
  console.log(`Generating presigned URL for previewing file ${key}`);
    const command = new GetObjectCommand({
      Bucket: Config.aws.bucketName,
      Key: key,
      // ResponseContentType: "image/png",
      ResponseContentDisposition: "inline ",
    });
    
    try {
      const preSignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600,
      });
      console.log(`Presigned URL for previewing file ${key}: ${preSignedUrl}`);
      return preSignedUrl;
    }
    catch (error) {
      console.error("Error generating presigned URL for preview:", error);
      throw error;
    }
  }

  previewFile("users/028ca4cf-b6e0-4999-a87e-5bce8e5cfbc1/objects/758c7533-47de-4f6f-9751-45e1ea1b481b/System Design Interview by Alex Xux")
