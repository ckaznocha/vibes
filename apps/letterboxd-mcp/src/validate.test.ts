import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertValidUsername } from "./validate.ts";

describe("assertValidUsername", () => {
  it("accepts alphanumeric usernames", () => {
    assert.doesNotThrow(() => {
      assertValidUsername("cliftonk");
    });
  });

  it("accepts usernames with underscores and hyphens", () => {
    assert.doesNotThrow(() => {
      assertValidUsername("clif_ton-k");
    });
  });

  it("rejects usernames with a slash", () => {
    assert.throws(() => {
      assertValidUsername("foo/bar");
    }, /invalid letterboxd username/);
  });

  it("rejects usernames with a space", () => {
    assert.throws(() => {
      assertValidUsername("foo bar");
    }, /invalid letterboxd username/);
  });

  it("rejects an empty username", () => {
    assert.throws(() => {
      assertValidUsername("");
    }, /invalid letterboxd username/);
  });
});
