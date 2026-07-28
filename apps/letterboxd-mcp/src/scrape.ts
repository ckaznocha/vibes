import * as cheerio from "cheerio";

export interface RawFilm {
  slug: string;
  title: string;
  year: null | number;
}

export interface WatchlistPageResult {
  films: RawFilm[];
  hasContainer: boolean;
}

export function parseWatchlistPage(html: string): WatchlistPageResult {
  const $ = cheerio.load(html);
  const container = $(".poster-list");
  const hasContainer = container.length > 0;
  if (!hasContainer) {
    return { films: [], hasContainer: false };
  }

  const films: RawFilm[] = [];
  container.find("[data-target-link]").each((_, element) => {
    const $element = $(element);
    const targetLink = $element.attr("data-target-link");
    const title = $element.attr("data-film-name");
    if (!targetLink || !title) return;

    const slugMatch = /^\/film\/([^/]+)\/?$/.exec(targetLink);
    const slug = slugMatch?.[1];
    if (!slug) return;

    const yearAttribute = $element.attr("data-film-release-year");
    const parsedYear = Number(yearAttribute);
    films.push({
      slug,
      title,
      year: yearAttribute && Number.isFinite(parsedYear) ? parsedYear : null,
    });
  });

  return { films, hasContainer: true };
}
