import { OUTBOX_EVENT_TYPE } from "../../generated/prisma/enums";

// export enum SQSMessageType {
//     FILE_DELETION = "FILE_DELETION",
//     FILE_BATCH_DELETION = "FILE_BATCH_DELETION"
// }


export interface SQSMessageMetadata {
  messageId: string;
  aggregateId: string;
  triggeredAt: string;
  eventId : string;
}

export interface SQSMessageEnvelope<T = unknown> {
  type: OUTBOX_EVENT_TYPE;
  payload: T;
  metadata: SQSMessageMetadata;
 
}


export interface DeleteFilePayload {
  objectKey: string;
}
[];

export interface UserOnboardingPayload {
  userId: string;
}

export interface FileValidationPayload {
  userId: string;
}

export interface FolderDeletionPayload {
  userId: string;
  folderId: string;
}

export interface DeleteTrashFilePayload {
  objectKey: string;
}