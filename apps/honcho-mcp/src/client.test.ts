import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import type { HonchoMcpConfig } from "./config.ts";

import { _resetHonchoClientCacheForTests, getHonchoClient } from "./client.ts";

function makeConfig(overrides: Partial<HonchoMcpConfig> = {}): HonchoMcpConfig {
  return {
    apiKey: "key-1",
    assistant: "claude-desktop",

    baseUrl: "http://localhost:49317/v3",
    userPeer: "user",
    workspace: "hermes",
    ...overrides,
  };
}

describe("getHonchoClient", () => {
  beforeEach(() => {
    _resetHonchoClientCacheForTests();
  });

  it("returns the same client instance across calls with an identical config", () => {
    const first = getHonchoClient(makeConfig());
    const second = getHonchoClient(makeConfig());
    assert.strictEqual(second, first);
  });

  it("creates a new client instance when the workspace changes", () => {
    const first = getHonchoClient(makeConfig());
    const second = getHonchoClient(
      makeConfig({ workspace: "other-workspace" }),
    );
    assert.notStrictEqual(second, first);
  });

  it("creates a new client instance when the baseUrl changes", () => {
    const first = getHonchoClient(makeConfig());
    const second = getHonchoClient(
      // eslint-disable-next-line sonarjs/no-clear-text-protocols
      makeConfig({ baseUrl: "http://other-host:1/v3" }),
    );
    assert.notStrictEqual(second, first);
  });
});
