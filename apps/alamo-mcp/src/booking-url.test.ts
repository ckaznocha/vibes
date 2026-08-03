import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bookingUrl } from "./booking-url.ts";

describe("bookingUrl", () => {
  it("builds a URL defaulting to the austin market", () => {
    assert.strictEqual(
      bookingUrl({ presentationSlug: "chrome-meridian" }),
      "https://drafthouse.com/austin/show/chrome-meridian",
    );
  });

  it("builds a URL for a given market", () => {
    assert.strictEqual(
      bookingUrl({ market: "nyc", presentationSlug: "chrome-meridian" }),
      "https://drafthouse.com/nyc/show/chrome-meridian",
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
