import type { ReactElement } from "react";
import styles from "@/components/HealthStatusCard.module.css";

export default function Loading(): ReactElement {
  return (
    <main>
      <h1>Momenta</h1>
      <div className={styles["card"]} role="status" aria-live="polite">
        <span className={styles["label"]}>Checking status...</span>
      </div>
    </main>
  );
}
