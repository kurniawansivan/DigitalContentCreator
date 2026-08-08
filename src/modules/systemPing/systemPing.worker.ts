import { randomUUID } from "node:crypto";
import { Worker } from "bullmq";
import { redisConnection } from "@/shared/queue/redisConnection";
import { processSystemPing } from "@/modules/systemPing/systemPing.processor";
import {
  SYSTEM_PING_QUEUE_NAME,
  type SystemPingPayload,
  type SystemPingResult,
} from "@/modules/systemPing/systemPing.types";

const workerInstanceId = randomUUID();

export function createSystemPingWorker(): Worker<SystemPingPayload, SystemPingResult> {
  return new Worker<SystemPingPayload, SystemPingResult>(
    SYSTEM_PING_QUEUE_NAME,
    (job) => Promise.resolve(processSystemPing(job.data, workerInstanceId)),
    { connection: redisConnection },
  );
}
