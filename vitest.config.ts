// Unit tests only. Integration tests (real Postgres/Redis) live behind
// `npm run test:integration`, configured in vitest.integration.config.ts.
//
// Component tests (*.test.tsx) need the jsdom environment: add a
// `// @vitest-environment jsdom` docblock as the first line of the file - the default
// environment below stays "node" for plain unit tests.
//
// Coverage thresholds are the floor from the testing standard. Never lower them.
// Never add an exclusion to make a number go up - the test auditor treats that as a blocker.

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const COMPONENT_TEST_FILE_PATTERN = "src/**/*.test.tsx";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    globals: false,
    environment: "node",
    // The environment-config module validates and freezes its singleton at import
    // time (fail fast at real startup). These dummy values just let that singleton
    // build successfully under test; env.test.ts overrides them with vi.stubEnv to
    // exercise the validation logic itself.
    env: {
      DATABASE_URL: "postgresql://user:pass@localhost:5432/test",
      REDIS_URL: "redis://localhost:6379",
    },
    include: ["src/**/*.{test,spec}.ts", COMPONENT_TEST_FILE_PATTERN],
    exclude: ["src/**/*.integration.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
    restoreMocks: true,
    clearMocks: true,
    unstubEnvs: true,
    testTimeout: 10_000,
    passWithNoTests: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.ts",
        COMPONENT_TEST_FILE_PATTERN,
        "src/**/*.integration.test.ts",
        "src/**/*.d.ts",
        "src/**/*.generated.ts",
        "src/generated/**",
        "src/test/**",
        "src/worker.ts",
        // Route handlers and layout are pure wiring/config, proven by integration tests
        // instead - unlike page.tsx (has its own logic, unit-tested directly) and
        // loading.tsx, neither is blanket-excluded.
        "src/app/**/route.ts",
        "src/app/layout.tsx",
        // Repositories are proven by integration tests (real DB/HTTP), not unit tests -
        // see testing-standard's test-level table. Controllers moved out of this list
        // once health.controller.ts grew real per-dependency error-building logic worth
        // unit-testing directly (health.controller.test.ts) - a controller that stays
        // pure wiring can go back in. Queue/worker-factory and other pure wiring files
        // are exercised by integration tests or by hand for the same reason
        // `src/main.ts`-style entrypoints normally are.
        "src/modules/*/*.repository.ts",
        "src/modules/*/*.queue.ts",
        "src/modules/*/*.worker.ts",
        "src/modules/*/*.factory.ts",
        "src/modules/*/*.redisConnectionChecker.ts",
        "src/shared/database/**",
        "src/shared/queue/**",
        "src/shared/logging/**",
      ],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
});
