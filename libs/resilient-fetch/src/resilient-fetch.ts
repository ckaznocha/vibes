import PQueue from "p-queue";

import {
  buildPolicy,
  type ResilienceOptions,
  type ThrottleOptions,
} from "./policy.ts";

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export interface ResilientFetchOptions extends ResilienceOptions {
  /**
   * Underlying fetch implementation to wrap. Defaults to the global `fetch`.
   */
  fetchImpl?: typeof fetch;
  /**
   * Additionally treat these HTTP statuses as transient. Merged with the built-in set.
   */
  retryableStatuses?: Iterable<number>;
  throttle?: ThrottleOptions;
}

/**
 * Wraps `fetch` (or a given `fetchImpl`) with retry-with-backoff, a circuit
 * breaker, a per-attempt timeout, and concurrency/rate throttling.
 *
 * Preserves the `typeof fetch` contract: a persistent transient HTTP status
 * (429/5xx) is returned as the final `Response`, not thrown, exactly like a
 * bare `fetch()` call — existing `!response.ok` handling keeps working
 * unchanged. Network failures and per-attempt timeouts still throw once
 * retries are exhausted.
 */
export function createResilientFetch(
  options: ResilientFetchOptions = {},
): typeof fetch {
  const fetchImpl = options.fetchImpl ?? fetch;
  const retryableStatuses = new Set([
    ...RETRYABLE_STATUSES,
    ...(options.retryableStatuses ?? []),
  ]);

  const policy = buildPolicy(
    options,
    (result) =>
      result instanceof Response && retryableStatuses.has(result.status),
  );

  const queue = new PQueue({
    concurrency: options.throttle?.concurrency ?? 4,
    ...(options.throttle?.intervalCap !== undefined && {
      interval: options.throttle.intervalMs ?? 1000,
      intervalCap: options.throttle.intervalCap,
      strict: true,
    }),
  });

  return async function resilientFetch(
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ): Promise<Response> {
    return queue.add(() => policy.execute(() => fetchImpl(input, init)));
  };
}
