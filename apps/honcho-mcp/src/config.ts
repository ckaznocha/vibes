import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export interface HonchoMcpConfig {
  apiKey: string | undefined;
  assistant: string;
  baseUrl: string;
  userPeer: string;
  workspace: string;
}

interface RawConfigFile {
  apiKey?: string;
  endpoint?: { baseUrl?: string };
  peerName?: string;
  workspace?: string;
}

export function resolveConfig(
  environment: Partial<Record<string, string>> = process.env,
): HonchoMcpConfig {
  const configPath =
    environment["HONCHO_CONFIG"] ??
    path.join(homedir(), ".honcho", "config.json");
  const fileConfig = readConfigFile(configPath);

  return {
    apiKey: environment["HONCHO_API_KEY"] ?? fileConfig.apiKey,
    assistant: environment["HONCHO_ASSISTANT"] ?? "claude-desktop",
    baseUrl:
      environment["HONCHO_BASE_URL"] ??
      fileConfig.endpoint?.baseUrl ??
      "http://localhost:49317/v3",
    userPeer: environment["HONCHO_USER_PEER"] ?? fileConfig.peerName ?? "user",
    workspace:
      environment["HONCHO_WORKSPACE"] ?? fileConfig.workspace ?? "hermes",
  };
}

function readConfigFile(path: string): RawConfigFile {
  let raw: string;
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    raw = readFileSync(path, "utf8");
  } catch {
    return {};
  }

  try {
    return JSON.parse(raw) as RawConfigFile;
  } catch (error) {
    process.stderr.write(
      `honcho-mcp: failed to parse config file at ${path}: ${
        error instanceof Error ? error.message : String(error)
      }\n`,
    );
    return {};
  }
}
