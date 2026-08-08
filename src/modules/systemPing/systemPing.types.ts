export const SYSTEM_PING_QUEUE_NAME = "system-ping";

export interface SystemPingPayload {
  requestedAt: string;
}

export interface SystemPingResult {
  respondedAt: string;
  workerInstanceId: string;
}
