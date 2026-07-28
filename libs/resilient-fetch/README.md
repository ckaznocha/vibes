# resilient-fetch

`scope:shared` lib — retry-with-backoff, a circuit breaker, a per-attempt
timeout, and concurrency/rate throttling for outbound network calls, built on
[cockatiel](https://github.com/connor4312/cockatiel) and
[p-queue](https://github.com/sindresorhus/p-queue). Every `type:mcp-server`
project in this workspace that talks to a third-party API (scraped HTML,
REST, or an SDK) wraps that traffic with one of the two factories below
instead of hand-rolling retry logic per project.

## API

### `createResilientFetch(options?)`

Wraps `fetch` (or a given `fetchImpl`) and returns a drop-in `typeof fetch`.
A persistent transient HTTP status (429/5xx, or anything added via
`retryableStatuses`) is retried and, once exhausted, **returned** as the
final `Response` — not thrown — so existing `!response.ok` handling keeps
working unchanged. Network failures and per-attempt timeouts still throw
once retries are exhausted.

```ts
import { createResilientFetch } from "@ckaznocha/resilient-fetch";

const fetchImpl = createResilientFetch({
  timeoutMs: 10_000,
  retry: { maxAttempts: 4 },
  throttle: { concurrency: 2, intervalCap: 10, intervalMs: 1000 },
});

const response = await fetchImpl("https://api.example.com/thing");
```

### `createResilientExecutor(options?)`

For calls that don't go through `fetch` directly (e.g. an SDK client method
with no `fetch` injection point). Returns `execute(fn)`, which applies the
same retry/circuit-breaker/timeout/throttle policy around any
`() => Promise<T>`. Unlike `createResilientFetch`, there's no notion of an
HTTP response to inspect — only thrown errors classified by
`isRetryableError` count as transient, and the wrapped call always rejects
once retries are exhausted.

```ts
import { createResilientExecutor } from "@ckaznocha/resilient-fetch";

const execute = createResilientExecutor();

const peer = await execute(() => honcho.peer(peerName));
```

## Options (`ResilienceOptions`, shared by both factories)

| Option                               | Default                                                                               | Meaning                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `retry.maxAttempts`                  | `3`                                                                                   | Total attempts, including the first (cockatiel counts retries after the first call — this lib translates) |
| `retry.initialDelayMs`               | `250`                                                                                 | Initial exponential-backoff delay                                                                         |
| `retry.maxDelayMs`                   | `10_000`                                                                              | Backoff ceiling                                                                                           |
| `circuitBreaker.consecutiveFailures` | `5`                                                                                   | Consecutive matching failures before the circuit opens                                                    |
| `circuitBreaker.halfOpenAfterMs`     | `30_000`                                                                              | How long before probing a half-open circuit again                                                         |
| `timeoutMs`                          | `15_000`                                                                              | Per-attempt timeout                                                                                       |
| `isRetryableError`                   | `isRetryableErrorByDefault` (network `TypeError` or cockatiel's `TaskCancelledError`) | Classifies a thrown error as transient (retry-worthy)                                                     |

`createResilientFetch` additionally accepts:

| Option              | Default                             | Meaning                                                                 |
| ------------------- | ----------------------------------- | ----------------------------------------------------------------------- |
| `fetchImpl`         | global `fetch`                      | Underlying fetch implementation to wrap                                 |
| `retryableStatuses` | `408, 425, 429, 500, 502, 503, 504` | Extra HTTP statuses to treat as transient, merged with the built-in set |

Both factories accept `throttle`:

| Option                 | Default   | Meaning                               |
| ---------------------- | --------- | ------------------------------------- |
| `throttle.concurrency` | `4`       | Max concurrent in-flight calls        |
| `throttle.intervalCap` | unbounded | Max calls allowed within `intervalMs` |
| `throttle.intervalMs`  | `1000`    | Window `intervalCap` applies to       |

## Used by

- `alamo-mcp`, `letterboxd-mcp`, `tmdb-mcp` — `createResilientFetch`, injected
  into their respective HTTP clients.
- `honcho-mcp` — `createResilientExecutor`, wrapping `@honcho-ai/sdk` calls
  that don't expose a `fetch` seam.

## Development

```sh
pnpm exec nx test resilient-fetch
pnpm exec nx typecheck resilient-fetch
```

No build target — this is a TS-source-only lib; consuming apps' esbuild
bundlers read `src/index.ts` directly.
