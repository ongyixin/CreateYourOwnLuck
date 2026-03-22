// ============================================================
// FitCheck — Shared TypeScript Contracts
// Owned by: foundation agent
// Do not add API/Apify/AI/component logic here.
// ============================================================

// ------------------------------------------------------------
// 1. Analysis Request (user input)
// ------------------------------------------------------------

/** Data sources the user can opt in/out of during analysis. */
export type ScraperSource = "google_search" | "reviews" | "twitter" | "enrichment";

/** All selectable sources — used as the default when none are specified. */
export const ALL_SCRAPER_SOURCES: ScraperSource[] = [
  "google_search",
  "reviews",
  "twitter",
  "enrichment",
];

export interface AnalysisRequest {
  companyName: string;
  websiteUrl: string;

  /** Extra context pasted or uploaded as text (pitch deck, marketing copy, etc.) */
  extraMaterials?: string;

  /** Up to N competitor URLs — limit depends on user tier */
  competitorUrls?: string[];

  /** Optional goal statement: "We want to move upmarket", "Launch in Europe", etc. */
  goal?: string;

  /**
   * Which optional data sources to scrape. Defaults to all sources if omitted.
   * Company website is always scraped regardless of this setting.
   */
  selectedSources?: ScraperSource[];

  /**
   * When true, the user opted into autonomous setup — scrapers will auto-populate
   * materials, competitors, and sources. Goal is left blank.
   */
  autonomousSetup?: boolean;

  /** The user's subscription tier — controls persona count and competitor limit in the pipeline. */
  userTier?: "FREE" | "PRO" | "AGENCY";
}

// ------------------------------------------------------------
// 2. Job lifecycle
// ------------------------------------------------------------

export type JobStatus =
  | "pending"   // created, not yet started
  | "running"   // pipeline in progress
  | "complete"  // report ready
  | "failed";   // unrecoverable error

/** Each named stage in the pipeline, in order. */
export type PipelineStage =
  | "crawl_company"
  | "crawl_competitors"
  | "search_mentions"
  | "scrape_reviews"
  | "scrape_social"
  | "scrape_enrichment"
  | "analyze_brand"
  | "analyze_icp"
  | "analyze_actionables"
  | "analyze_leads"
  | "analyze_personas"
  | "analyze_resonance"
  | "build_report";

export const PIPELINE_STAGES: PipelineStage[] = [
  "crawl_company",
  "crawl_competitors",
  "search_mentions",
  "scrape_reviews",
  "scrape_social",
  "scrape_enrichment",
  "analyze_brand",
  "analyze_icp",
  "analyze_actionables",
  "analyze_leads",
  "analyze_personas",
  "analyze_resonance",
  "build_report",
];

export type StageStatus = "pending" | "running" | "complete" | "skipped" | "failed";

export interface ProgressStage {
  stage: PipelineStage;
  status: StageStatus;
  /** Human-readable label shown in the progress UI */
  label: string;
  /** ISO timestamp when this stage started */
  startedAt?: string;
  /** ISO timestamp when this stage completed or failed */
  completedAt?: string;
  /** Optional warning/info message (e.g., "Scrape returned 0 pages") */
  message?: string;
}

export interface AnalysisJob {
  id: string;
  status: JobStatus;
  request: AnalysisRequest;
  stages: ProgressStage[];
  /** 0–100 overall progress percentage */
  progress: number;
  createdAt: string;
  updatedAt: string;
  /** Set on fatal failure */
  error?: string;
  /** Set when status === "complete" */
  report?: FitCheckReport;
}

// ------------------------------------------------------------
// 3. SSE event payload (streamed from GET /api/status/[id])
// ------------------------------------------------------------

export interface StatusEvent {
  jobId: string;
  status: JobStatus;
  progress: number;
  stages: ProgressStage[];
  /** Populated only in the final "complete" event */
  report?: FitCheckReport;
  error?: string;
}

// ------------------------------------------------------------
// 4. Scraped / normalized data
// ------------------------------------------------------------

export interface ScrapedPage {
  url: string;
  title?: string;
  /** Cleaned markdown content, truncated to avoid context overflow */
  content: string;
  scrapedAt: string;
}

export interface PublicMention {
  url: string;
  source: "reddit" | "hackernews" | "g2" | "trustpilot" | "news" | "other";
  title?: string;
  snippet: string;
  scrapedAt: string;
}

export interface StructuredReview {
  platform: "g2" | "trustpilot";
  rating: number;
  title?: string;
  pros?: string;
  cons?: string;
  reviewText: string;
  reviewerRole?: string;
  date?: string;
  url?: string;
}

export interface SocialMention {
  platform: "twitter";
  text: string;
  authorHandle?: string;
  likes?: number;
  date?: string;
  url?: string;
}

export interface VideoResult {
  title: string;
  channelName: string;
  viewCount?: number;
  /** Truncated description */
  description: string;
  url: string;
}

export interface ScrapedData {
  companyPages: ScrapedPage[];
  competitorPages: ScrapedPage[];
  mentions: PublicMention[];
  /** Structured reviews from G2 and Trustpilot */
  reviews?: StructuredReview[];
  /** Twitter/X mentions */
  socialMentions?: SocialMention[];
  /** YouTube search results for brand/product content */
  videos?: VideoResult[];
  /** Google autocomplete suggestions (e.g. "companyname pricing") */
  autocompleteSuggestions?: string[];
  /** Any scraping warnings, e.g. "competitor X timed out" */
  warnings: string[];
}

// ------------------------------------------------------------
// 5. Report section — shared primitives
// ------------------------------------------------------------

/** A piece of evidence anchoring an insight to real data */
export interface Evidence {
  quote: string;
  sourceUrl?: string;
  sourceLabel?: string; // e.g. "Company homepage", "Reddit r/startups"
}

// ------------------------------------------------------------
// 5a. Brand Perception
// ------------------------------------------------------------

export interface BrandPerception {
  /** Short adjectives/phrases the brand projects: e.g. ["modern", "technical", "niche"] */
  toneAndIdentity: string[];
  perceivedStrengths: BrandInsight[];
  weakOrConfusingSignals: BrandInsight[];
  /** 0–100 consistency score */
  consistencyScore: number;
  /** One-sentence summary for the UI hero */
  summary: string;
}

export interface BrandInsight {
  title: string;
  description: string;
  evidence: Evidence[];
}

// ------------------------------------------------------------
// 5b. ICP Assessment
// ------------------------------------------------------------

export interface IcpAssessment {
  profiles: IcpProfile[];
  /** Segments ranked best-fit first */
  audienceSegments: AudienceSegment[];
  summary: string;
}

export interface IcpProfile {
  name: string; // e.g. "Early-stage SaaS Founder"
  description: string;
  painPoints: string[];
  motivations: string[];
  buyingTriggers: string[];
  fitScore: number; // 0–100
  evidence: Evidence[];
}

export interface AudienceSegment {
  label: string;
  fitScore: number; // 0–100
  rationale: string;
}

// ------------------------------------------------------------
// 5c. Brand Direction Actionables
// ------------------------------------------------------------

export interface Actionables {
  whatToImprove: Actionable[];
  whatToChange: Actionable[];
  whatToLeanInto: Actionable[];
  messagingAngles: MessagingAngle[];
  copySuggestions: CopySuggestion[];
}

export interface Actionable {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  evidence: Evidence[];
}

export interface MessagingAngle {
  angle: string;
  rationale: string;
  exampleHeadline?: string;
}

export interface CopySuggestion {
  placement: string; // e.g. "Homepage hero", "CTA button", "Ad headline"
  before: string;
  after: string;
  rationale: string;
}

// ------------------------------------------------------------
// 5d. Customer and Lead Suggestions
// ------------------------------------------------------------

export interface LeadSuggestions {
  customerTypes: CustomerType[];
  communities: Community[];
  targetCompanyProfiles: TargetCompanyProfile[];
  creatorChannels: CreatorChannel[];
}

export interface CustomerType {
  role: string;        // e.g. "Growth Marketer"
  companySizes: string[]; // e.g. ["Seed", "Series A"]
  industries: string[];
  rationale: string;
}

export interface Community {
  name: string;
  platform: string; // "Reddit", "Slack", "Discord", "Forum", etc.
  url?: string;
  rationale: string;
}

export interface TargetCompanyProfile {
  description: string;
  exampleTypes: string[];
  rationale: string;
}

export interface CreatorChannel {
  name: string;
  type: "podcast" | "newsletter" | "influencer" | "youtube" | "other";
  url?: string;
  rationale: string;
}

// ------------------------------------------------------------
// 5e. ICP Studio
// ------------------------------------------------------------

export interface IcpStudio {
  personas: Persona[];
}

export interface Persona {
  id: string;
  name: string;
  /** Short title, e.g. "Indie Hacker, 3-person startup" */
  title: string;
  age?: number;
  psychographics: string[];
  painPoints: string[];
  buyingTriggers: string[];
  /** How this persona would react to the homepage in ~5 seconds */
  fiveSecondReaction: FiveSecondReaction;
  /** Gaps between current brand and what this persona cares about */
  painPointGaps: string[];
  evidence: Evidence[];
  /** Estimated share of the total addressable market (0–100, sums to ~100 across personas) */
  marketWeight?: number;
}

export interface FiveSecondReaction {
  /** "positive" | "neutral" | "confused" | "negative" */
  sentiment: "positive" | "neutral" | "confused" | "negative";
  /** First-person simulated reaction, 1–2 sentences */
  reaction: string;
  /** What caught their eye first */
  firstImpression: string;
  /** What they'd do next: "Sign up", "Keep scrolling", "Close tab", etc. */
  likelyAction: string;
}

// ------------------------------------------------------------
// 6. Full Report
// ------------------------------------------------------------

// ------------------------------------------------------------
// 5f. Brand Resonance Map
// ------------------------------------------------------------

export interface ThemeSourceBreakdown {
  sourceType: "website" | "reviews" | "social" | "search" | "video";
  present: boolean;
  /** -100 (very negative) to +100 (very positive) sentiment for this source */
  sentiment: number;
}

export interface ThemeHotspot {
  /** Short descriptive phrase, e.g. "ease of use", "pricing confusion" */
  theme: string;
  /** 0–100: how often this theme surfaces across sources */
  frequencyScore: number;
  /** -100 to +100: negative to positive market perception */
  sentimentScore: number;
  /** 0–100: importance of this theme to the target ICP */
  icpImportance: number;
  /**
   * Quadrant classification:
   * - leverage: high frequency + positive sentiment (amplify)
   * - fix: high frequency + negative sentiment (urgent)
   * - develop: low frequency + positive sentiment (opportunity)
   * - monitor: low frequency + negative sentiment (watch)
   */
  category: "leverage" | "fix" | "develop" | "monitor";
  /** 1-sentence explanation of the rating and its strategic significance */
  summary: string;
  sources: ThemeSourceBreakdown[];
  evidence: Evidence[];
}

export interface BrandResonanceMap {
  themes: ThemeHotspot[];
  /** 1–2 sentence strategic summary of the overall resonance landscape */
  insight: string;
}

export interface FitCheckReport {
  jobId: string;
  companyName: string;
  websiteUrl: string;
  generatedAt: string;

  brandPerception: BrandPerception;
  icpAssessment: IcpAssessment;
  actionables: Actionables;
  leadSuggestions: LeadSuggestions;
  icpStudio: IcpStudio;

  /** Optional — present for reports generated after the resonance map feature launch */
  resonanceMap?: BrandResonanceMap;

  /** Non-fatal warnings from the pipeline (partial scrape failures, etc.) */
  warnings: string[];
}

// ------------------------------------------------------------
// 7. API response shapes
// ------------------------------------------------------------

export interface AnalyzeResponse {
  jobId: string;
}

/** Returned by GET /api/report/[id] when still pending */
export interface PendingReportResponse {
  status: "pending" | "running";
  progress: number;
}

export type ReportResponse = FitCheckReport | PendingReportResponse;

// ------------------------------------------------------------
// 7b. Focus Group
// ------------------------------------------------------------

/**
 * probe — founder asks / drops claims; personas respond and react to each other.
 * flip  — personas interrogate the founder; each asks one key question, then reacts to answers.
 */
export type FocusGroupPhase = "probe" | "flip";

export interface FocusGroupMessage {
  id: string;
  /** 'user' = the founder/moderator; 'persona' = an AI agent; 'system' = phase announcements */
  role: "user" | "persona" | "system";
  personaId?: string;
  personaName?: string;
  content: string;
  timestamp: string;
}

export interface FocusGroupSession {
  id: string;
  jobId: string;
  personas: Persona[];
  messages: FocusGroupMessage[];
  phase: FocusGroupPhase;
  status: "active" | "complete";
  analytics?: FocusGroupAnalytics;
  createdAt: string;
  updatedAt: string;
}

export interface PersonaScore {
  personaId: string;
  personaName: string;
  personaTitle: string;
  marketWeight: number;
  conversionLikelihood: number;
  weightedSignal: number;
}

export interface RankedSegment {
  personaName: string;
  personaTitle: string;
  rationale: string;
  weightedSignal: number;
}

export interface WeightedObjection {
  objection: string;
  tamPercent: number;
  raisedBy: string[];
}

export interface FocusGroupAnalytics {
  pmfScore: number;
  personaScores: PersonaScore[];
  icpPriorityRanking: RankedSegment[];
  topObjections: WeightedObjection[];
  consensusSignals: string[];
  deadWeight: string[];
  recommendedActions: string[];
  adjacentSegmentSignal?: string;
}

// ------------------------------------------------------------
// 8. Pipeline stage labels (UI display)
// ------------------------------------------------------------

export const STAGE_LABELS: Record<PipelineStage, string> = {
  crawl_company:       "Crawling company website...",
  crawl_competitors:   "Scraping competitor sites...",
  search_mentions:     "Searching for public mentions and reviews...",
  scrape_reviews:      "Scraping structured reviews (G2, Trustpilot)...",
  scrape_social:       "Scraping social media mentions...",
  scrape_enrichment:   "Gathering videos and autocomplete signals...",
  analyze_brand:       "Running AI brand analysis...",
  analyze_icp:         "Generating ICP profiles...",
  analyze_actionables: "Building brand direction actionables...",
  analyze_leads:       "Finding customer and lead suggestions...",
  analyze_personas:    "Building ICP Studio personas...",
  analyze_resonance:   "Mapping brand resonance themes...",
  build_report:        "Assembling final report...",
};
