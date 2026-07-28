import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import type { WorkspaceSearchClient } from "./search.ts";

import { searchWorkspace } from "./search.ts";

describe("searchWorkspace", () => {
  it("maps SDK messages to plain result items and forwards query/limit", async () => {
    const search = mock.fn<WorkspaceSearchClient["search"]>(async () => [
      {
        content: "likes TypeScript",
        createdAt: "2026-07-01T00:00:00.000Z",
        id: "msg-1",
        metadata: {},
        peerId: "user",
        sessionId: "session-1",
        tokenCount: 3,
        workspaceId: "hermes",
      },
    ]);
    const client: WorkspaceSearchClient = { search };

    const results = await searchWorkspace(client, "TypeScript", 5);

    assert.deepEqual(results, [
      {
        content: "likes TypeScript",
        createdAt: "2026-07-01T00:00:00.000Z",
        peerId: "user",
      },
    ]);
    const [call] = search.mock.calls;
    assert.ok(call);
    assert.equal(call.arguments[0], "TypeScript");
    assert.deepEqual(call.arguments[1], { limit: 5 });
  });

  it("defaults limit to 10 when not provided", async () => {
    const search = mock.fn<WorkspaceSearchClient["search"]>(async () => []);
    const client: WorkspaceSearchClient = { search };

    await searchWorkspace(client, "query");

    const [call] = search.mock.calls;
    assert.ok(call);
    assert.deepEqual(call.arguments[1], { limit: 10 });
  });
});
