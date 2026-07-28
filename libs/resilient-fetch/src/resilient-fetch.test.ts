import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createResilientFetch } from "./resilient-fetch.ts";

function jsonResponse(status: number, body: unknown = {}): Response {
  return Response.json(body, { status });
}

const fastRetry = { initialDelayMs: 1, maxAttempts: 3, maxDelayMs: 1 };

describe("createResilientFetch", () => {
  it("returns the response unchanged on first-try success", async () => {
    let calls = 0;
    const fetchImpl = async (): Promise<Response> => {
      calls++;
      return jsonResponse(200, { ok: true });
    };

    const resilientFetch = createResilientFetch({ fetchImpl });
    const response = await resilientFetch("https://example.com");

    assert.equal(response.status, 200);
    assert.equal(calls, 1);
  });

  it("retries a 429 and returns the eventual success", async () => {
    let calls = 0;
    const fetchImpl = async (): Promise<Response> => {
      calls++;
      return jsonResponse(calls < 3 ? 429 : 200);
    };

    const resilientFetch = createResilientFetch({
      fetchImpl,
      retry: fastRetry,
    });
    const response = await resilientFetch("https://example.com");

    assert.equal(response.status, 200);
    assert.equal(calls, 3);
  });

  it("returns the final failing Response (not a throw) once retries are exhausted", async () => {
    let calls = 0;
    const fetchImpl = async (): Promise<Response> => {
      calls++;
      return jsonResponse(503);
    };

    const resilientFetch = createResilientFetch({
      fetchImpl,
      retry: fastRetry,
    });
    const response = await resilientFetch("https://example.com");

    assert.equal(response.status, 503);
    assert.equal(calls, 3);
  });

  it("does not retry a non-transient 4xx status", async () => {
    let calls = 0;
    const fetchImpl = async (): Promise<Response> => {
      calls++;
      return jsonResponse(404);
    };

    const resilientFetch = createResilientFetch({
      fetchImpl,
      retry: fastRetry,
    });
    const response = await resilientFetch("https://example.com");

    assert.equal(response.status, 404);
    assert.equal(calls, 1);
  });

  it("retries a thrown network error and rethrows once exhausted", async () => {
    let calls = 0;
    const fetchImpl = async (): Promise<Response> => {
      calls++;
      throw new TypeError("fetch failed");
    };

    const resilientFetch = createResilientFetch({
      fetchImpl,
      retry: fastRetry,
    });

    await assert.rejects(
      () => resilientFetch("https://example.com"),
      TypeError,
    );
    assert.equal(calls, 3);
  });

  it("honors an additional caller-supplied retryable status", async () => {
    let calls = 0;
    const fetchImpl = async (): Promise<Response> => {
      calls++;
      return jsonResponse(calls < 2 ? 418 : 200);
    };

    const resilientFetch = createResilientFetch({
      fetchImpl,
      retry: fastRetry,
      retryableStatuses: [418],
    });
    const response = await resilientFetch("https://example.com");

    assert.equal(response.status, 200);
    assert.equal(calls, 2);
  });

  it("caps concurrency via the throttle queue", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchImpl = async (): Promise<Response> => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight--;
      return jsonResponse(200);
    };

    const resilientFetch = createResilientFetch({
      fetchImpl,
      throttle: { concurrency: 2 },
    });

    await Promise.all(
      Array.from({ length: 5 }, async () =>
        resilientFetch("https://example.com"),
      ),
    );

    assert.equal(maxInFlight, 2);
  });
});
