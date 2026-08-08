import { ServiceUnavailableError } from "@/shared/errors/applicationError";
import type { ConnectionChecker, HealthStatus } from "@/modules/health/health.types";

export class HealthService {
  constructor(
    private readonly databaseChecker: ConnectionChecker,
    private readonly queueChecker: ConnectionChecker,
  ) {}

  async getHealthStatus(): Promise<HealthStatus> {
    await this.checkDependency(this.databaseChecker, "Database");
    await this.checkDependency(this.queueChecker, "Queue");
    return { database: "up", queue: "up" };
  }

  private async checkDependency(checker: ConnectionChecker, dependencyName: string): Promise<void> {
    try {
      await checker.checkConnection();
    } catch (error) {
      throw new ServiceUnavailableError(dependencyName, { cause: error });
    }
  }
}
