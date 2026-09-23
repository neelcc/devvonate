import { uploadRepository } from "../../infrastructure/s3/s3.repository";
import { DeleteFilePayload } from "../../infrastructure/sqs/sqs.types";


export async function deleteTrashFile(payload: DeleteFilePayload) {
  // your S3 DeleteObjects logic goes here
  // if this throws, dispatch() will bubble the error up,
  // and the consumer loop will skip deleteMessage() → message retries

  const response = await uploadRepository.deleteObject(payload.objectKey);
  console.log("DeleteTrashFile response:", response);
  

}

export async function deleteAllTrashFile(payload: DeleteFilePayload[]) {}