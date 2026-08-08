import { handleGetHealth } from "@/modules/health/health.controller";
import { createHealthService } from "@/modules/health/health.factory";

const healthService = createHealthService();

export async function GET(): Promise<Response> {
  return await handleGetHealth(healthService);
}
