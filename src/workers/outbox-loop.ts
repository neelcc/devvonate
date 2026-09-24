// workers/outbox-relay.worker.ts

import { Config } from "../config";
import logger from "../config/logger";
import prisma from "../config/prisma";
import { OUTBOX_EVENT_STATUS } from "../generated/prisma/enums";
import { sqsProducer } from "../infrastructure/sqs/sqs.producer";



async function publishPendingEvents() {
  const pendingEvents = await prisma.outboxEvents.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      eventType: true,
      payload: true,
      aggregateId: true,
    },
    take: Config.BATCH_SIZE,
  });

  for (const event of pendingEvents) {
    try {
      await sqsProducer.sendMessage({
        type: event.eventType,
        payload: event.payload,
        metadata: {
          messageId: event.id,
          associatedId: event.aggregateId,
          triggeredAt: new Date().toISOString(),
        }
      });

      await prisma.outboxEvents.update({
        where: { id: event.id },
        data: {
          status: OUTBOX_EVENT_STATUS.PROCESSED,
          processedAt: new Date(),
        },
      });

      logger.info(`Published event ${event.id} (${event.eventType})`);
    } catch (err) {
      logger.error(`Failed to publish event ${event.id}:`, err);
    }
  }
}

export async function startOutboxRelay() {
  logger.info("Outbox relay worker started...");
  while (true) {
    try {
      await publishPendingEvents();
    } catch (err) {
      logger.error("Relay loop error:", err);
    }
    await new Promise((r) => setTimeout(r, Config.POLL_INTERVAL_MS));
  }
}