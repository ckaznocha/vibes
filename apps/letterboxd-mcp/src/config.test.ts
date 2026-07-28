import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseCrawlDelayMs } from "./config.ts";

describe("parseCrawlDelayMs", () => {
  it("falls back to 1000 when undefined", () => {
    assert.strictEqual(parseCrawlDelayMs(undefined), 1000);
  });

  it("falls back to 1000 for an empty string", () => {
    assert.strictEqual(parseCrawlDelayMs(""), 1000);
  });

  it("falls back to 1000 for a non-numeric string", () => {
    assert.strictEqual(parseCrawlDelayMs("fast"), 1000);
  });

  it("falls back to 1000 for a negative number", () => {
    assert.strictEqual(parseCrawlDelayMs("-5"), 1000);
  });

  it("parses a valid non-negative number", () => {
    assert.strictEqual(parseCrawlDelayMs("42"), 42);
  });

  it("allows zero", () => {
    assert.strictEqual(parseCrawlDelayMs("0"), 0);
  });
});
