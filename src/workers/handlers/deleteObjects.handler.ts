import { s3Repository } from "../../infrastructure/s3/s3repository";
import { DeleteFilePayload } from "../../infrastructure/sqs/sqs.types";


export async function deleteTrashFile(payload: DeleteFilePayload) {

  const response = await s3Repository.deleteObject(payload.objectKey);
  console.log("DeleteTrashFile response:", response);

}

export async function deleteAllTrashFile(payload: DeleteFilePayload[]) {
  const keys = payload.map(p => p.objectKey);
  const response = await s3Repository.deleteMultipleObjects(keys);
  console.log("DeleteAllTrashFile response:", response);
}