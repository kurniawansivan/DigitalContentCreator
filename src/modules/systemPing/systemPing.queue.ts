import { Queue } from "bullmq";
import { redisConnection } from "@/shared/queue/redisConnection";
import {
  SYSTEM_PING_QUEUE_NAME,
  type SystemPingPayload,
  type SystemPingResult,
} from "@/modules/systemPing/systemPing.types";

export const systemPingQueue = new Queue<SystemPingPayload, SystemPingResult>(
  SYSTEM_PING_QUEUE_NAME,
  { connection: redisConnection },
);

export async function enqueueSystemPing(): Promise<string> {
  const job = await systemPingQueue.add("ping", { requestedAt: new Date().toISOString() });
  if (!job.id) {
    throw new Error("BullMQ did not assign a job id");
  }
  return job.id;
}
