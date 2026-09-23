// infrastructure/sqs/sqs.consumer.ts
import { ReceiveMessageCommand, DeleteMessageCommand, Message } from "@aws-sdk/client-sqs";
import { sqsClient } from "../../config/sqs";
import { Config } from "../../config";
import { dispatch } from "../../workers/dispatcher";

class SQSConsumer {
  private isRunning = false;
  private queueUrl = Config.aws.queueUrl;

  async receiveMessage(): Promise<Message[]> {
    const result = await sqsClient.send(new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: 5,
      WaitTimeSeconds: 20,     // long polling
      VisibilityTimeout: 600,
    }));

    return result.Messages ?? [];
  }

  async deleteMessage(receiptHandle: string): Promise<void> {
    await sqsClient.send(new DeleteMessageCommand({
      QueueUrl: this.queueUrl,
      ReceiptHandle: receiptHandle,
    }));
  }

  async start() {   
    this.isRunning = true;
    console.log("SQS consumer polling started...");

    while (this.isRunning) {
      const messages = await this.receiveMessage();

      for (const message of messages) {
        try {
          console.log("Received message:", message);
          await dispatch(message);              
          if(!message.ReceiptHandle) {
            throw new Error("Message has no ReceiptHandle");
          }
          await this.deleteMessage(message.ReceiptHandle); 
        } catch (err) {
          console.error("Handler failed, leaving message for retry:", err);
        }
      }
    }
  }

  stop() {
    this.isRunning = false;
  }
}

export const sqsConsumer = new SQSConsumer();