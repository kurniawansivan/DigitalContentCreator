import { withTimeout } from "@/shared/async/withTimeout";
import { logger } from "@/shared/logging/logger";
import type {
  ConnectionChecker,
  DependencyStatus,
  HealthStatus,
} from "@/modules/health/health.types";

const DEFAULT_DEPENDENCY_CHECK_TIMEOUT_MS = 2000;

export class HealthService {
  constructor(
    private readonly databaseChecker: ConnectionChecker,
    private readonly queueChecker: ConnectionChecker,
    private readonly dependencyCheckTimeoutMs: number = DEFAULT_DEPENDENCY_CHECK_TIMEOUT_MS,
  ) {}

  /**
   * Never rejects: an unreachable or slow dependency resolves to "down" for that
   * dependency specifically, so a caller always learns which one is actually failing
   * instead of one failure masking the other.
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const [database, queue] = await Promise.all([
      this.checkDependency(this.databaseChecker, "database"),
      this.checkDependency(this.queueChecker, "queue"),
    ]);
    return { database, queue };
  }

  private async checkDependency(
    checker: ConnectionChecker,
    dependencyName: string,
  ): Promise<DependencyStatus> {
    try {
      await withTimeout(
        checker.checkConnection(),
        this.dependencyCheckTimeoutMs,
        `${dependencyName} check timed out`,
      );
      return "up";
    } catch (error) {
      logger.warn({ dependencyName, error }, "dependency check failed");
      return "down";
    }
  }
}
