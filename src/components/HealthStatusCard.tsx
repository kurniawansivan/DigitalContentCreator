import type { ReactElement } from "react";
import styles from "@/components/HealthStatusCard.module.css";
import type { DependencyStatus } from "@/modules/health/health.types";

export interface HealthStatusCardProps {
  readonly database: DependencyStatus;
}

export function HealthStatusCard({ database }: HealthStatusCardProps): ReactElement {
  return (
    <div className={styles["card"]} role="status">
      <span className={styles["indicator"]} data-status={database} aria-hidden="true" />
      <span className={styles["label"]}>Database: {database}</span>
    </div>
  );
}
