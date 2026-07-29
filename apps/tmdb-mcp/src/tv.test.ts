import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { TMDB } from "tmdb-ts";

import { getTvDetails } from "./tv.ts";

function makeResponse(body: unknown) {
  return { json: async () => body, ok: true } as Response;
}

describe("getTvDetails", () => {
  it("fetches details for the given tv id", async () => {
    const fetchImpl = mock.fn<typeof fetch>(async () =>
      makeResponse({ id: 95_396, name: "Severance" }),
    );
    const client = new TMDB("key123", { fetch: fetchImpl });

    const result = await getTvDetails(client, { tvId: 95_396 });

    assert.strictEqual(result.name, "Severance");
    const [call] = fetchImpl.mock.calls;
    assert.ok(call);
    const url = new URL(
      call.arguments[0] instanceof Request
        ? call.arguments[0].url
        : call.arguments[0],
    );
    assert.strictEqual(url.pathname, "/3/tv/95396");
  });

  it("forwards appendToResponse and language", async () => {
    const fetchImpl = mock.fn<typeof fetch>(async () =>
      makeResponse({ id: 95_396, name: "Severance" }),
    );
    const client = new TMDB("key123", { fetch: fetchImpl });

    await getTvDetails(client, {
      appendToResponse: ["credits", "external_ids"],
      language: "en-US",
      tvId: 95_396,
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
      "credits,external_ids",
    );
    assert.strictEqual(url.searchParams.get("language"), "en-US");
  });
});
