import { createSystemPingWorker } from "@/modules/systemPing/systemPing.worker";
import { redisConnection } from "@/shared/queue/redisConnection";
import { logger } from "@/shared/logging/logger";

const worker = createSystemPingWorker();

worker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "system-ping job completed");
});

worker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, error }, "system-ping job failed");
});

// No explicit process.exit(): closing the worker and the shared Redis connection
// releases every open handle, so Node exits naturally once the event loop is empty.
async function shutDown(): Promise<void> {
  logger.info("worker shutting down");
  await worker.close();
  redisConnection.disconnect();
}

process.on("SIGTERM", () => {
  shutDown().catch((error: unknown) => {
    logger.error({ error }, "error during worker shutdown");
  });
});
process.on("SIGINT", () => {
  shutDown().catch((error: unknown) => {
    logger.error({ error }, "error during worker shutdown");
  });
});

logger.info("worker started, listening on the system-ping queue");
