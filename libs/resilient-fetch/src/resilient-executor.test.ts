import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createResilientExecutor } from "./resilient-executor.ts";

const fastRetry = { initialDelayMs: 1, maxAttempts: 3, maxDelayMs: 1 };

describe("createResilientExecutor", () => {
  it("returns the value unchanged on first-try success", async () => {
    const execute = createResilientExecutor();
    const result = await execute(async () => "ok");

    assert.equal(result, "ok");
  });

  it("retries a call that throws a retryable error, then succeeds", async () => {
    let calls = 0;
    const execute = createResilientExecutor({ retry: fastRetry });

    const result = await execute(async () => {
      calls++;
      if (calls < 3) {
        throw new TypeError("network blip");
      }
      return "ok";
    });

    assert.equal(result, "ok");
    assert.equal(calls, 3);
  });

  it("rethrows once retries are exhausted", async () => {
    let calls = 0;
    const execute = createResilientExecutor({ retry: fastRetry });

    await assert.rejects(
      () =>
        execute(async () => {
          calls++;
          throw new TypeError("still failing");
        }),
      TypeError,
    );
    assert.equal(calls, 3);
  });

  it("does not retry an error that isRetryableError rejects", async () => {
    let calls = 0;
    const execute = createResilientExecutor({
      isRetryableError: () => false,
      retry: fastRetry,
    });

    await assert.rejects(
      () =>
        execute(async () => {
          calls++;
          throw new Error("permanent failure");
        }),
      /permanent failure/,
    );
    assert.equal(calls, 1);
  });

  it("caps concurrency via the throttle queue", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const execute = createResilientExecutor({ throttle: { concurrency: 2 } });

    await Promise.all(
      Array.from({ length: 5 }, async () =>
        execute(async () => {
          inFlight++;
          maxInFlight = Math.max(maxInFlight, inFlight);
          await new Promise((resolve) => setTimeout(resolve, 10));
          inFlight--;
        }),
      ),
    );

    assert.equal(maxInFlight, 2);
  });
});
