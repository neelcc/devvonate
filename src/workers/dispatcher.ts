// workers/dispatcher.ts
import { Message } from "@aws-sdk/client-sqs";
// import { abortStuckUploadsHandler, deleteAllTrashFile, deleteTrashFile } from "./handlers/s3.handler";
import { userOnboardingHandler } from "./handlers/user.handler";

import { folderDeletionHandler } from "./handlers/folders.handler";
import { deleteTrashFile, fileValidationHandler } from "./handlers/file.handler";
import { SQSMessageEnvelope, SQSMessageMetadata } from "../infrastructure/sqs/sqs.types";

type HandlerFn = (payload: any, metadata: SQSMessageMetadata ) => Promise<void>;

const handlers: Record<string, HandlerFn> = {
  FILE_DELETION: deleteTrashFile,
  // FILE_BATCH_DELETION: deleteAllTrashFile,
  USER_ONBOARDING: userOnboardingHandler,
  // ABORT_STUCK_UPLOADS: abortStuckUploadsHandler,
  FOLDER_FILES_DELETION: folderDeletionHandler,
  FILE_VALIDATION: fileValidationHandler, 
};

export async function dispatch(message: Message): Promise<void> {
  if (!message.Body) {
    throw new Error("Message has no body");
  }

  const envelope = JSON.parse(message.Body);
  const { type, payload, metadata } = envelope as SQSMessageEnvelope;
  const handler = handlers[type];
  if (!handler) {
    throw new Error(`No handler registered for message type: ${type}`);
  }

  await handler(payload, metadata);
}
