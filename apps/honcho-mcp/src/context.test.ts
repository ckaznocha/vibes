import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import type { ContextPeer } from "./context.ts";

import { getPeerContext, getPeerRepresentation } from "./context.ts";

describe("getPeerContext", () => {
  it("returns representation and peer card, defaulting maxConclusions to 25", async () => {
    const context = mock.fn<ContextPeer["context"]>(async () => ({
      peerCard: ["likes TypeScript"],
      peerId: "user",
      representation: "The user is a software engineer.",
      targetId: "user",
      toString: () => "",
    }));
    const peer: ContextPeer = { context, representation: mock.fn() };

    const snapshot = await getPeerContext(peer);

    assert.deepEqual(snapshot, {
      peerCard: ["likes TypeScript"],
      representation: "The user is a software engineer.",
    });
    const [call] = context.mock.calls;
    assert.ok(call);
    assert.deepEqual(call.arguments[0], {
      includeMostFrequent: true,
      maxConclusions: 25,
    });
  });

  it("forwards maxConclusions and searchQuery when provided", async () => {
    const context = mock.fn<ContextPeer["context"]>(async () => ({
      peerCard: null,
      peerId: "user",
      representation: null,
      targetId: "user",
      toString: () => "",
    }));
    const peer: ContextPeer = { context, representation: mock.fn() };

    await getPeerContext(peer, {
      maxConclusions: 5,
      searchQuery: "preferences",
    });

    const [call] = context.mock.calls;
    assert.ok(call);
    assert.deepEqual(call.arguments[0], {
      includeMostFrequent: true,
      maxConclusions: 5,
      searchQuery: "preferences",
    });
  });

  it("forwards target when provided", async () => {
    const context = mock.fn<ContextPeer["context"]>(async () => ({
      peerCard: null,
      peerId: "assistant",
      representation: null,
      targetId: "user",
      toString: () => "",
    }));
    const peer: ContextPeer = { context, representation: mock.fn() };

    await getPeerContext(peer, { target: "user" });

    const [call] = context.mock.calls;
    assert.ok(call);
    assert.deepEqual(call.arguments[0], {
      includeMostFrequent: true,
      maxConclusions: 25,
      target: "user",
    });
  });
});

describe("getPeerRepresentation", () => {
  it("returns the representation string as-is", async () => {
    const representation = mock.fn<ContextPeer["representation"]>(
      async () => "The user is a software engineer.",
    );
    const peer: ContextPeer = { context: mock.fn(), representation };

    const result = await getPeerRepresentation(peer);

    assert.equal(result, "The user is a software engineer.");
  });

  it("calls representation without arguments when target is omitted", async () => {
    const representation = mock.fn<ContextPeer["representation"]>(
      async () => "The user is a software engineer.",
    );
    const peer: ContextPeer = { context: mock.fn(), representation };

    await getPeerRepresentation(peer);

    const [call] = representation.mock.calls;
    assert.ok(call);
    assert.deepEqual(call.arguments, [undefined]);
  });

  it("forwards target when provided", async () => {
    const representation = mock.fn<ContextPeer["representation"]>(
      async () => "The assistant's view of the user.",
    );
    const peer: ContextPeer = { context: mock.fn(), representation };

    const result = await getPeerRepresentation(peer, "user");

    assert.equal(result, "The assistant's view of the user.");
    const [call] = representation.mock.calls;
    assert.ok(call);
    assert.deepEqual(call.arguments[0], { target: "user" });
  });
});
