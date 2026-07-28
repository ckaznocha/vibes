import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildTable, toRow } from "./table.ts";

describe("toRow", () => {
  it("formats a project as a markdown table row", () => {
    const row = toRow({
      description: "Example app",
      kind: "app",
      name: "example-app",
      root: "apps/example-app",
    });

    assert.strictEqual(
      row,
      "| [`example-app`](apps/example-app) | app | Example app |",
    );
  });
});

describe("buildTable", () => {
  it("renders a header followed by one row per project, in given order", () => {
    const table = buildTable([
      {
        description: "A lib",
        kind: "lib",
        name: "a-lib",
        root: "libs/a-lib",
      },
      {
        description: "An app",
        kind: "app",
        name: "an-app",
        root: "apps/an-app",
      },
    ]);

    assert.strictEqual(
      table,
      [
        "| Project | Kind | Description |",
        "| --- | --- | --- |",
        "| [`a-lib`](libs/a-lib) | lib | A lib |",
        "| [`an-app`](apps/an-app) | app | An app |",
      ].join("\n"),
    );
  });
});
