import type { Peer } from "@honcho-ai/sdk";

export type ContextPeer = Pick<Peer, "context" | "representation">;

export interface ContextSnapshot {
  peerCard: null | string[];
  representation: null | string;
}

export async function getPeerContext(
  peer: ContextPeer,
  options: {
    maxConclusions?: number;
    searchQuery?: string;
    target?: string;
  } = {},
): Promise<ContextSnapshot> {
  const context = await peer.context({
    includeMostFrequent: true,
    maxConclusions: options.maxConclusions ?? 25,
    ...(options.searchQuery !== undefined && {
      searchQuery: options.searchQuery,
    }),
    ...(options.target !== undefined && { target: options.target }),
  });
  return { peerCard: context.peerCard, representation: context.representation };
}

export function getPeerRepresentation(
  peer: ContextPeer,
  target?: string,
): Promise<string> {
  return peer.representation(target === undefined ? undefined : { target });
}
