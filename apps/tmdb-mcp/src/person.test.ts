import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { TMDB } from "tmdb-ts";

import { getPersonDetails } from "./person.ts";

function makeResponse(body: unknown) {
  return { json: async () => body, ok: true } as Response;
}

describe("getPersonDetails", () => {
  it("fetches details for the given person id", async () => {
    const fetchImpl = mock.fn<typeof fetch>(async () =>
      makeResponse({ id: 303, name: "Rowan Vance" }),
    );
    const client = new TMDB("key123", { fetch: fetchImpl });

    const result = await getPersonDetails(client, { personId: 303 });

    assert.strictEqual(result.name, "Rowan Vance");
    const [call] = fetchImpl.mock.calls;
    assert.ok(call);
    const url = new URL(
      call.arguments[0] instanceof Request
        ? call.arguments[0].url
        : call.arguments[0],
    );
    assert.strictEqual(url.pathname, "/3/person/303");
  });

  it("forwards appendToResponse", async () => {
    const fetchImpl = mock.fn<typeof fetch>(async () =>
      makeResponse({ id: 303, name: "Rowan Vance" }),
    );
    const client = new TMDB("key123", { fetch: fetchImpl });

    await getPersonDetails(client, {
      appendToResponse: ["combined_credits"],
      personId: 303,
    });

    const [call] = fetchImpl.mock.calls;
    assert.ok(call);
    const url = new URL(
      call.arguments[0] instanceof Request
        ? call.arguments[0].url
        : call.arguments[0],
    );
    assert.strictEqual(
      url.searchParams.get("append_to_response"),
      "combined_credits",
    );
  });
});
