import {
  type Browser,
  chromium,
  type Page,
  type Response as PlaywrightResponse,
} from "playwright-core";

export interface BrowserCapture {
  capture: CaptureJson;
  close: () => Promise<void>;
}

export type CaptureJson = (request: CaptureRequest) => Promise<unknown>;

/**
 * Every request this server makes to Alamo is made *by drafthouse.com's own page*, not by
 * us. We drive the real site in a real browser and read the JSON it fetches for itself.
 *
 * That is a deliberate compliance choice, not a technical preference. `robots.txt` is
 * `Disallow: /s/`, and both feeds this server reads live under `/s/` — there is no
 * robots-permitted URL that carries the data, because the public pages are an empty SPA
 * shell. Loading the official interface and observing its own traffic keeps those requests
 * first-party page behavior rather than hand-crafted calls to a reverse-engineered
 * endpoint. See the README's "How this server talks to Alamo" section before changing it.
 */
export interface CaptureRequest {
  /** Matched against response URLs; the first JSON body that matches wins. */
  match: RegExp;
  timeoutMs?: number;
  /** Page to navigate to, whose own scripts issue the request we want. */
  url: string;
}

export class BrowserUnavailableError extends Error {
  constructor(cdpUrl: string, cause: unknown) {
    super(
      `could not attach to a browser at ${cdpUrl}. alamo-mcp drives drafthouse.com in a ` +
        `real browser, so one must be running with remote debugging enabled, e.g. ` +
        `"chrome --remote-debugging-port=9222". Set ALAMO_BROWSER_CDP_URL to its endpoint. ` +
        `Underlying error: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    this.name = "BrowserUnavailableError";
  }
}

export class CaptureTimeoutError extends Error {
  constructor(url: string, match: RegExp, timeoutMs: number) {
    super(
      `loaded ${url} but saw no response matching ${match.source} within ${String(timeoutMs)}ms. ` +
        `The page may have changed which endpoint it calls, or the session/market may not exist.`,
    );
    this.name = "CaptureTimeoutError";
  }
}

/**
 * Attaches to an already-running browser over CDP rather than downloading or launching
 * one: this is meant to be *the user's own browser*, and it keeps the published package
 * free of a ~150MB Chromium.
 */
export function createBrowserCapture(options: {
  cdpUrl: string;
  defaultTimeoutMs?: number;
}): BrowserCapture {
  const { cdpUrl, defaultTimeoutMs = 30_000 } = options;
  let browser: Browser | undefined;
  let page: Page | undefined;

  async function getPage(): Promise<Page> {
    if (page && !page.isClosed() && browser?.isConnected()) return page;
    try {
      browser = await chromium.connectOverCDP(cdpUrl);
      // Reuse the existing context so this rides on the user's real browser profile
      // rather than spawning an isolated one.
      const [existing] = browser.contexts();
      const context = existing ?? (await browser.newContext());
      page = await context.newPage();
      return page;
    } catch (error) {
      throw new BrowserUnavailableError(cdpUrl, error);
    }
  }

  return {
    capture: async ({ match, timeoutMs = defaultTimeoutMs, url }) => {
      const target = await getPage();
      const { promise: matched, resolve } = Promise.withResolvers<unknown>();

      const onResponse = (response: PlaywrightResponse) => {
        if (!match.test(response.url())) return;
        void (async () => {
          try {
            resolve(await response.json());
          } catch {
            // Non-JSON body on a matching URL: keep waiting for a usable one.
          }
        })();
      };

      target.on("response", onResponse);
      try {
        // "commit" resolves as soon as navigation is committed, so we wait on the XHR
        // the page makes rather than on every subresource finishing.
        await target.goto(url, { waitUntil: "commit" });
        const timedOut = Symbol("timed-out");
        const body = await Promise.race([
          matched,
          (async () => {
            await target.waitForTimeout(timeoutMs);
            return timedOut;
          })(),
        ]);
        if (body === timedOut) {
          throw new CaptureTimeoutError(url, match, timeoutMs);
        }
        return body;
      } finally {
        target.off("response", onResponse);
      }
    },
    close: async () => {
      try {
        await page?.close();
        await browser?.close();
      } catch {
        // Browser already gone; nothing to release.
      }
      page = undefined;
      browser = undefined;
    },
  };
}
