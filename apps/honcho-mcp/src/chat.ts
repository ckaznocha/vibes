import type { Peer } from "@honcho-ai/sdk";

export type ChatPeer = Pick<Peer, "chat">;

const REASONING_LEVELS = new Set(["high", "low", "max", "medium", "minimal"]);

export async function chatWithPeer(
  peer: ChatPeer,
  question: string,
  reasoningLevel = "low",
  target?: string,
): Promise<string> {
  const level = REASONING_LEVELS.has(reasoningLevel) ? reasoningLevel : "low";
  const response = await peer.chat(question, {
    reasoningLevel: level,
    ...(target !== undefined && { target }),
  });
  return response ?? "No response from Honcho.";
}
