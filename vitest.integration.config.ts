// Integration tests: real HTTP-adjacent route handlers, real Postgres, real Redis.
// Requires `docker compose up postgres redis -d` (or the full stack) running first,
// with DATABASE_URL / REDIS_URL pointed at them.

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
  },
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
    restoreMocks: true,
    clearMocks: true,
    unstubEnvs: true,
    // Real network calls to Postgres/Redis are slower than the unit test budget.
    testTimeout: 20_000,
    passWithNoTests: false,
    // Integration tests hit shared external state (the database); running them one at a
    // time avoids two tests racing on the same rows.
    fileParallelism: false,
  },
});
