import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";

import { resolveConfig } from "./config.ts";

describe("resolveConfig", () => {
  let temporaryDirectory: string | undefined;

  afterEach(() => {
    if (!temporaryDirectory) {
      return;
    }

    rmSync(temporaryDirectory, { force: true, recursive: true });
    temporaryDirectory = undefined;
  });

  it("returns hardcoded defaults when no config file and no env vars are set", () => {
    // HONCHO_CONFIG points at a guaranteed-missing path so this assertion doesn't depend on
    // whether the machine running the tests happens to have a real ~/.honcho/config.json.
    const config = resolveConfig({
      HONCHO_CONFIG: "/no/such/path/config.json",
    });

    assert.deepEqual(config, {
      apiKey: undefined,
      assistant: "claude-desktop",

      baseUrl: "http://localhost:49317/v3",
      userPeer: "user",
      workspace: "hermes",
    });
  });

  it("reads apiKey, workspace, peerName, and endpoint.baseUrl from the config file", () => {
    temporaryDirectory = mkdtempSync(path.join(tmpdir(), "honcho-mcp-test-"));
    const configPath = path.join(temporaryDirectory, "config.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        apiKey: "file-key",
        // eslint-disable-next-line sonarjs/no-clear-text-protocols
        endpoint: { baseUrl: "http://file-host:1234/v3" },
        peerName: "file-peer",
        workspace: "file-workspace",
      }),
    );

    const config = resolveConfig({ HONCHO_CONFIG: configPath });

    assert.equal(config.apiKey, "file-key");
    // eslint-disable-next-line sonarjs/no-clear-text-protocols
    assert.equal(config.baseUrl, "http://file-host:1234/v3");
    assert.equal(config.userPeer, "file-peer");
    assert.equal(config.workspace, "file-workspace");
  });

  it("prefers env vars over the config file", () => {
    temporaryDirectory = mkdtempSync(path.join(tmpdir(), "honcho-mcp-test-"));
    const configPath = path.join(temporaryDirectory, "config.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        apiKey: "file-key",
        // eslint-disable-next-line sonarjs/no-clear-text-protocols
        endpoint: { baseUrl: "http://file-host:1234/v3" },
        peerName: "file-peer",
        workspace: "file-workspace",
      }),
    );

    const config = resolveConfig({
      HONCHO_API_KEY: "env-key",
      HONCHO_ASSISTANT: "env-assistant",
      // eslint-disable-next-line sonarjs/no-clear-text-protocols
      HONCHO_BASE_URL: "http://env-host:5678/v3",
      HONCHO_CONFIG: configPath,
      HONCHO_USER_PEER: "env-peer",
      HONCHO_WORKSPACE: "env-workspace",
    });

    assert.deepEqual(config, {
      apiKey: "env-key",
      assistant: "env-assistant",
      // eslint-disable-next-line sonarjs/no-clear-text-protocols
      baseUrl: "http://env-host:5678/v3",
      userPeer: "env-peer",
      workspace: "env-workspace",
    });
  });

  it("falls back to defaults when HONCHO_CONFIG points at a missing or invalid file", () => {
    const config = resolveConfig({
      HONCHO_CONFIG: "/no/such/path/config.json",
    });

    assert.equal(config.workspace, "hermes");
    assert.equal(config.userPeer, "user");
  });
});
