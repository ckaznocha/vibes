import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bookingUrl } from "./booking-url.ts";

describe("bookingUrl", () => {
  it("builds a URL defaulting to the los-angeles market", () => {
    assert.strictEqual(
      bookingUrl({ presentationSlug: "sinners-2025-dtla" }),
      "https://drafthouse.com/los-angeles/show/sinners-2025-dtla",
    );
  });

  it("builds a URL for a given market", () => {
    assert.strictEqual(
      bookingUrl({ market: "nyc", presentationSlug: "sinners-2025" }),
      "https://drafthouse.com/nyc/show/sinners-2025",
    );
  });

  it("encodes market and presentationSlug values", () => {
    assert.strictEqual(
      bookingUrl({
        market: "new york/city",
        presentationSlug: "a slug/with?chars",
      }),
      "https://drafthouse.com/new%20york%2Fcity/show/a%20slug%2Fwith%3Fchars",
    );
  });
});
