import { QueueEvents } from "bullmq";
import { afterAll, describe, expect, it } from "vitest";
import { redisConnection } from "@/shared/queue/redisConnection";
import { enqueueSystemPing, systemPingQueue } from "@/modules/systemPing/systemPing.queue";
import { createSystemPingWorker } from "@/modules/systemPing/systemPing.worker";
import { SYSTEM_PING_QUEUE_NAME } from "@/modules/systemPing/systemPing.types";

const WAIT_UNTIL_FINISHED_TIMEOUT_MS = 5000;

describe("system-ping queue and worker", () => {
  const worker = createSystemPingWorker();
  const queueEvents = new QueueEvents(SYSTEM_PING_QUEUE_NAME, { connection: redisConnection });

  afterAll(async () => {
    await worker.close();
    await queueEvents.close();
    await systemPingQueue.close();
  });

  it("processes a system-ping job through BullMQ and resolves with a workerInstanceId", async () => {
    const jobId = await enqueueSystemPing();
    const job = await systemPingQueue.getJob(jobId);
    if (!job) {
      throw new Error("enqueued job was not found in the queue");
    }

    const result: unknown = await job.waitUntilFinished(
      queueEvents,
      WAIT_UNTIL_FINISHED_TIMEOUT_MS,
    );

    expect(result).toMatchObject({
      respondedAt: expect.any(String),
      workerInstanceId: expect.any(String),
    });
  });
});
