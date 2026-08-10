import {
  circuitBreaker,
  ConsecutiveBreaker,
  ExponentialBackoff,
  handleWhen,
  type IPolicy,
  retry,
  timeout,
  TimeoutStrategy,
  wrap,
} from "cockatiel";

export interface CircuitBreakerOptions {
  /**
   * Consecutive matching failures before the circuit opens. Defaults to 5.
   */
  consecutiveFailures?: number;
  /**
   * How long to wait before probing a half-open circuit again. Defaults to 30_000.
   */
  halfOpenAfterMs?: number;
}

export interface ResilienceOptions {
  circuitBreaker?: CircuitBreakerOptions;
  /**
   * Classifies a thrown error (network failure, timeout, ...) as transient
   * and therefore worth retrying / counting toward the circuit breaker.
   * Defaults to treating `fetch`'s network TypeError and cockatiel's own
   * timeout error as transient.
   */
  isRetryableError?: (error: unknown) => boolean;
  retry?: RetryOptions;
  /**
   * Per-attempt timeout in milliseconds. Defaults to 15_000.
   */
  timeoutMs?: number;
}

export interface RetryOptions {
  /**
   * Initial backoff delay in milliseconds. Defaults to 250.
   */
  initialDelayMs?: number;
  /**
   * Maximum number of attempts, including the first. Defaults to 3.
   */
  maxAttempts?: number;
  /**
   * Maximum backoff delay in milliseconds. Defaults to 10_000.
   */
  maxDelayMs?: number;
}

export interface ThrottleOptions {
  /**
   * Maximum concurrent in-flight calls. Defaults to 4.
   */
  concurrency?: number;
  /**
   * Maximum calls allowed within `intervalMs`. Unset means unbounded.
   */
  intervalCap?: number;
  /**
   * Window, in milliseconds, that `intervalCap` applies to. Defaults to 1000.
   */
  intervalMs?: number;
}

/**
 * Builds a retry + circuit-breaker + timeout policy. `isRetryableResult`, when
 * given, additionally classifies *returned* values (e.g. a `Response` with a
 * 429/5xx status) as failures worth retrying/breaking on, without throwing.
 */
export function buildPolicy(
  options: ResilienceOptions,
  isRetryableResult?: (result: unknown) => boolean,
): IPolicy {
  const isRetryableError =
    options.isRetryableError ?? isRetryableErrorByDefault;

  const failureFilter = isRetryableResult
    ? handleWhen(isRetryableError).orWhenResult(isRetryableResult)
    : handleWhen(isRetryableError);

  // cockatiel's `maxAttempts` counts retries *after* the first call, whereas our
  // public API counts total attempts (the more intuitive framing) — translate here.
  const totalAttempts = options.retry?.maxAttempts ?? 3;
  const retryPolicy = retry(failureFilter, {
    backoff: new ExponentialBackoff({
      initialDelay: options.retry?.initialDelayMs ?? 250,
      maxDelay: options.retry?.maxDelayMs ?? 10_000,
    }),
    maxAttempts: Math.max(0, totalAttempts - 1),
  });

  const breakerPolicy = circuitBreaker(failureFilter, {
    breaker: new ConsecutiveBreaker(
      options.circuitBreaker?.consecutiveFailures ?? 5,
    ),
    halfOpenAfter: options.circuitBreaker?.halfOpenAfterMs ?? 30_000,
  });

  const timeoutPolicy = timeout(
    options.timeoutMs ?? 15_000,
    TimeoutStrategy.Aggressive,
  );

  return wrap(retryPolicy, breakerPolicy, timeoutPolicy);
}

export function isRetryableErrorByDefault(error: unknown): boolean {
  if (error instanceof TypeError) {
    // fetch() throws a bare TypeError for network-level failures (DNS, refused, reset, ...).
    return true;
  }
  return error instanceof Error && error.name === "TaskCancelledError";
}
