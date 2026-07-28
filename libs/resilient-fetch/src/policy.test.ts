import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isRetryableErrorByDefault } from "./policy.ts";

describe("isRetryableErrorByDefault", () => {
  it("treats a bare TypeError (fetch network failure) as retryable", () => {
    assert.equal(
      isRetryableErrorByDefault(new TypeError("fetch failed")),
      true,
    );
  });

  it("treats cockatiel's TaskCancelledError (timeout) as retryable", () => {
    class TaskCancelledError extends Error {
      constructor(message: string) {
        super(message);
        this.name = "TaskCancelledError";
      }
    }

    assert.equal(
      isRetryableErrorByDefault(new TaskCancelledError("timed out")),
      true,
    );
  });

  it("does not treat an arbitrary Error as retryable", () => {
    assert.equal(isRetryableErrorByDefault(new Error("boom")), false);
  });

  it("does not treat a non-error value as retryable", () => {
    assert.equal(isRetryableErrorByDefault("not an error"), false);
  });
});
