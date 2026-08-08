/**
 * Races a promise against a timeout. Health checks in particular must never hang: a
 * shared ioredis connection configured with `maxRetriesPerRequest: null` (required by
 * BullMQ) queues commands forever instead of failing when Redis is unreachable, so
 * without this, a dependency outage would hang the request rather than reporting it.
 *
 * The underlying operation is not cancelled - it may still settle later, in the
 * background - only the caller stops waiting for it.
 */
export function withTimeout<TValue>(
  promise: Promise<TValue>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<TValue> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error("Unknown rejection", { cause: error }));
      },
    );
  });
}
