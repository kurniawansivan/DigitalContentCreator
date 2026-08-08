import { describe, expect, it, vi } from "vitest";
import { loadEnvironmentConfig } from "@/shared/config/env";

const VALID_DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
const VALID_REDIS_URL = "redis://localhost:6379";
const CUSTOM_PORT = 4000;

describe("loadEnvironmentConfig", () => {
  it("parses valid environment variables into typed configuration", () => {
    vi.stubEnv("DATABASE_URL", VALID_DATABASE_URL);
    vi.stubEnv("REDIS_URL", VALID_REDIS_URL);
    vi.stubEnv("PORT", String(CUSTOM_PORT));
    vi.stubEnv("NODE_ENV", "production");

    expect(loadEnvironmentConfig()).toEqual({
      DATABASE_URL: VALID_DATABASE_URL,
      REDIS_URL: VALID_REDIS_URL,
      PORT: CUSTOM_PORT,
      NODE_ENV: "production",
    });
  });

  it("defaults PORT when it is not set", () => {
    vi.stubEnv("DATABASE_URL", VALID_DATABASE_URL);
    vi.stubEnv("REDIS_URL", VALID_REDIS_URL);

    expect(loadEnvironmentConfig().PORT).toBe(3000);
  });

  it("throws when DATABASE_URL is not a valid URL", () => {
    vi.stubEnv("DATABASE_URL", "not-a-url");
    vi.stubEnv("REDIS_URL", VALID_REDIS_URL);

    expect(() => loadEnvironmentConfig()).toThrow(/Invalid environment configuration/);
  });
});
