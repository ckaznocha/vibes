import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { optionalEnvironment } from "./environment.ts";

describe("optionalEnvironment", () => {
  it("returns undefined when the var is unset", () => {
    assert.strictEqual(optionalEnvironment(undefined), undefined);
  });

  it("treats an empty string as unset", () => {
    assert.strictEqual(optionalEnvironment(""), undefined);
  });

  it("treats a whitespace-only string as unset", () => {
    assert.strictEqual(optionalEnvironment(" ".repeat(3)), undefined);
  });

  it("returns a real value", () => {
    assert.strictEqual(optionalEnvironment("austin"), "austin");
  });

  it("trims surrounding whitespace off a real value", () => {
    assert.strictEqual(optionalEnvironment("  austin\n"), "austin");
  });
});
