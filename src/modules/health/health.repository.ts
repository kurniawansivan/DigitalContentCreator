import { prismaClient } from "@/shared/database/prismaClient";
import type { ConnectionChecker } from "@/modules/health/health.types";

export class HealthRepository implements ConnectionChecker {
  async checkConnection(): Promise<void> {
    await prismaClient.systemHealthCheck.create({ data: {} });
  }
}
