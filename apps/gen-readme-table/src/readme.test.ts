import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { spliceTable } from "./readme.ts";

const START = "<!-- start -->";
const END = "<!-- end -->";

describe("spliceTable", () => {
  it("replaces the content between the markers with the table", () => {
    const readme = `# Title\n\n${START}\nstale\n${END}\n\nFooter`;

    const updated = spliceTable(readme, "TABLE", START, END);

    assert.strictEqual(
      updated,
      `# Title\n\n${START}\n\nTABLE\n\n${END}\n\nFooter`,
    );
  });

  it("throws when the start marker is missing", () => {
    assert.throws(
      () => spliceTable(`no markers here\n${END}`, "TABLE", START, END),
      /missing/,
    );
  });

  it("throws when the end marker is missing", () => {
    assert.throws(
      () => spliceTable(`${START}\nno end`, "TABLE", START, END),
      /missing/,
    );
  });
});
