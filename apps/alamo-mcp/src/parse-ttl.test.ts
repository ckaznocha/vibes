import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseCacheTtlSec } from "./parse-ttl.ts";

describe("parseCacheTtlSec", () => {
  it("parses a valid numeric string", () => {
    assert.strictEqual(parseCacheTtlSec("600"), 600);
  });

  it("falls back to 300 when unset", () => {
    assert.strictEqual(parseCacheTtlSec(undefined), 300);
  });

  it("falls back to 300 (not NaN) when the value is non-numeric", () => {
    assert.strictEqual(parseCacheTtlSec("not-a-number"), 300);
  });
});
