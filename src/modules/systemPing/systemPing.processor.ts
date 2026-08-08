import type { SystemPingPayload, SystemPingResult } from "@/modules/systemPing/systemPing.types";

/**
 * Idempotent by construction: it has no side effect beyond echoing a timestamp, so
 * BullMQ's at-least-once delivery can never cause it to double-apply anything.
 */
export function processSystemPing(
  _payload: SystemPingPayload,
  workerInstanceId: string,
): SystemPingResult {
  return {
    respondedAt: new Date().toISOString(),
    workerInstanceId,
  };
}
