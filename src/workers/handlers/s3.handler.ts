// DEPRICIATED: This file is no longer in use. The S3 deletion logic has been moved to the s3.repository.ts file. The functions here are kept for reference but are not used in the current implementation.

// import { s3Repository } from "../../infrastructure/s3/s3repository";
// import { DeleteFilePayload } from "../../infrastructure/sqs/sqs.types";

// export async function deleteTrashFile(payload: DeleteFilePayload) {
//   const response = await s3Repository.deleteObject(payload.objectKey);
//   console.log("DeleteTrashFile response:", response);
// }

// export async function deleteAllTrashFile(payload: string) {

//   const parsedPayload = JSON.parse(payload);

//   const { fileIds } = parsedPayload;

//     if (!Array.isArray(fileIds)) {
//     throw new Error("Invalid payload: fileIds must be an array");
//   }

//   console.log("DeleteAllTrashFile payload:", typeof payload);
//   console.log("DeleteAllTrashFile payload length:", payload.length);
//   console.log("DeleteAllTrashFile payload first item:", parsedPayload[0]);
//   // const keys = payload.map((p) => p.objectKey);
//   // const response = await s3Repository.deleteMultipleObjects(keys);
//   // console.log("DeleteAllTrashFile response:", response);
// }

// export async function abortStuckUploadsHandler(payload: any) {
  
// }