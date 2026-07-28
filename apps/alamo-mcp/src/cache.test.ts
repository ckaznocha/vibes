import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createTtlCache } from "./cache.ts";

describe("createTtlCache", () => {
  it("returns undefined for a key that was never set", () => {
    const cache = createTtlCache<string>({ ttlSec: 10 });
    assert.strictEqual(cache.get("missing"), undefined);
  });

  it("returns the cached value before expiry", () => {
    let now = 1000;
    const cache = createTtlCache<string>({ nowImpl: () => now, ttlSec: 10 });
    cache.set("los-angeles", "value-1");
    now += 5000;
    assert.strictEqual(cache.get("los-angeles"), "value-1");
  });

  it("returns undefined after expiry", () => {
    let now = 1000;
    const cache = createTtlCache<string>({ nowImpl: () => now, ttlSec: 10 });
    cache.set("los-angeles", "value-1");
    now += 10_001;
    assert.strictEqual(cache.get("los-angeles"), undefined);
  });

  it("treats a different key as a miss", () => {
    const cache = createTtlCache<string>({ ttlSec: 10 });
    cache.set("los-angeles", "value-1");
    assert.strictEqual(cache.get("nyc"), undefined);
  });
});
