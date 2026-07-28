import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import type { ChatPeer } from "./chat.ts";

import { chatWithPeer } from "./chat.ts";

describe("chatWithPeer", () => {
  it("forwards the question and reasoning level, returning the response text", async () => {
    const chat = mock.fn<ChatPeer["chat"]>(
      async () => "The user prefers TypeScript.",
    );
    const peer: ChatPeer = { chat };

    const result = await chatWithPeer(
      peer,
      "What language does the user prefer?",
      "high",
    );

    assert.equal(result, "The user prefers TypeScript.");
    const [call] = chat.mock.calls;
    assert.ok(call);
    assert.equal(call.arguments[0], "What language does the user prefer?");
    assert.deepEqual(call.arguments[1], { reasoningLevel: "high" });
  });

  it("forwards target when provided", async () => {
    const chat = mock.fn<ChatPeer["chat"]>(async () => "answer");
    const peer: ChatPeer = { chat };

    await chatWithPeer(peer, "question", "high", "user");

    const [call] = chat.mock.calls;
    assert.ok(call);
    assert.deepEqual(call.arguments[1], {
      reasoningLevel: "high",
      target: "user",
    });
  });

  it("defaults reasoning level to low when not provided", async () => {
    const chat = mock.fn<ChatPeer["chat"]>(async () => "answer");
    const peer: ChatPeer = { chat };

    await chatWithPeer(peer, "question");

    const [call] = chat.mock.calls;
    assert.ok(call);
    assert.deepEqual(call.arguments[1], { reasoningLevel: "low" });
  });

  it("falls back to low for an invalid reasoning level", async () => {
    const chat = mock.fn<ChatPeer["chat"]>(async () => "answer");
    const peer: ChatPeer = { chat };

    await chatWithPeer(peer, "question", "extreme");

    const [call] = chat.mock.calls;
    assert.ok(call);
    assert.deepEqual(call.arguments[1], { reasoningLevel: "low" });
  });

  it("returns a fallback string when Honcho returns null", async () => {
    const chat = mock.fn<ChatPeer["chat"]>(async () => null);
    const peer: ChatPeer = { chat };

    const result = await chatWithPeer(peer, "question");

    assert.equal(result, "No response from Honcho.");
  });
});
