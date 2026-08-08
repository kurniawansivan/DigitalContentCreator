import { describe, expect, it } from "vitest";
import { withTimeout } from "@/shared/async/withTimeout";

const SHORT_TIMEOUT_MS = 20;
const NEVER_RESOLVES_MS = 100_000;

function neverResolves<TValue>(): Promise<TValue> {
  return new Promise<TValue>(() => {
    // Intentionally never settles - simulates a hung dependency call.
  });
}

function delay<TValue>(value: TValue, delayMs: number): Promise<TValue> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(value);
    }, delayMs);
  });
}

describe("withTimeout", () => {
  it("resolves with the value when the promise settles before the timeout", async () => {
    const result = withTimeout(Promise.resolve("done"), SHORT_TIMEOUT_MS, "timed out");

    await expect(result).resolves.toBe("done");
  });

  it("rejects with the original error when the promise rejects before the timeout", async () => {
    const result = withTimeout(
      Promise.reject(new Error("original failure")),
      SHORT_TIMEOUT_MS,
      "timed out",
    );

    await expect(result).rejects.toThrow("original failure");
  });

  it("rejects with the timeout message when the promise never settles in time", async () => {
    const result = withTimeout(neverResolves(), SHORT_TIMEOUT_MS, "dependency timed out");

    await expect(result).rejects.toThrow("dependency timed out");
  });

  it("does not fire the timeout once the promise has already resolved", async () => {
    const result = withTimeout(delay("value", 1), NEVER_RESOLVES_MS, "should not happen");

    await expect(result).resolves.toBe("value");
  });
});
