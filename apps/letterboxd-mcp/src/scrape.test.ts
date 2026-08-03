import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { parseWatchlistPage } from "./scrape.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  readFileSync(path.join(__dirname, "fixtures", name), "utf8");

describe("parseWatchlistPage", () => {
  it("parses films from a normal watchlist page", () => {
    const result = parseWatchlistPage(fixture("watchlist-normal-page1.html"));
    assert.strictEqual(result.hasContainer, true);
    assert.deepStrictEqual(result.films, [
      { slug: "chrome-meridian", title: "Chrome Meridian", year: 2021 },
      { slug: "nightjar-boulevard", title: "Nightjar Boulevard", year: 2019 },
      { slug: "saltwater-reverie", title: "Saltwater Reverie", year: 1978 },
    ]);
  });

  it("returns an empty film list with hasContainer true for an empty container page", () => {
    const result = parseWatchlistPage(
      fixture("watchlist-empty-container.html"),
    );
    assert.strictEqual(result.hasContainer, true);
    assert.deepStrictEqual(result.films, []);
  });

  it("returns hasContainer false when the watchlist container markup is missing", () => {
    const result = parseWatchlistPage(fixture("watchlist-malformed.html"));
    assert.strictEqual(result.hasContainer, false);
    assert.deepStrictEqual(result.films, []);
  });

  it("treats a non-numeric release year attribute as null instead of NaN", () => {
    const html = `<div class="poster-list"><li class="poster-container"><div class="poster" data-target-link="/film/chrome-meridian/" data-film-name="Chrome Meridian" data-film-release-year="unknown"></div></li></div>`;
    const result = parseWatchlistPage(html);
    assert.deepStrictEqual(result.films, [
      { slug: "chrome-meridian", title: "Chrome Meridian", year: null },
    ]);
  });
});
