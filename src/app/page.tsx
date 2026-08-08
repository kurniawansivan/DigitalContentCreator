import type { ReactElement } from "react";
import { HealthStatusCard } from "@/components/HealthStatusCard";
import { createHealthService } from "@/modules/health/health.factory";
import type { HealthService } from "@/modules/health/health.service";
import type { DependencyStatus } from "@/modules/health/health.types";

// Without this, Next statically pre-renders the page once at build time and bakes that
// one-time database/queue status into the HTML forever - defeating the entire point of
// a live health check.
export const dynamic = "force-dynamic";

const healthService = createHealthService();

/**
 * `HealthService.getHealthStatus()` checks the database and the queue independently and
 * never throws for either being down (see health.service.ts) - so `status.database` is
 * accurate on its own, regardless of the queue's state. The catch here is only for a
 * genuinely unexpected failure (a bug, not an expected "dependency is down" outcome).
 */
export async function getDatabaseStatus(healthService: HealthService): Promise<DependencyStatus> {
  try {
    const status = await healthService.getHealthStatus();
    return status.database;
  } catch {
    return "down";
  }
}

export default async function Home(): Promise<ReactElement> {
  const database = await getDatabaseStatus(healthService);

  return (
    <main>
      <h1>Momenta</h1>
      <HealthStatusCard database={database} />
    </main>
  );
}
