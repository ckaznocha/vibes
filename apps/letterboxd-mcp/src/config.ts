/**
 * Parses the LETTERBOXD_CRAWL_DELAY_MS env var, falling back to 1000ms for
 * anything that isn't a finite, non-negative number (missing, empty string,
 * or a typo like "fast"). Using `??` alone only guards against `undefined`,
 * so an empty string or NaN would otherwise disable the crawl delay.
 */
export function parseCrawlDelayMs(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") return 1000;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 1000;
}
