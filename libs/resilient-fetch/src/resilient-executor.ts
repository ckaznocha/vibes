import PQueue from "p-queue";

import {
  buildPolicy,
  type ResilienceOptions,
  type ThrottleOptions,
} from "./policy.ts";

export interface ResilientExecutorOptions extends ResilienceOptions {
  throttle?: ThrottleOptions;
}

/**
 * Builds a generic resilient executor for arbitrary async calls (e.g. an SDK
 * client method that doesn't expose a `fetch` injection point) with retry-
 * with-backoff, a circuit breaker, a per-attempt timeout, and concurrency/rate
 * throttling.
 *
 * Unlike {@link createResilientFetch}, this has no notion of an HTTP response,
 * so only thrown errors classified by `isRetryableError` are treated as
 * transient; the wrapped call always rejects (rather than resolving with a
 * failure value) once retries are exhausted.
 */
export function createResilientExecutor(
  options: ResilientExecutorOptions = {},
): <T>(function_: () => Promise<T>) => Promise<T> {
  const policy = buildPolicy(options);

  const queue = new PQueue({
    concurrency: options.throttle?.concurrency ?? 4,
    ...(options.throttle?.intervalCap !== undefined && {
      interval: options.throttle.intervalMs ?? 1000,
      intervalCap: options.throttle.intervalCap,
      strict: true,
    }),
  });

  return function execute<T>(function_: () => Promise<T>): Promise<T> {
    return queue.add(() => policy.execute(function_));
  };
}
