import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import type { ConclusionsClient } from "./conclusions.ts";

import {
  createConclusion,
  deleteConclusion,
  listConclusions,
} from "./conclusions.ts";

function makeConclusion(
  overrides: Partial<{
    content: string;
    createdAt: string;
    id: string;
  }> = {},
) {
  return {
    content: "likes TypeScript",
    createdAt: "2026-07-01T00:00:00.000Z",
    id: "concl-1",
    level: "explicit" as const,
    observedId: "user",
    observerId: "claude-desktop",
    sessionId: null,
    toString: () => "",
    ...overrides,
  };
}

describe("createConclusion", () => {
  it("creates a conclusion and returns its summary", async () => {
    const create = mock.fn<ConclusionsClient["create"]>(async () => [
      makeConclusion(),
    ]);
    const scope: ConclusionsClient = {
      create,
      delete: mock.fn(),
      list: mock.fn(),
    };

    const result = await createConclusion(scope, "likes TypeScript");

    assert.deepEqual(result, {
      content: "likes TypeScript",
      createdAt: "2026-07-01T00:00:00.000Z",
      id: "concl-1",
    });
    const [call] = create.mock.calls;
    assert.ok(call);
    assert.deepEqual(call.arguments[0], { content: "likes TypeScript" });
  });

  it("throws when Honcho returns no created conclusion", async () => {
    const create = mock.fn<ConclusionsClient["create"]>(async () => []);
    const scope: ConclusionsClient = {
      create,
      delete: mock.fn(),
      list: mock.fn(),
    };

    await assert.rejects(
      () => createConclusion(scope, "likes TypeScript"),
      /did not return a created conclusion/,
    );
  });
});

describe("listConclusions", () => {
  it("maps conclusions and pagination metadata, capping size at 100", async () => {
    const list = mock.fn<ConclusionsClient["list"]>(async () => ({
      items: [makeConclusion()],
      page: 1,
      pages: 1,
      total: 1,
    }));
    const scope: ConclusionsClient = {
      create: mock.fn(),
      delete: mock.fn(),
      list,
    };

    const result = await listConclusions(scope, 1, 500);

    assert.deepEqual(result, {
      items: [
        {
          content: "likes TypeScript",
          createdAt: "2026-07-01T00:00:00.000Z",
          id: "concl-1",
        },
      ],
      page: 1,
      pages: 1,
      total: 1,
    });
    const [call] = list.mock.calls;
    assert.ok(call);
    assert.deepEqual(call.arguments[0], { page: 1, size: 100 });
  });

  it("defaults to page 1, size 20", async () => {
    const list = mock.fn<ConclusionsClient["list"]>(async () => ({
      items: [],
      page: 1,
      pages: 0,
      total: 0,
    }));
    const scope: ConclusionsClient = {
      create: mock.fn(),
      delete: mock.fn(),
      list,
    };

    await listConclusions(scope);

    const [call] = list.mock.calls;
    assert.ok(call);
    assert.deepEqual(call.arguments[0], { page: 1, size: 20 });
  });
});

describe("deleteConclusion", () => {
  it("forwards the id to the scope's delete method", async () => {
    const del = mock.fn<ConclusionsClient["delete"]>(async () => {});
    const scope: ConclusionsClient = {
      create: mock.fn(),
      delete: del,
      list: mock.fn(),
    };

    await deleteConclusion(scope, "concl-1");

    const [call] = del.mock.calls;
    assert.ok(call);
    assert.equal(call.arguments[0], "concl-1");
  });
});
