/**
 * Actor IDs and input builder functions for Apify actors used by FitCheck.
 *
 * Owned by: apify agent
 */

// ─── Actor IDs ────────────────────────────────────────────────────────────────

export const ACTORS = {
  WEBSITE_CRAWLER: "apify/website-content-crawler",
  GOOGLE_SEARCH: "apify/google-search-scraper",
  TWEET_SCRAPER: "apidojo/tweet-scraper",
  G2_SCRAPER: "misceres/g2-scraper",
  TRUSTPILOT_SCRAPER: "epctex/trustpilot-scraper",
  JOB_SCRAPER: "helloitsjoe/linkedin-jobs-scraper",
  YOUTUBE_SCRAPER: "streamers/youtube-scraper",
  PRODUCT_HUNT_SCRAPER: "epctex/product-hunt-scraper",
  AUTOCOMPLETE_SCRAPER: "emastra/google-autocomplete-scraper",
} as const;

// ─── Input builders ───────────────────────────────────────────────────────────

/**
 * Input for apify/website-content-crawler.
 *
 * Uses the Cheerio crawler (fast, no JS rendering) which is sufficient for
 * marketing sites. maxCrawlPages is intentionally low to keep runs fast.
 */
export function buildWebsiteCrawlInput(
  url: string,
  maxPages: number
): Record<string, unknown> {
  return {
    startUrls: [{ url }],
    maxCrawlPages: maxPages,
    crawlerType: "cheerio",
    // Ask the actor to emit clean markdown for easier downstream processing
    saveMarkdown: true,
    saveHtml: false,
    maxCrawlDepth: 3,
    // Ignore binary assets and very large files
    excludeUrlGlobs: ["**/*.{pdf,zip,png,jpg,jpeg,gif,svg,woff,woff2,ttf,ico}"],
    // Respectful crawling
    maxRequestsPerMinute: 30,
  };
}

/**
 * Input for apify/google-search-scraper.
 *
 * One result page per query is enough for brand signal extraction —
 * we care about breadth across queries, not depth per query.
 */
export function buildSearchInput(
  queries: string[],
  resultsPerPage = 8
): Record<string, unknown> {
  return {
    queries: queries.join("\n"), // actor accepts newline-separated queries
    maxPagesPerQuery: 1,
    resultsPerPage,
    countryCode: "us",
    languageCode: "en",
    saveHtml: false,
    includeImages: false,
  };
}

/**
 * Input for apidojo/tweet-scraper.
 * Searches for tweets mentioning the company by keyword.
 */
export function buildTweetSearchInput(
  companyName: string,
  maxTweets = 30
): Record<string, unknown> {
  return {
    searchTerms: [companyName],
    maxTweets,
    queryType: "Latest",
    // Exclude retweets to get original mentions only
    filter: "no_retweets",
  };
}

/**
 * Input for misceres/g2-scraper.
 * Scrapes structured reviews from G2 for the given company search term.
 */
export function buildG2Input(companyName: string): Record<string, unknown> {
  return {
    searchQuery: companyName,
    maxReviews: 15,
    startUrls: [],
  };
}

/**
 * Input for epctex/trustpilot-scraper.
 * Searches Trustpilot for the company and scrapes structured reviews.
 */
export function buildTrustpilotInput(
  companyName: string
): Record<string, unknown> {
  return {
    search: companyName,
    maxReviews: 15,
    startUrls: [],
  };
}

/**
 * Input for helloitsjoe/linkedin-jobs-scraper.
 * Scrapes job postings to surface company strategy and hiring signals.
 */
export function buildJobSearchInput(
  companyName: string,
  maxJobs = 15
): Record<string, unknown> {
  return {
    queries: [companyName],
    maxJobs,
  };
}

/**
 * Input for streamers/youtube-scraper.
 * Searches YouTube for brand-related content: reviews, demos, comparisons.
 */
export function buildYouTubeSearchInput(
  companyName: string,
  maxResults = 10
): Record<string, unknown> {
  return {
    searchKeywords: companyName,
    maxResults,
    type: "video",
  };
}

/**
 * Input for epctex/product-hunt-scraper.
 * Finds Product Hunt launches for the company.
 */
export function buildProductHuntInput(
  companyName: string
): Record<string, unknown> {
  return {
    search: companyName,
    maxItems: 5,
    startUrls: [],
  };
}

/**
 * Input for emastra/google-autocomplete-scraper.
 * Reveals real search intent: "companyname pricing", "companyname vs X", etc.
 */
export function buildAutocompleteInput(
  companyName: string
): Record<string, unknown> {
  return {
    queries: [companyName],
    countryCode: "us",
    languageCode: "en",
  };
}

// ─── Search query builder ─────────────────────────────────────────────────────

/**
 * Generate a set of Google search queries for brand signal collection.
 *
 * Covers: reviews, Reddit mentions, G2/Trustpilot listings, HN mentions,
 * news/PR coverage, and competitive comparison queries.
 */
export function buildSearchQueries(
  companyName: string,
  competitorUrls: string[] = []
): string[] {
  const quoted = `"${companyName}"`;

  const base: string[] = [
    `${quoted} reviews`,
    `${quoted} site:reddit.com`,
    `${quoted} site:g2.com`,
    `${quoted} site:trustpilot.com`,
    `${quoted} site:news.ycombinator.com`,
    // News and PR coverage
    `${quoted} news OR "press release" OR announcement`,
    `${quoted} site:techcrunch.com OR site:venturebeat.com OR site:bloomberg.com`,
  ];

  // Add competitive comparison queries (one per competitor, capped at 3)
  const competitorNames = competitorUrls
    .slice(0, 3)
    .map(extractHostname)
    .filter(Boolean) as string[];

  for (const competitor of competitorNames) {
    base.push(`${companyName} vs ${competitor}`);
  }

  return base;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract the bare hostname from a URL for use in search queries.
 * Returns null if the URL is unparseable.
 */
export function extractHostname(url: string): string | null {
  try {
    const { hostname } = new URL(
      url.startsWith("http") ? url : `https://${url}`
    );
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
