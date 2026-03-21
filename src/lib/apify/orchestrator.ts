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

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Orchestrate all Apify scraping for a FitCheck analysis job.
 *
 * Runs the following in parallel:
 *   1. Company website crawl
 *   2. Each competitor crawl (independent)
 *   3. Google search queries (mentions + news)
 *   4. Twitter/X mentions
 *   5. G2 structured reviews
 *   6. Trustpilot structured reviews
 *   7. LinkedIn job postings
 *   8. YouTube video search
 *   9. Product Hunt entries
 *  10. Google autocomplete suggestions
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

  // ── Build all tasks ────────────────────────────────────────────────────────

  const companyCrawlTask = runActor(
    ACTORS.WEBSITE_CRAWLER,
    buildWebsiteCrawlInput(request.websiteUrl, COMPANY_MAX_PAGES),
    120,
    512
  );

  const competitorCrawlTasks = competitorUrls.map((url) =>
    runActor(ACTORS.WEBSITE_CRAWLER, buildWebsiteCrawlInput(url, COMPETITOR_MAX_PAGES), 120, 256)
  );

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

  // ── Run everything in parallel ─────────────────────────────────────────────

  // Flatten competitor tasks so we can use a single Promise.allSettled call.
  // We track their count to split the results back out afterwards.
  const competitorCount = competitorCrawlTasks.length;

  const allResults = await Promise.allSettled([
    companyCrawlTask,          // index 0
    ...competitorCrawlTasks,   // indices 1 … competitorCount
    searchTask,                // competitorCount + 1
    tweetTask,                 // competitorCount + 2
    g2Task,                    // competitorCount + 3
    trustpilotTask,            // competitorCount + 4
    jobTask,                   // competitorCount + 5
    youtubeTask,               // competitorCount + 6
    productHuntTask,           // competitorCount + 7
    autocompleteTask,          // competitorCount + 8
  ]);

  const companyResult      = allResults[0];
  const competitorResults  = allResults.slice(1, 1 + competitorCount);
  const searchResult       = allResults[1 + competitorCount];
  const tweetResult        = allResults[2 + competitorCount];
  const g2Result           = allResults[3 + competitorCount];
  const trustpilotResult   = allResults[4 + competitorCount];
  const jobResult          = allResults[5 + competitorCount];
  const youtubeResult      = allResults[6 + competitorCount];
  const productHuntResult  = allResults[7 + competitorCount];
  const autocompleteResult = allResults[8 + competitorCount];

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
      warnings.push("Twitter/X scrape returned 0 mentions");
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
