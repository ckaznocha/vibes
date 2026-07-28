import type { Honcho } from "@honcho-ai/sdk";

export interface SearchResultItem {
  content: string;
  createdAt: string;
  peerId: string;
}

export type WorkspaceSearchClient = Pick<Honcho, "search">;

export async function searchWorkspace(
  client: WorkspaceSearchClient,
  query: string,
  limit = 10,
): Promise<SearchResultItem[]> {
  const messages = await client.search(query, { limit });
  return messages.map((message) => ({
    content: message.content,
    createdAt: message.createdAt,
    peerId: message.peerId,
  }));
}
