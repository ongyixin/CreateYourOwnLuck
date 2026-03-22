/**
 * Apify scraping orchestrator.
 *
 * Runs all scraping jobs in parallel using Promise.allSettled — partial
 * failures produce warnings but never crash the pipeline.
 *
 * Exported surface:
 *   scrapeAll(request) → Promise<ScrapedData>
 *
 * Owned by: apify agent
 */

import type {
  AnalysisRequest,
  ScrapedData,
  ScrapedPage,
  StructuredReview,
  SocialMention,
  VideoResult,
} from "../types";
import { ALL_SCRAPER_SOURCES } from "../types";
import { runActor } from "./client";
import {
  ACTORS,
  buildWebsiteCrawlInput,
  buildSearchInput,
  buildSearchQueries,
  buildTweetSearchInput,
  buildG2InputFromUrl,
  buildTrustpilotInput,
  extractHostname,
  trustpilotUrlFromWebsite,
} from "./actors";
import {
  normalizeWebsiteItems,
  normalizeMentions,
  normalizeG2Reviews,
  normalizeTrustpilotReviews,
  normalizeTweets,
  normalizeVideoResults,
  normalizeAutocompleteSuggestions,
  extractG2UrlFromMentions,
} from "./normalizer";

// ─── Page limits ──────────────────────────────────────────────────────────────

/** Max pages to crawl for the company's own site. */
const COMPANY_MAX_PAGES = 8;

/** Max pages to crawl per competitor site. */
const COMPETITOR_MAX_PAGES = 4;

// ─── Memory limits ────────────────────────────────────────────────────────────

/**
 * Cheerio is a pure-JS HTML parser; 256 MB is comfortably sufficient for
 * crawling 4-8 marketing pages. (Browser-based runs would need 1024 MB, but
 * we use crawlerType:"cheerio" which skips Playwright/xvfb entirely.)
 */
const CRAWLER_MEMORY_MB = 256;

// ─── Concurrency limit ────────────────────────────────────────────────────────

/**
 * Maximum number of website-content-crawler actors running simultaneously.
 * Keeps aggregate memory within Apify plan limits while still parallelising
 * company + competitor crawls.
 */
const MAX_CONCURRENT_CRAWLERS = 3;

// ─── Concurrency pool helper ──────────────────────────────────────────────────

/**
 * Run an array of async task factories with at most `limit` running at once.
 * Returns results in the same order as the input array, each wrapped in
 * PromiseSettledResult so individual failures don't abort the pool.
 */
async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < tasks.length) {
      const index = next++;
      try {
        results[index] = { status: "fulfilled", value: await tasks[index]() };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, worker)
  );

  return results;
}

// ─── Direct HTTP scrapers (no Apify overhead) ─────────────────────────────────

/**
 * Fetch Google autocomplete suggestions via the public Suggest API.
 * Returns data shaped for normalizeAutocompleteSuggestions.
 *
 * ~200 ms vs ~20 s Apify container startup.
 */
async function directAutocomplete(companyName: string): Promise<unknown[]> {
  const url =
    `https://suggestqueries.google.com/complete/search?client=firefox` +
    `&q=${encodeURIComponent(companyName)}&hl=en&gl=us`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FitCheck/1.0)" },
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) throw new Error(`Autocomplete request failed: HTTP ${res.status}`);

  // Response: ["query", ["suggestion1", "suggestion2", ...], ...]
  const json = (await res.json()) as unknown[];
  const suggestions = (json?.[1] as string[]) ?? [];

  // Return in the shape normalizeAutocompleteSuggestions expects
  return [{ suggestions }];
}

/**
 * Search YouTube directly, extracting results from the embedded ytInitialData
 * JSON in the search results page.
 * Returns data shaped for normalizeVideoResults.
 *
 * ~1-2 s vs ~20 s Apify container startup.
 */
async function directYouTubeSearch(
  companyName: string,
  maxResults = 10
): Promise<unknown[]> {
  // sp=EgIQAQ%3D%3D filters to videos only
  const url =
    `https://www.youtube.com/results?search_query=` +
    `${encodeURIComponent(companyName)}&sp=EgIQAQ%3D%3D`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`YouTube search failed: HTTP ${res.status}`);

  const html = await res.text();

  // ytInitialData is always in its own <script> block ending in `;</script>`
  const MARKER = "var ytInitialData = ";
  const markerIdx = html.indexOf(MARKER);
  if (markerIdx === -1) throw new Error("YouTube: ytInitialData not found");

  const jsonStart = markerIdx + MARKER.length;
  const jsonEnd = html.indexOf(";</script>", jsonStart);
  if (jsonEnd === -1) throw new Error("YouTube: could not find end of ytInitialData");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = JSON.parse(html.slice(jsonStart, jsonEnd));

  const contents: unknown[] =
    data?.contents
      ?.twoColumnSearchResultsRenderer
      ?.primaryContents
      ?.sectionListRenderer
      ?.contents?.[0]
      ?.itemSectionRenderer
      ?.contents ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const joinRuns = (obj: any): string =>
    obj?.runs?.map((r: { text?: string }) => r.text ?? "").join("") ?? "";

  const results: unknown[] = [];
  for (const item of contents) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vr = (item as any)?.videoRenderer;
    if (!vr?.videoId) continue;

    results.push({
      url: `https://www.youtube.com/watch?v=${vr.videoId}`,
      title: joinRuns(vr.title),
      channelName: joinRuns(vr.ownerText) || joinRuns(vr.longBylineText),
      viewCount: vr.viewCountText?.simpleText ?? "0",
      description:
        joinRuns(vr.detailedMetadataSnippets?.[0]?.snippetText) ||
        joinRuns(vr.descriptionSnippet),
    });

    if (results.length >= maxResults) break;
  }

  return results;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Orchestrate all Apify scraping for a FitCheck analysis job.
 *
 * All independent tasks are fired immediately and run in parallel:
 *   - Google Search, Tweets, Trustpilot, YouTube, Autocomplete: unrestricted
 *   - Website crawlers (company + competitors): pooled to MAX_CONCURRENT_CRAWLERS
 *   - G2: chained off Google Search (needs the confirmed product URL)
 *
 * This means wall time ≈ max(slowest crawler, G2 chain) rather than the sum
 * of all tasks. With a company + 2 competitors the expected improvement is
 * roughly 2-3× over the previous sequential crawler approach.
 *
 * Any individual failure is captured in `warnings` rather than thrown.
 */
export async function scrapeAll(request: AnalysisRequest): Promise<ScrapedData> {
  const warnings: string[] = [];
  const competitorUrls = request.competitorUrls ?? [];

  // Determine which optional sources are enabled (default: all)
  const selected = new Set(request.selectedSources ?? ALL_SCRAPER_SOURCES);

  /** Resolved empty array used as a no-op placeholder for skipped tasks. */
  const SKIPPED: Promise<unknown[]> = Promise.resolve([]);

  // ── Lightweight tasks — all start immediately ──────────────────────────────

  const searchTask = selected.has("google_search")
    ? runActor(ACTORS.GOOGLE_SEARCH, buildSearchInput(buildSearchQueries(request.companyName, competitorUrls)))
    : SKIPPED;

  const tweetTask = selected.has("twitter")
    ? runActor(ACTORS.TWEET_SCRAPER, buildTweetSearchInput(request.companyName))
    : SKIPPED;

  const trustpilotUrl = trustpilotUrlFromWebsite(request.websiteUrl);
  const trustpilotTask =
    selected.has("reviews") && trustpilotUrl
      ? runActor(ACTORS.TRUSTPILOT_SCRAPER, buildTrustpilotInput(trustpilotUrl))
      : SKIPPED;
  if (selected.has("reviews") && !trustpilotUrl) {
    warnings.push(`Trustpilot scrape skipped: could not derive URL from ${request.websiteUrl}`);
  }

  const youtubeTask = selected.has("enrichment")
    ? directYouTubeSearch(request.companyName)
    : SKIPPED;

  const autocompleteTask = selected.has("enrichment")
    ? directAutocomplete(request.companyName)
    : SKIPPED;

  // ── G2: chains off search so we get the real product page URL ─────────────
  // This is the only task with a data dependency. It begins as soon as the
  // Google Search actor resolves — it does NOT block the crawlers.
  const g2Task: Promise<unknown[]> = selected.has("reviews")
    ? searchTask
        .then((rawSearchItems) => {
          const g2Url = extractG2UrlFromMentions(normalizeMentions(rawSearchItems));
          if (!g2Url) return [];
          return runActor(ACTORS.G2_SCRAPER, buildG2InputFromUrl(g2Url));
        })
        .catch(() => [])
    : SKIPPED;

  // ── Website crawlers — parallel, pooled to MAX_CONCURRENT_CRAWLERS ─────────
  // Cheerio-based crawls use 512 MB each; pooling to 3 concurrent runs keeps
  // aggregate memory well within Apify plan limits while eliminating the
  // old one-at-a-time sequential bottleneck.
  const allCrawlUrls = [request.websiteUrl, ...competitorUrls];
  const crawlerTasks = allCrawlUrls.map((url, i) => {
    const isCompany = i === 0;
    return () =>
      runActor(
        ACTORS.WEBSITE_CRAWLER,
        buildWebsiteCrawlInput(url, isCompany ? COMPANY_MAX_PAGES : COMPETITOR_MAX_PAGES),
        180,
        CRAWLER_MEMORY_MB
      );
  });

  // ── Fan-out: await everything together ────────────────────────────────────
  const [lightweightSettled, allCrawlerResults] = await Promise.all([
    Promise.allSettled([searchTask, tweetTask, g2Task, trustpilotTask, youtubeTask, autocompleteTask]),
    runWithConcurrency(crawlerTasks, MAX_CONCURRENT_CRAWLERS),
  ]);

  const [searchResult, tweetResult, g2Result, trustpilotResult, youtubeResult, autocompleteResult] =
    lightweightSettled;

  const companyResult = allCrawlerResults[0];
  const competitorResults = allCrawlerResults.slice(1);

  // ── Derive mentions from search results ────────────────────────────────────

  let searchItems: unknown[] = [];
  if (searchResult.status === "fulfilled") {
    searchItems = searchResult.value;
  } else {
    warnings.push(`Google search scrape failed: ${stringifyError(searchResult.reason)}`);
  }

  const mentions = normalizeMentions(searchItems);

  if (selected.has("google_search") && searchItems.length > 0 && mentions.length === 0) {
    warnings.push("Google search returned 0 mentions");
  }

  // Warn when G2 was requested but the search returned no G2 URL.
  // We inspect after the fact because the g2Task handled it internally.
  if (selected.has("reviews") && searchResult.status === "fulfilled") {
    const g2Url = extractG2UrlFromMentions(mentions);
    if (!g2Url) {
      warnings.push("G2 scrape skipped: no G2 product page found in search results");
    }
  }

  // ── Company pages ──────────────────────────────────────────────────────────

  let companyPages: ScrapedPage[] = [];
  if (companyResult.status === "fulfilled") {
    companyPages = normalizeWebsiteItems(companyResult.value, request.websiteUrl);
    if (companyPages.length === 0) {
      warnings.push(`Company website crawl returned 0 pages for ${request.websiteUrl}`);
    }
  } else {
    warnings.push(
      `Company website crawl failed: ${stringifyError(companyResult.reason)}`
    );
  }

  // ── Competitor pages ───────────────────────────────────────────────────────

  const competitorPages: ScrapedPage[] = [];

  for (let i = 0; i < competitorResults.length; i++) {
    const competitorUrl = competitorUrls[i];
    const result = competitorResults[i];

    if (result.status === "fulfilled") {
      const pages = normalizeWebsiteItems(result.value, competitorUrl);
      for (const page of pages) {
        competitorPages.push({
          ...page,
          title: page.title
            ? `[${extractHostname(competitorUrl) ?? competitorUrl}] ${page.title}`
            : extractHostname(competitorUrl) ?? competitorUrl,
        });
      }
      if (pages.length === 0) {
        warnings.push(`Competitor crawl for ${competitorUrl} returned 0 pages`);
      }
    } else {
      warnings.push(
        `Competitor crawl failed for ${competitorUrl}: ${stringifyError(result.reason)}`
      );
    }
  }

  // ── Social mentions (Twitter/X) ────────────────────────────────────────────

  let socialMentions: SocialMention[] | undefined;
  if (!selected.has("twitter")) {
    // intentionally skipped
  } else if (tweetResult?.status === "fulfilled") {
    const normalized = normalizeTweets(tweetResult.value);
    socialMentions = normalized.length > 0 ? normalized : undefined;
    if (normalized.length === 0) {
      const rawCount = (tweetResult.value as unknown[]).length;
      warnings.push(
        rawCount === 0
          ? "Twitter/X scrape returned 0 tweets (actor returned no results)"
          : `Twitter/X scrape returned 0 mentions after filtering (${rawCount} raw tweets discarded)`
      );
    }
  } else if (tweetResult?.status === "rejected") {
    warnings.push(`Twitter/X scrape failed: ${stringifyError(tweetResult.reason)}`);
  }

  // ── G2 reviews ─────────────────────────────────────────────────────────────

  let reviews: StructuredReview[] | undefined;

  if (!selected.has("reviews")) {
    // intentionally skipped
  } else if (g2Result?.status === "fulfilled") {
    const g2 = normalizeG2Reviews(g2Result.value);
    reviews = g2.length > 0 ? g2 : undefined;
    if (g2.length === 0) {
      warnings.push("G2 scrape returned 0 reviews");
    }
  } else if (g2Result?.status === "rejected") {
    warnings.push(`G2 scrape failed: ${stringifyError(g2Result.reason)}`);
  }

  // ── Trustpilot reviews ─────────────────────────────────────────────────────

  if (!selected.has("reviews")) {
    // intentionally skipped
  } else if (trustpilotResult?.status === "fulfilled") {
    const tp = normalizeTrustpilotReviews(trustpilotResult.value);
    if (tp.length > 0) {
      reviews = reviews ? [...reviews, ...tp] : tp;
    } else {
      warnings.push("Trustpilot scrape returned 0 reviews");
    }
  } else if (trustpilotResult?.status === "rejected") {
    warnings.push(`Trustpilot scrape failed: ${stringifyError(trustpilotResult.reason)}`);
  }

  // Cap combined reviews at 20
  if (reviews && reviews.length > 20) {
    reviews = reviews.slice(0, 20);
  }

  // ── YouTube videos ─────────────────────────────────────────────────────────

  let videos: VideoResult[] | undefined;
  if (!selected.has("enrichment")) {
    // intentionally skipped
  } else if (youtubeResult?.status === "fulfilled") {
    const vids = normalizeVideoResults(youtubeResult.value);
    videos = vids.length > 0 ? vids : undefined;
    if (vids.length === 0) {
      warnings.push("YouTube scrape returned 0 videos");
    }
  } else if (youtubeResult?.status === "rejected") {
    warnings.push(`YouTube scrape failed: ${stringifyError(youtubeResult.reason)}`);
  }

  // ── Autocomplete ───────────────────────────────────────────────────────────

  let autocompleteSuggestions: string[] | undefined;
  if (!selected.has("enrichment")) {
    // intentionally skipped
  } else if (autocompleteResult?.status === "fulfilled") {
    const ac = normalizeAutocompleteSuggestions(autocompleteResult.value);
    autocompleteSuggestions = ac.length > 0 ? ac : undefined;
    if (ac.length === 0) {
      warnings.push("Autocomplete scrape returned 0 suggestions");
    }
  } else if (autocompleteResult?.status === "rejected") {
    warnings.push(`Autocomplete scrape failed: ${stringifyError(autocompleteResult.reason)}`);
  }

  return {
    companyPages,
    competitorPages,
    mentions,
    reviews,
    socialMentions,
    videos,
    autocompleteSuggestions,
    warnings,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stringifyError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
