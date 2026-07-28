import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toolError, toolResult } from "./index.ts";

describe("toolResult", () => {
  it("JSON-serializes data as pretty-printed text content", () => {
    const result = toolResult({ films: [{ title: "The Matrix" }] });

    assert.deepStrictEqual(result, {
      content: [
        {
          text: JSON.stringify({ films: [{ title: "The Matrix" }] }, null, 2),
          type: "text",
        },
      ],
    });
  });
});

describe("toolError", () => {
  it("uses the message of an Error instance", () => {
    const result = toolError(new Error("boom"));

    assert.deepStrictEqual(result, {
      content: [{ text: "boom", type: "text" }],
      isError: true,
    });
  });

  it("stringifies a non-Error thrown value", () => {
    const result = toolError("plain string failure");

    assert.deepStrictEqual(result, {
      content: [{ text: "plain string failure", type: "text" }],
      isError: true,
    });
  });
});
