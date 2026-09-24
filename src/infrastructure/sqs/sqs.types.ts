import { OUTBOX_EVENT_TYPE } from "../../generated/prisma/enums";

// export enum SQSMessageType {
//     FILE_DELETION = "FILE_DELETION",
//     FILE_BATCH_DELETION = "FILE_BATCH_DELETION"
// }

export interface SQSMessageEnvelope<T = unknown> {
  type: OUTBOX_EVENT_TYPE;           
  payload: T;             
  metadata: {
    messageId: string;  
    associatedId?: string;   
    triggeredAt: string;  
  };
}

export interface DeleteFilePayload {
    objectKey: string;     
}[]