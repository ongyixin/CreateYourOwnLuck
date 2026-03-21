/**
 * Normalizes raw Apify actor output into FitCheck's shared ScrapedData types.
 *
 * Raw shapes vary between actor versions; all field access is defensive.
 * Content is truncated to prevent context-window overflow in the AI layer.
 *
 * Owned by: apify agent
 */

import type {
  ScrapedPage,
  PublicMention,
  StructuredReview,
  SocialMention,
  JobPosting,
  VideoResult,
  ProductHuntEntry,
} from "../types";

// Internal type used only for sorting — stripped before returning ScrapedPage[]
type ScoredPage = ScrapedPage & { _isHomepage: boolean };

// ─── Content limits ───────────────────────────────────────────────────────────

/** Max characters of page content passed to the AI layer. */
const MAX_PAGE_CONTENT_CHARS = 8_000;

/** Max characters per search result snippet. */
const MAX_SNIPPET_CHARS = 500;

// ─── Source detection ─────────────────────────────────────────────────────────

const SOURCE_PATTERNS: Array<{
  pattern: RegExp;
  source: PublicMention["source"];
}> = [
  { pattern: /reddit\.com/i, source: "reddit" },
  { pattern: /news\.ycombinator\.com|hn\.algolia\.com/i, source: "hackernews" },
  { pattern: /g2\.com/i, source: "g2" },
  { pattern: /trustpilot\.com/i, source: "trustpilot" },
  {
    pattern: /techcrunch\.com|venturebeat\.com|bloomberg\.com|reuters\.com|cnbc\.com|forbes\.com|businessinsider\.com/i,
    source: "news",
  },
];

function detectSource(url: string): PublicMention["source"] {
  for (const { pattern, source } of SOURCE_PATTERNS) {
    if (pattern.test(url)) return source;
  }
  return "other";
}

// ─── Website crawler normalizer ───────────────────────────────────────────────

/**
 * Raw item shape emitted by apify/website-content-crawler.
 * Fields are optional because the actor version and crawl config can vary.
 */
interface RawCrawlerItem {
  url?: string;
  loadedUrl?: string;
  title?: string;
  markdown?: string;
  text?: string;
  metadata?: { title?: string; description?: string };
  crawl?: { loadedAt?: string };
}

/**
 * Convert raw website-content-crawler items into ScrapedPage[].
 *
 * @param items     Raw dataset items (unknown type — we cast defensively)
 * @param baseUrl   The URL the crawl started from, used to detect the homepage
 */
export function normalizeWebsiteItems(
  items: unknown[],
  baseUrl?: string
): ScrapedPage[] {
  const seen = new Set<string>();
  const pages: ScoredPage[] = [];

  for (const raw of items) {
    const item = raw as RawCrawlerItem;

    const url = item.url ?? item.loadedUrl ?? "";
    if (!url) continue;

    // Deduplicate by URL
    const normalizedUrl = url.split("?")[0].replace(/\/$/, "");
    if (seen.has(normalizedUrl)) continue;
    seen.add(normalizedUrl);

    const title =
      item.title ??
      item.metadata?.title ??
      "";

    // Prefer markdown over plain text; fall back to empty string
    const rawContent = item.markdown ?? item.text ?? "";
    const content = truncate(rawContent, MAX_PAGE_CONTENT_CHARS);

    const _isHomepage = baseUrl
      ? isSameOriginRoot(url, baseUrl)
      : isRootPath(url);

    const scrapedAt =
      item.crawl?.loadedAt ?? new Date().toISOString();

    pages.push({ url, title, content, scrapedAt, _isHomepage });
  }

  // Sort: homepage first, then by content length descending (richer pages are more useful).
  // Strip the internal _isHomepage field before returning.
  return pages
    .sort((a, b) => {
      if (a._isHomepage && !b._isHomepage) return -1;
      if (!a._isHomepage && b._isHomepage) return 1;
      return b.content.length - a.content.length;
    })
    .map(({ _isHomepage: _discarded, ...page }) => page);
}

// ─── Google search normalizer ─────────────────────────────────────────────────

/**
 * Raw item shape emitted by apify/google-search-scraper.
 * The actor emits one item per result page, containing an array of organic results.
 */
interface RawSearchItem {
  searchQuery?: { term?: string; page?: number };
  organicResults?: RawOrganicResult[];
}

interface RawOrganicResult {
  url?: string;
  title?: string;
  description?: string;
  snippet?: string;
}

/**
 * Convert raw google-search-scraper items into PublicMention[].
 * The actor interleaves results from all queries; source is detected from URL.
 *
 * @param items   Raw dataset items
 */
export function normalizeMentions(items: unknown[]): PublicMention[] {
  const seen = new Set<string>();
  const mentions: PublicMention[] = [];

  for (const raw of items) {
    const item = raw as RawSearchItem;
    const organic = item.organicResults ?? [];

    for (const result of organic) {
      const url = result.url ?? "";
      if (!url || seen.has(url)) continue;
      seen.add(url);

      const title = result.title ?? "";
      const rawSnippet = result.description ?? result.snippet ?? "";
      const snippet = truncate(rawSnippet, MAX_SNIPPET_CHARS);
      const source = detectSource(url);
      const scrapedAt = new Date().toISOString();

      mentions.push({ url, title, snippet, source, scrapedAt });
    }
  }

  return mentions;
}

// ─── G2 review normalizer ─────────────────────────────────────────────────────

interface RawG2Review {
  url?: string;
  title?: string;
  rating?: number;
  reviewerTitle?: string;
  pros?: string;
  cons?: string;
  review?: string;
  body?: string;
  date?: string;
}

/**
 * Convert raw G2 scraper items into StructuredReview[].
 * Caps at 15 reviews, truncates review text to 300 chars.
 */
export function normalizeG2Reviews(items: unknown[]): StructuredReview[] {
  const reviews: StructuredReview[] = [];

  for (const raw of items.slice(0, 15)) {
    const item = raw as RawG2Review;
    const reviewText = item.review ?? item.body ?? "";
    if (!reviewText) continue;

    reviews.push({
      platform: "g2",
      rating: item.rating ?? 0,
      title: item.title,
      pros: item.pros ? truncate(item.pros, 200) : undefined,
      cons: item.cons ? truncate(item.cons, 200) : undefined,
      reviewText: truncate(reviewText, 300),
      reviewerRole: item.reviewerTitle,
      date: item.date,
      url: item.url,
    });
  }

  return reviews;
}

// ─── Trustpilot review normalizer ─────────────────────────────────────────────

interface RawTrustpilotReview {
  url?: string;
  title?: string;
  rating?: number;
  reviewerRole?: string;
  text?: string;
  review?: string;
  datePublished?: string;
  date?: string;
}

/**
 * Convert raw Trustpilot scraper items into StructuredReview[].
 * Caps at 15 reviews, truncates review text to 300 chars.
 */
export function normalizeTrustpilotReviews(items: unknown[]): StructuredReview[] {
  const reviews: StructuredReview[] = [];

  for (const raw of items.slice(0, 15)) {
    const item = raw as RawTrustpilotReview;
    const reviewText = item.text ?? item.review ?? "";
    if (!reviewText) continue;

    reviews.push({
      platform: "trustpilot",
      rating: item.rating ?? 0,
      title: item.title,
      reviewText: truncate(reviewText, 300),
      reviewerRole: item.reviewerRole,
      date: item.datePublished ?? item.date,
      url: item.url,
    });
  }

  return reviews;
}

// ─── Tweet normalizer ─────────────────────────────────────────────────────────

interface RawTweet {
  url?: string;
  full_text?: string;
  text?: string;
  author?: { username?: string; name?: string };
  user?: { screen_name?: string };
  favorite_count?: number;
  public_metrics?: { like_count?: number };
  created_at?: string;
  isRetweet?: boolean;
  retweeted?: boolean;
}

/**
 * Convert raw tweet scraper items into SocialMention[].
 * Filters out retweets and low-engagement tweets (<2 likes). Caps at 30.
 */
export function normalizeTweets(items: unknown[]): SocialMention[] {
  const mentions: SocialMention[] = [];

  for (const raw of items) {
    const item = raw as RawTweet;

    // Skip retweets
    if (item.isRetweet || item.retweeted) continue;

    const text = item.full_text ?? item.text ?? "";
    if (!text) continue;

    const likes =
      item.favorite_count ??
      item.public_metrics?.like_count ??
      0;

    const handle =
      item.author?.username ??
      item.user?.screen_name ??
      undefined;

    mentions.push({
      platform: "twitter",
      text: truncate(text, 280),
      authorHandle: handle,
      likes,
      date: item.created_at,
      url: item.url,
    });

    if (mentions.length >= 30) break;
  }

  // Sort by engagement descending
  return mentions.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
}

// ─── Job posting normalizer ───────────────────────────────────────────────────

interface RawJobPosting {
  title?: string;
  position?: string;
  company?: string;
  companyName?: string;
  location?: string;
  description?: string;
  descriptionText?: string;
  url?: string;
}

/**
 * Convert raw job scraper items into JobPosting[].
 * Truncates description to 200 chars. Caps at 15.
 */
export function normalizeJobPostings(items: unknown[]): JobPosting[] {
  const postings: JobPosting[] = [];

  for (const raw of items.slice(0, 15)) {
    const item = raw as RawJobPosting;
    const title = item.title ?? item.position ?? "";
    if (!title) continue;

    const description = item.description ?? item.descriptionText ?? "";

    postings.push({
      title,
      company: item.company ?? item.companyName ?? "",
      location: item.location,
      description: truncate(description, 200),
      url: item.url,
    });
  }

  return postings;
}

// ─── YouTube video normalizer ─────────────────────────────────────────────────

interface RawVideoResult {
  url?: string;
  title?: string;
  channelName?: string;
  channel?: string;
  viewCount?: number | string;
  views?: number | string;
  description?: string;
  shortDescription?: string;
}

/**
 * Convert raw YouTube scraper items into VideoResult[].
 * Sorts by view count descending, truncates descriptions to 150 chars. Caps at 10.
 */
export function normalizeVideoResults(items: unknown[]): VideoResult[] {
  const videos: VideoResult[] = [];

  for (const raw of items) {
    const item = raw as RawVideoResult;
    const url = item.url ?? "";
    const title = item.title ?? "";
    if (!url || !title) continue;

    const rawViewCount = item.viewCount ?? item.views;
    const viewCount =
      typeof rawViewCount === "string"
        ? parseInt(rawViewCount.replace(/[^0-9]/g, ""), 10) || undefined
        : rawViewCount;

    const description = item.description ?? item.shortDescription ?? "";

    videos.push({
      title,
      channelName: item.channelName ?? item.channel ?? "",
      viewCount,
      description: truncate(description, 150),
      url,
    });
  }

  return videos
    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    .slice(0, 10);
}

// ─── Product Hunt normalizer ──────────────────────────────────────────────────

interface RawProductHuntEntry {
  url?: string;
  name?: string;
  tagline?: string;
  description?: string;
  votesCount?: number;
  upvotes?: number;
  commentsCount?: number;
  topics?: Array<{ name?: string } | string>;
}

/**
 * Convert raw Product Hunt scraper items into ProductHuntEntry[].
 * Caps at 5 entries.
 */
export function normalizeProductHuntEntries(
  items: unknown[]
): ProductHuntEntry[] {
  const entries: ProductHuntEntry[] = [];

  for (const raw of items.slice(0, 5)) {
    const item = raw as RawProductHuntEntry;
    const name = item.name ?? "";
    const tagline = item.tagline ?? item.description ?? "";
    if (!name) continue;

    const topics = (item.topics ?? []).map((t) =>
      typeof t === "string" ? t : (t.name ?? "")
    ).filter(Boolean);

    entries.push({
      name,
      tagline: truncate(tagline, 150),
      upvotes: item.votesCount ?? item.upvotes ?? 0,
      commentsCount: item.commentsCount ?? 0,
      topics,
      url: item.url,
    });
  }

  return entries;
}

// ─── Autocomplete normalizer ──────────────────────────────────────────────────

interface RawAutocompleteResult {
  query?: string;
  suggestions?: Array<{ phrase?: string; text?: string } | string>;
  results?: Array<{ phrase?: string; text?: string } | string>;
}

/**
 * Convert raw Google autocomplete scraper items into a flat string[].
 */
export function normalizeAutocompleteSuggestions(
  items: unknown[]
): string[] {
  const suggestions: string[] = [];

  for (const raw of items) {
    const item = raw as RawAutocompleteResult;
    const rawList = item.suggestions ?? item.results ?? [];

    for (const s of rawList) {
      const text =
        typeof s === "string" ? s : (s.phrase ?? s.text ?? "");
      if (text && !suggestions.includes(text)) {
        suggestions.push(text);
      }
    }
  }

  return suggestions;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n[content truncated]";
}

/**
 * Returns true if `url` is at the root path of the same origin as `baseUrl`.
 */
function isSameOriginRoot(url: string, baseUrl: string): boolean {
  try {
    const a = new URL(url);
    const b = new URL(baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`);
    const samePath = a.pathname === "/" || a.pathname === "";
    return a.hostname === b.hostname && samePath;
  } catch {
    return false;
  }
}

/**
 * Returns true if the URL has a root path (/).
 */
function isRootPath(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return pathname === "/" || pathname === "";
  } catch {
    return false;
  }
}
