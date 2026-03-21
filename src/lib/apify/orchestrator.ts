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
  buildYouTubeSearchInput,
  buildAutocompleteInput,
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
 * The website-content-crawler container bundles full browser binaries (xvfb +
 * Playwright) even for Cheerio runs. It needs at least 1024 MB to start.
 */
const CRAWLER_MEMORY_COMPANY_MB = 1024;
const CRAWLER_MEMORY_COMPETITOR_MB = 1024;

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Orchestrate all Apify scraping for a FitCheck analysis job.
 *
 * Two-phase execution:
 *
 * Phase 1 — Google search (awaited):
 *   Runs first so we can discover the real G2 URL from the `site:g2.com`
 *   query. Guessing slugs from company names caused hard FAILED runs in the
 *   G2 actor; using a confirmed URL from search results eliminates that
 *   class of failure entirely.
 *
 * Phase 2 — Everything else (parallel):
 *   Twitter, G2 (real URL from Phase 1, skipped if not found), Trustpilot,
 *   YouTube, and Autocomplete run in parallel. Website crawlers are also
 *   started here but run sequentially to stay within
 *   the free-plan concurrent memory ceiling.
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

  // ── Phase 1: Google search ─────────────────────────────────────────────────
  // Run first so we can extract real G2 + PH URLs before launching Phase 2.

  const searchQueries = buildSearchQueries(request.companyName, competitorUrls);
  let searchItems: unknown[] = [];
  if (selected.has("google_search")) {
    try {
      searchItems = await runActor(ACTORS.GOOGLE_SEARCH, buildSearchInput(searchQueries)) as unknown[];
    } catch (err) {
      warnings.push(`Google search scrape failed: ${stringifyError(err)}`);
    }
  }

  const mentions = normalizeMentions(searchItems);

  if (selected.has("google_search") && searchItems.length > 0 && mentions.length === 0) {
    warnings.push("Google search returned 0 mentions");
  }

  // Discover real G2 URL from search results (avoids slug-guessing failures).
  const g2Url = extractG2UrlFromMentions(mentions);

  // ── Phase 2: All remaining lightweight tasks (parallel) ────────────────────

  const tweetTask = selected.has("twitter")
    ? runActor(ACTORS.TWEET_SCRAPER, buildTweetSearchInput(request.companyName))
    : SKIPPED;

  const g2Task = selected.has("reviews") && g2Url
    ? runActor(ACTORS.G2_SCRAPER, buildG2InputFromUrl(g2Url))
    : SKIPPED;
  if (selected.has("reviews") && !g2Url) {
    warnings.push("G2 scrape skipped: no G2 product page found in search results");
  }

  const trustpilotUrl = trustpilotUrlFromWebsite(request.websiteUrl);
  const trustpilotTask =
    selected.has("reviews") && trustpilotUrl
      ? runActor(ACTORS.TRUSTPILOT_SCRAPER, buildTrustpilotInput(trustpilotUrl))
      : SKIPPED;
  if (selected.has("reviews") && !trustpilotUrl) {
    warnings.push(`Trustpilot scrape skipped: could not derive URL from ${request.websiteUrl}`);
  }

  const youtubeTask = selected.has("enrichment")
    ? runActor(ACTORS.YOUTUBE_SCRAPER, buildYouTubeSearchInput(request.companyName))
    : SKIPPED;

  const autocompleteTask = selected.has("enrichment")
    ? runActor(ACTORS.AUTOCOMPLETE_SCRAPER, buildAutocompleteInput(request.companyName))
    : SKIPPED;

  const lightweightResults = Promise.allSettled([
    tweetTask,       // 0
    g2Task,          // 1
    trustpilotTask,  // 2
    youtubeTask,     // 3
    autocompleteTask,// 4
  ]);

  // ── Run crawlers sequentially to stay within concurrent memory limits ───────
  // Each website-content-crawler container needs ~1 GB just to start (it bundles
  // Playwright + xvfb). Running them in parallel would exceed the free-plan cap.

  const companyResult = await Promise.allSettled([
    runActor(
      ACTORS.WEBSITE_CRAWLER,
      buildWebsiteCrawlInput(request.websiteUrl, COMPANY_MAX_PAGES),
      180,
      CRAWLER_MEMORY_COMPANY_MB
    ),
  ]).then((r) => r[0]);

  const competitorResults: PromiseSettledResult<unknown[]>[] = [];
  for (const url of competitorUrls) {
    const result = await Promise.allSettled([
      runActor(
        ACTORS.WEBSITE_CRAWLER,
        buildWebsiteCrawlInput(url, COMPETITOR_MAX_PAGES),
        180,
        CRAWLER_MEMORY_COMPETITOR_MB
      ),
    ]).then((r) => r[0]);
    competitorResults.push(result);
  }

  // ── Collect Phase 2 results ────────────────────────────────────────────────

  const lw = await lightweightResults;
  const tweetResult        = lw[0];
  const g2Result           = lw[1];
  const trustpilotResult   = lw[2];
  const youtubeResult      = lw[3];
  const autocompleteResult = lw[4];

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
