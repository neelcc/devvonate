export enum SQSMessageType {
    FILE_DELETION = "FILE_DELETION",
    FILE_BATCH_DELETION = "FILE_BATCH_DELETION"
}

export interface SQSMessageEnvelope<T = unknown> {
  type: SQSMessageType;           
  payload: T;             
  metadata: {
    messageId: string;     
    triggeredAt: string;  
  };
}

export interface DeleteFilePayload {
    objectKey: string;     
    messageId: string;     
    userId: string;        
}[]