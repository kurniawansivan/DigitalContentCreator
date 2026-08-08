export type DependencyStatus = "up" | "down";

export interface HealthStatus {
  database: DependencyStatus;
  queue: DependencyStatus;
}

export interface ConnectionChecker {
  checkConnection(): Promise<void>;
}
