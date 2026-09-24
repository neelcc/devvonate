import { uploadRepository } from "../../infrastructure/s3/s3.repository";
import { DeleteFilePayload } from "../../infrastructure/sqs/sqs.types";


export async function deleteTrashFile(payload: DeleteFilePayload) {

  const response = await uploadRepository.deleteObject(payload.objectKey);
  console.log("DeleteTrashFile response:", response);

}

export async function deleteAllTrashFile(payload: DeleteFilePayload[]) {
  const keys = payload.map(p => p.objectKey);
  const response = await uploadRepository.deleteMultipleObjects(keys);
  console.log("DeleteAllTrashFile response:", response);
}