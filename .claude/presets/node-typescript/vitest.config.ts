// Install: npm i -D vitest @vitest/coverage-v8
//
// Coverage thresholds are the floor from the testing standard. Never lower them.
// Never add an exclusion to make a number go up - the test auditor treats that as a blocker.

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    setupFiles: ["./src/test/setup.ts"],
    restoreMocks: true,
    clearMocks: true,
    unstubEnvs: true,
    // A test that takes longer than this is waiting on something it should be stubbing.
    testTimeout: 10_000,
    // Fail the run if a test file contains no test, so an empty suite cannot pass silently.
    passWithNoTests: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      all: true,
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.{test,spec}.ts",
        "src/**/*.d.ts",
        "src/**/*.generated.ts",
        "src/test/**",
        "src/main.ts",
      ],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
        // Paths where a gap is a security or money bug. These must stay at 100.
        "src/modules/auth/**/*.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        "src/modules/billing/**/*.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
      },
    },
  },
});
