import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { processSystemPing } from "@/modules/systemPing/systemPing.processor";

const FROZEN_TIME = new Date("2026-01-01T00:00:00.000Z");

describe("processSystemPing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("echoes the current time and the given worker instance id", () => {
    const result = processSystemPing({ requestedAt: "2025-12-31T23:59:59.000Z" }, "worker-1");

    expect(result).toEqual({
      respondedAt: FROZEN_TIME.toISOString(),
      workerInstanceId: "worker-1",
    });
  });

  it("produces the same result when the same payload is processed twice", () => {
    const payload = { requestedAt: "2025-12-31T23:59:59.000Z" };

    const first = processSystemPing(payload, "worker-1");
    const second = processSystemPing(payload, "worker-1");

    expect(first).toEqual(second);
  });
});
