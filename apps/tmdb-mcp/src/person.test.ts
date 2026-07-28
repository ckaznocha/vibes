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
      makeResponse({ id: 6193, name: "Keanu Reeves" }),
    );
    const client = new TMDB("key123", { fetch: fetchImpl });

    const result = await getPersonDetails(client, { personId: 6193 });

    assert.strictEqual(result.name, "Keanu Reeves");
    const [call] = fetchImpl.mock.calls;
    assert.ok(call);
    const url = new URL(call.arguments[0]);
    assert.strictEqual(url.pathname, "/3/person/6193");
  });

  it("forwards appendToResponse", async () => {
    const fetchImpl = mock.fn<typeof fetch>(async () =>
      makeResponse({ id: 6193, name: "Keanu Reeves" }),
    );
    const client = new TMDB("key123", { fetch: fetchImpl });

    await getPersonDetails(client, {
      appendToResponse: ["combined_credits"],
      personId: 6193,
    });

    const [call] = fetchImpl.mock.calls;
    assert.ok(call);
    const url = new URL(call.arguments[0]);
    assert.strictEqual(
      url.searchParams.get("append_to_response"),
      "combined_credits",
    );
  });
});
