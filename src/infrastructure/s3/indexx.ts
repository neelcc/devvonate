import { ListPartsCommand } from "@aws-sdk/client-s3";
import { Config } from "../../config";
import { s3Client } from "../../config/s3";

console.log("Deleting multiple objects from bucket learning-s3-bucket-neel:");

async function listParts(key: string, uploadId: string) {
  const params = {
    Bucket: Config.aws.bucketName,
    Key: key,
    UploadId: uploadId,
    MaxParts: 1000,
  };

  const command = new ListPartsCommand(params);
  const response = await s3Client.send(command);
  console.log("ListParts response:", response);
  return response;
}

const key="758c7533-47de-4f6f-9751-45e1ea1b481b/First son 1__1790599963762";
const uploadId="7Aj2Nbxla5jVYZhlGlIbs6Umgk1pl5cTjBqSWyPdiLOWJiXJ_DJaw61nPsNgxn0pUJKZ97jBHa4Oc9PADpBzZ0nvXRSY9zqshB16uCGjbqGpIbHFf3GVXLWJrvbOKcy4"

const listPartsResult =  listParts(key, uploadId).then((result) => {
  console.log("ListParts result:", result);
}).catch((error) => {
  console.error("Error listing parts:", error);
});


// ListParts response: {
//   Bucket: 'learning-s3-bucket-neel',
//   Key: '758c7533-47de-4f6f-9751-45e1ea1b481b/First son 1__1790599963762',
//   UploadId: '7Aj2Nbxla5jVYZhlGlIbs6Umgk1pl5cTjBqSWyPdiLOWJiXJ_DJaw61nPsNgxn0pUJKZ97jBHa4Oc9PADpBzZ0nvXRSY9zqshB16uCGjbqGpIbHFf3GVXLWJrvbOKcy4',
//   PartNumberMarker: '0',
//   NextPartNumberMarker: '0',
//   MaxParts: 1000,
//   IsTruncated: false,
//   Initiator: {
//     ID: 'arn:aws:iam::030606694351:user/neelcc',
//     DisplayName: 'neelcc'
//   },
//   Owner: {
//     ID: '5a1a30dd62407269a4fc391eef8d406454820c3d2c04e341cc448a992215192b'
//   },
//   StorageClass: 'STANDARD',
//   '$metadata': {
//     httpStatusCode: 200,
//     requestId: 'EYK700ZTJPPS1CFQ',
//     extendedRequestId: 'gW6T3oU3lD9wRMqlW0A/qNLcyaWFX3kkhD/W+gV63AQqHKorZRa5zFgp8mi+lTEECLsXPHrbmr6yOApBa7ZO7byGdIOp+x6E',
//     cfId: undefined,
//     attempts: 1,
//     totalRetryDelay: 0
//   }
// }