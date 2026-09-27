// workers/dispatcher.ts
import { Message } from "@aws-sdk/client-sqs";
import { abortStuckUploadsHandler, deleteAllTrashFile, deleteTrashFile } from "./handlers/s3.handler";
import { userOnboardingHandler } from "./handlers/user.handler";

type HandlerFn = (payload: any) => Promise<void>;

const handlers: Record<string, HandlerFn> = {
  FILE_DELETION: deleteTrashFile,
  FILE_BATCH_DELETION: deleteAllTrashFile,
  USER_ONBOARDING: userOnboardingHandler,
  ABORT_STUCK_UPLOADS: abortStuckUploadsHandler,
};

export async function dispatch(message: Message): Promise<void> {
  if (!message.Body) {
    throw new Error("Message has no body");
  }

  const envelope = JSON.parse(message.Body);
  const { type, payload } = envelope;
  const handler = handlers[type];
  if (!handler) {
    throw new Error(`No handler registered for message type: ${type}`);
  }

  await handler(payload);
}
