import { Honcho } from "@honcho-ai/sdk";

import type { HonchoMcpConfig } from "./config.ts";

const clientCache: { client: Honcho | undefined; key: string | undefined } = {
  client: undefined,
  key: undefined,
};

/** Test-only: clears the cached Honcho client so tests can start fresh. */
export function _resetHonchoClientCacheForTests(): void {
  clientCache.client = undefined;
  clientCache.key = undefined;
}

/**
 * Returns a Honcho client, created once per (baseUrl, workspace, apiKey) and reused across
 * calls for the lifetime of the process.
 */
export function getHonchoClient(config: HonchoMcpConfig): Honcho {
  const key = cacheKey(config);
  if (!clientCache.client || clientCache.key !== key) {
    clientCache.client = new Honcho({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      workspaceId: config.workspace,
    });
    clientCache.key = key;
  }
  return clientCache.client;
}

function cacheKey(config: HonchoMcpConfig): string {
  return `${config.baseUrl} ${config.workspace} ${config.apiKey ?? ""}`;
}
