// workers/outbox-relay.worker.ts

import prisma from "../config/prisma";
import { OUTBOX_EVENT_STATUS } from "../generated/prisma/enums";
import { sqsProducer } from "../infrastructure/sqs/sqs.producer";

const POLL_INTERVAL_MS = 3000;
const BATCH_SIZE = 10;

async function publishPendingEvents() {
  const pendingEvents = await prisma.outboxEvents.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });

  for (const event of pendingEvents) {
    try {
      await sqsProducer.sendMessage({
        type: event.eventType,
        payload: event.payload,
        metadata: {
          messageId: event.id,
          triggeredAt: new Date().toISOString(),
        }
      });

      await prisma.outboxEvents.update({
        where: { id: event.id },
        data: { status: OUTBOX_EVENT_STATUS.PROCESSED, publishedAt: new Date() },
      });

      console.log(`Published event ${event.id} (${event.eventType})`);
    } catch (err) {
      console.error(`Failed to publish event ${event.id}:`, err);
      // left as PENDING, retried next poll
    }
  }
}

export async function startOutboxRelay() {
  console.log("Outbox relay worker started...");
  while (true) {
    try {
      await publishPendingEvents();
    } catch (err) {
      console.error("Relay loop error:", err);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}