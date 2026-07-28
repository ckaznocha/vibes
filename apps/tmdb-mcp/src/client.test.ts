import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { _resetTmdbClientCacheForTests, getTmdbClient } from "./client.ts";

describe("getTmdbClient", () => {
  beforeEach(() => {
    _resetTmdbClientCacheForTests();
  });

  it("returns the same client instance across calls with the same apiKey", () => {
    const first = getTmdbClient("key-1");
    const second = getTmdbClient("key-1");
    assert.strictEqual(second, first);
  });

  it("creates a new client instance when the apiKey changes", () => {
    const first = getTmdbClient("key-1");
    const second = getTmdbClient("key-2");
    assert.notStrictEqual(second, first);
  });
});
