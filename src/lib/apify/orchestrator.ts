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
  JobPosting,
  VideoResult,
  ProductHuntEntry,
} from "../types";
import { ALL_SCRAPER_SOURCES } from "../types";
import { runActor } from "./client";
import {
  ACTORS,
  buildWebsiteCrawlInput,
  buildSearchInput,
  buildSearchQueries,
  buildTweetSearchInput,
  buildG2Input,
  buildTrustpilotInput,
  buildJobSearchInput,
  buildYouTubeSearchInput,
  buildProductHuntInput,
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
  normalizeJobPostings,
  normalizeVideoResults,
  normalizeProductHuntEntries,
  normalizeAutocompleteSuggestions,
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
 * Website crawlers are run sequentially (company → competitors one-by-one)
 * to avoid hitting the free-plan concurrent memory ceiling.
 * All lighter actors (search, reviews, social, enrichment) run in parallel
 * while the crawlers are executing.
 *
 * Returns a fully-normalized ScrapedData. Any individual failure is captured
 * in `warnings` rather than thrown.
 */
export async function scrapeAll(request: AnalysisRequest): Promise<ScrapedData> {
  const warnings: string[] = [];
  const competitorUrls = request.competitorUrls ?? [];

  // Determine which optional sources are enabled (default: all)
  const selected = new Set(request.selectedSources ?? ALL_SCRAPER_SOURCES);

  /** Resolved empty array used as a no-op placeholder for skipped tasks. */
  const SKIPPED: Promise<unknown[]> = Promise.resolve([]);

  // ── Kick off lightweight tasks in parallel immediately ─────────────────────

  const searchQueries = buildSearchQueries(request.companyName, competitorUrls);
  const searchTask = selected.has("google_search")
    ? runActor(ACTORS.GOOGLE_SEARCH, buildSearchInput(searchQueries))
    : SKIPPED;

  const tweetTask = selected.has("twitter")
    ? runActor(ACTORS.TWEET_SCRAPER, buildTweetSearchInput(request.companyName))
    : SKIPPED;

  const g2Task = selected.has("reviews")
    ? runActor(ACTORS.G2_SCRAPER, buildG2Input(request.companyName))
    : SKIPPED;

  const trustpilotUrl = trustpilotUrlFromWebsite(request.websiteUrl);
  const trustpilotTask =
    selected.has("reviews") && trustpilotUrl
      ? runActor(ACTORS.TRUSTPILOT_SCRAPER, buildTrustpilotInput(trustpilotUrl))
      : SKIPPED;
  if (selected.has("reviews") && !trustpilotUrl) {
    warnings.push(`Trustpilot scrape skipped: could not derive URL from ${request.websiteUrl}`);
  }

  const jobTask = selected.has("enrichment")
    ? runActor(ACTORS.JOB_SCRAPER, buildJobSearchInput(request.companyName))
    : SKIPPED;

  const youtubeTask = selected.has("enrichment")
    ? runActor(ACTORS.YOUTUBE_SCRAPER, buildYouTubeSearchInput(request.companyName))
    : SKIPPED;

  const productHuntTask = selected.has("enrichment")
    ? runActor(ACTORS.PRODUCT_HUNT_SCRAPER, buildProductHuntInput(request.companyName))
    : SKIPPED;

  const autocompleteTask = selected.has("enrichment")
    ? runActor(ACTORS.AUTOCOMPLETE_SCRAPER, buildAutocompleteInput(request.companyName))
    : SKIPPED;

  const lightweightResults = Promise.allSettled([
    searchTask,      // 0
    tweetTask,       // 1
    g2Task,          // 2
    trustpilotTask,  // 3
    jobTask,         // 4
    youtubeTask,     // 5
    productHuntTask, // 6
    autocompleteTask,// 7
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

  // ── Collect lightweight results ────────────────────────────────────────────

  const lw = await lightweightResults;
  const searchResult       = lw[0];
  const tweetResult        = lw[1];
  const g2Result           = lw[2];
  const trustpilotResult   = lw[3];
  const jobResult          = lw[4];
  const youtubeResult      = lw[5];
  const productHuntResult  = lw[6];
  const autocompleteResult = lw[7];

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

  // ── Mentions (Google search results) ──────────────────────────────────────

  const mentions =
    searchResult?.status === "fulfilled"
      ? normalizeMentions(searchResult.value)
      : [];

  if (!selected.has("google_search")) {
    // intentionally skipped — no warning
  } else if (searchResult?.status === "rejected") {
    warnings.push(`Google search scrape failed: ${stringifyError(searchResult.reason)}`);
  } else if (mentions.length === 0) {
    warnings.push("Google search returned 0 mentions");
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

  // ── Job postings ───────────────────────────────────────────────────────────

  let jobPostings: JobPosting[] | undefined;
  if (!selected.has("enrichment")) {
    // intentionally skipped
  } else if (jobResult?.status === "fulfilled") {
    const jobs = normalizeJobPostings(jobResult.value);
    jobPostings = jobs.length > 0 ? jobs : undefined;
    if (jobs.length === 0) {
      warnings.push("Job posting scrape returned 0 results");
    }
  } else if (jobResult?.status === "rejected") {
    warnings.push(`Job posting scrape failed: ${stringifyError(jobResult.reason)}`);
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

  // ── Product Hunt ───────────────────────────────────────────────────────────

  let productHuntEntries: ProductHuntEntry[] | undefined;
  if (!selected.has("enrichment")) {
    // intentionally skipped
  } else if (productHuntResult?.status === "fulfilled") {
    const ph = normalizeProductHuntEntries(productHuntResult.value);
    productHuntEntries = ph.length > 0 ? ph : undefined;
    if (ph.length === 0) {
      warnings.push("Product Hunt scrape returned 0 entries");
    }
  } else if (productHuntResult?.status === "rejected") {
    warnings.push(`Product Hunt scrape failed: ${stringifyError(productHuntResult.reason)}`);
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
    jobPostings,
    videos,
    productHuntEntries,
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
