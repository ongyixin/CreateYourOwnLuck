// ============================================================
// FitCheck — AI Prompt Builders + Zod Schemas
// Owned by: AI agent
// Exports: schemas, prompt builders, context formatter, system prompt
// ============================================================

import { z } from 'zod';
import type { AnalysisRequest, ScrapedData } from '../types';

// ============================================================
// Shared primitive schemas
// ============================================================

export const EvidenceSchema = z.object({
  quote: z.string().describe('Verbatim or near-verbatim snippet from the source material'),
  sourceUrl: z.string().optional().describe('URL of the page or mention'),
  sourceLabel: z.string().optional().describe('Human-readable label, e.g. "Company homepage" or "Reddit r/startups"'),
});

const BrandInsightSchema = z.object({
  title: z.string().describe('Short label for this insight'),
  description: z.string().describe('1–2 sentence explanation grounded in evidence from the data'),
  evidence: z.array(EvidenceSchema).min(1).describe('At least one supporting evidence snippet'),
});

// ============================================================
// Section 1: Brand Perception
// ============================================================

export const BrandPerceptionSchema = z.object({
  toneAndIdentity: z
    .array(z.string())
    .min(3)
    .max(8)
    .describe('3–8 adjectives or short phrases describing the brand tone and identity'),
  perceivedStrengths: z
    .array(BrandInsightSchema)
    .min(1)
    .max(4)
    .describe('What the brand is doing well, backed by evidence'),
  weakOrConfusingSignals: z
    .array(BrandInsightSchema)
    .min(1)
    .max(4)
    .describe('Where messaging is unclear, contradictory, or absent'),
  consistencyScore: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe(
      '0–100 score: 90–100 = tight and unified, 70–89 = mostly consistent with gaps, 50–69 = noticeable contradictions, below 50 = fragmented',
    ),
  summary: z.string().describe('One-sentence brand perception summary for display in the report hero'),
});

// ============================================================
// Section 2: ICP Assessment
// ============================================================

const IcpProfileSchema = z.object({
  name: z.string().describe('Short descriptive label, e.g. "Early-stage SaaS Founder" or "Growth Marketer at Series A"'),
  description: z.string().describe('2–3 sentences on who this person is and why they are drawn to this product'),
  painPoints: z.array(z.string()).min(2).max(5),
  motivations: z.array(z.string()).min(2).max(5),
  buyingTriggers: z
    .array(z.string())
    .min(1)
    .max(4)
    .describe('Specific moments or events that push this person to actually purchase'),
  fitScore: z.number().int().min(0).max(100).describe('How strongly the current brand resonates with this profile'),
  evidence: z.array(EvidenceSchema).min(1),
});

const AudienceSegmentSchema = z.object({
  label: z.string().describe('Short segment name'),
  fitScore: z.number().int().min(0).max(100),
  rationale: z
    .string()
    .describe('Why this segment fits or does not fit, referencing specific brand signals'),
});

export const IcpAssessmentSchema = z.object({
  profiles: z.array(IcpProfileSchema).min(1).max(3).describe('1–3 ideal customer profiles, most likely first'),
  audienceSegments: z
    .array(AudienceSegmentSchema)
    .min(2)
    .max(5)
    .describe('Audience segments ranked best-fit first'),
  summary: z.string().describe('One-sentence ICP summary for the report'),
});

// ============================================================
// Section 3: Brand Direction Actionables
// ============================================================

const ActionableSchema = z.object({
  title: z.string().describe('Short label for this action'),
  description: z
    .string()
    .describe('Specific, non-generic recommendation with context from the actual brand data'),
  priority: z.enum(['high', 'medium', 'low']),
  evidence: z.array(EvidenceSchema).min(1),
});

const MessagingAngleSchema = z.object({
  angle: z
    .string()
    .describe('A reframing or positioning angle the company should consider'),
  rationale: z.string().describe('Why this angle fits the brand and the target customer'),
  exampleHeadline: z.string().optional().describe('A sample headline or tagline illustrating the angle'),
});

const CopySuggestionSchema = z.object({
  placement: z
    .string()
    .describe('Where this copy lives, e.g. "Homepage hero", "Primary CTA button", "Nav label", "Ad headline"'),
  before: z
    .string()
    .describe('Current copy verbatim, or describe what the page currently says/implies'),
  after: z.string().describe('Specific improved copy suggestion'),
  rationale: z.string().describe('Why the "after" version is stronger'),
});

export const ActionablesSchema = z.object({
  whatToImprove: z.array(ActionableSchema).min(1).max(3).describe('Weaknesses to address with suggested fixes'),
  whatToChange: z
    .array(ActionableSchema)
    .min(1)
    .max(3)
    .describe('Messaging or signals actively hurting positioning'),
  whatToLeanInto: z
    .array(ActionableSchema)
    .min(1)
    .max(3)
    .describe('Underutilized strengths worth doubling down on'),
  messagingAngles: z
    .array(MessagingAngleSchema)
    .min(2)
    .max(4)
    .describe('New ways to frame the value proposition'),
  copySuggestions: z
    .array(CopySuggestionSchema)
    .min(2)
    .max(4)
    .describe('Before/after copy examples the team can implement immediately'),
});

// ============================================================
// Section 4: Customer and Lead Suggestions
// ============================================================

const CustomerTypeSchema = z.object({
  role: z.string().describe('Specific job title or role, e.g. "Growth Marketer", "Founding Engineer"'),
  companySizes: z
    .array(z.string())
    .min(1)
    .describe('Funding stages or sizes, e.g. ["Pre-seed", "Seed", "Series A"]'),
  industries: z.array(z.string()).min(1),
  rationale: z.string().describe('Why this customer type is a strong fit given the brand positioning'),
});

const CommunitySchema = z.object({
  name: z.string().describe('Specific community name, e.g. "r/SaaS" or "Indie Hackers Slack"'),
  platform: z.string().describe('Platform type, e.g. "Reddit", "Slack", "Discord", "Forum"'),
  url: z.string().optional(),
  rationale: z.string().describe('Why the ICP is likely present here, preferably citing evidence from mentions'),
});

const TargetCompanyProfileSchema = z.object({
  description: z.string().describe('Type of company most likely to buy'),
  exampleTypes: z
    .array(z.string())
    .min(1)
    .describe('Concrete example company categories, e.g. ["B2B SaaS with PLG motion", "No-code tool startups"]'),
  rationale: z.string(),
});

const CreatorChannelSchema = z.object({
  name: z.string().describe('Creator, podcast, newsletter, or channel name'),
  type: z.enum(['podcast', 'newsletter', 'influencer', 'youtube', 'other']),
  url: z.string().optional(),
  rationale: z.string().describe('Why this channel overlaps with the target ICP'),
});

export const LeadSuggestionsSchema = z.object({
  customerTypes: z.array(CustomerTypeSchema).min(2).max(4),
  communities: z
    .array(CommunitySchema)
    .min(2)
    .max(5)
    .describe('Specific communities where the ICP actually hangs out'),
  targetCompanyProfiles: z.array(TargetCompanyProfileSchema).min(1).max(3),
  creatorChannels: z
    .array(CreatorChannelSchema)
    .min(2)
    .max(4)
    .describe('Influencers, podcasts, newsletters, and platforms worth reaching'),
});

// ============================================================
// Section 5: ICP Studio
// ============================================================

const FiveSecondReactionSchema = z.object({
  sentiment: z
    .enum(['positive', 'neutral', 'confused', 'negative'])
    .describe('Overall first-impression sentiment'),
  reaction: z
    .string()
    .describe(
      'First-person simulated reaction, 1–2 sentences, authentic and slightly rough — not marketing copy',
    ),
  firstImpression: z
    .string()
    .describe('The specific element that caught their eye first: headline, hero image, nav item, etc.'),
  likelyAction: z
    .string()
    .describe('What they would do next, honestly: "Sign up", "Keep scrolling", "Close tab", etc.'),
});

const PersonaSchema = z.object({
  id: z
    .string()
    .describe('Slug identifier, e.g. "founder-alice" — lowercase, hyphenated'),
  name: z.string().describe('Full first and last name'),
  title: z
    .string()
    .describe('Short descriptive title, e.g. "Indie Hacker, 3-person startup" or "Head of Growth, Series B SaaS"'),
  age: z.number().int().optional(),
  psychographics: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe('Personality traits, values, and mental models — not demographics'),
  painPoints: z.array(z.string()).min(2).max(5),
  buyingTriggers: z.array(z.string()).min(1).max(4),
  fiveSecondReaction: FiveSecondReactionSchema,
  painPointGaps: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe('Specific gaps between what the brand communicates and what this persona actually needs'),
  evidence: z.array(EvidenceSchema).min(1).describe('Data signals that informed this persona'),
});

export const IcpStudioSchema = z.object({
  personas: z
    .array(PersonaSchema)
    .min(2)
    .max(3)
    .describe('2–3 distinct personas — differentiated by role, context, and relationship to the product'),
});

// ============================================================
// System prompt (shared across all sections)
// ============================================================

export const SYSTEM_PROMPT = `You are FitCheck, an AI brand and market analyst. Your job is to analyze real web data about a company and produce specific, evidence-backed insights for a brand perception report.

Core rules:
- Never produce generic startup advice. Every insight must be grounded in the scraped content provided.
- Always cite specific quotes, copy snippets, or signals from the data as evidence.
- Be direct and opinionated — rank, score, and prioritize clearly.
- If data is sparse, work with what you have and note the limitation in your description. Do not invent evidence.
- Compare the company's self-presentation against market signals (competitor sites, public mentions) wherever possible.
- Output must match the requested JSON schema exactly.`;

// ============================================================
// Context formatter
// Keep context lean — prioritize quality over volume.
// ============================================================

const LIMITS = {
  homepage: 3000,
  companyPage: 900,
  maxExtraCompanyPages: 4,
  competitorPage: 1200,
  maxCompetitorPages: 6, // total across all competitors
  mention: 280,
  maxMentions: 10,
  extraMaterials: 2000,
  // New enrichment sources
  review: 200,
  maxReviews: 10,
  socialMention: 200,
  maxSocialMentions: 10,
  video: 200,
  maxVideos: 5,
  autocomplete: 300,
};

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + '…';
}

/** Serialize scraped data + request into a compact context string for the AI prompt. */
export function formatContext(request: AnalysisRequest, data: ScrapedData): string {
  const parts: string[] = [];

  // Company site: homepage gets generous budget, other pages get less
  const [homepage, ...otherPages] = data.companyPages;
  if (homepage) {
    parts.push(
      `## Company Homepage (${homepage.url})\n${truncate(homepage.content, LIMITS.homepage)}`,
    );
  }

  if (otherPages.length > 0) {
    const selected = otherPages.slice(0, LIMITS.maxExtraCompanyPages);
    parts.push(
      selected
        .map(
          (p) =>
            `## Company Page: ${p.title ?? p.url}\n${truncate(p.content, LIMITS.companyPage)}`,
        )
        .join('\n\n'),
    );
  }

  // Uploaded materials (pitch deck, marketing copy, etc.)
  if (request.extraMaterials) {
    parts.push(
      `## Uploaded Context\n${truncate(request.extraMaterials, LIMITS.extraMaterials)}`,
    );
  }

  // Competitor pages
  if (data.competitorPages.length > 0) {
    const selected = data.competitorPages.slice(0, LIMITS.maxCompetitorPages);
    parts.push(
      selected
        .map(
          (p) =>
            `## Competitor Page: ${p.title ?? p.url}\n${truncate(p.content, LIMITS.competitorPage)}`,
        )
        .join('\n\n'),
    );
  }

  // Public mentions — most useful for ICP and lead signals
  if (data.mentions.length > 0) {
    const selected = data.mentions.slice(0, LIMITS.maxMentions);
    const mentionBlock = selected
      .map(
        (m) =>
          `[${m.source.toUpperCase()}] ${m.title ? m.title + ' — ' : ''}${truncate(m.snippet, LIMITS.mention)}\n(${m.url})`,
      )
      .join('\n\n');
    parts.push(`## Public Mentions & Reviews\n${mentionBlock}`);
  }

  // Structured reviews (G2 + Trustpilot)
  if (data.reviews && data.reviews.length > 0) {
    const selected = data.reviews.slice(0, LIMITS.maxReviews);

    // Aggregate ratings per platform
    const byPlatform = selected.reduce<Record<string, number[]>>((acc, r) => {
      if (!acc[r.platform]) acc[r.platform] = [];
      if (r.rating > 0) acc[r.platform].push(r.rating);
      return acc;
    }, {});
    const aggregates = Object.entries(byPlatform)
      .map(([platform, ratings]) => {
        const avg = ratings.length
          ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
          : 'N/A';
        return `${platform.toUpperCase()}: ${avg}/5 from ${ratings.length} reviews`;
      })
      .join(', ');

    const reviewBlock = selected
      .map((r) => {
        const lines: string[] = [
          `[${r.platform.toUpperCase()}] ${r.rating > 0 ? `★${r.rating}/5` : ''} ${r.title ?? ''}${r.reviewerRole ? ` (${r.reviewerRole})` : ''}`,
        ];
        if (r.pros) lines.push(`Pros: ${truncate(r.pros, LIMITS.review)}`);
        if (r.cons) lines.push(`Cons: ${truncate(r.cons, LIMITS.review)}`);
        lines.push(truncate(r.reviewText, LIMITS.review));
        return lines.join('\n');
      })
      .join('\n\n');

    parts.push(`## Structured Reviews\nAggregate: ${aggregates}\n\n${reviewBlock}`);
  }

  // Twitter/X social mentions
  if (data.socialMentions && data.socialMentions.length > 0) {
    const selected = data.socialMentions.slice(0, LIMITS.maxSocialMentions);
    const tweetBlock = selected
      .map(
        (t) =>
          `[@${t.authorHandle ?? 'unknown'}${t.likes != null ? ` · ${t.likes} likes` : ''}] ${truncate(t.text, LIMITS.socialMention)}`,
      )
      .join('\n\n');
    parts.push(`## Social Media Mentions (Twitter/X)\n${tweetBlock}`);
  }

  // Google autocomplete signals
  if (data.autocompleteSuggestions && data.autocompleteSuggestions.length > 0) {
    const suggestions = data.autocompleteSuggestions
      .slice(0, 15)
      .map((s) => `- ${s}`)
      .join('\n');
    parts.push(`## Google Autocomplete Signals\nWhat people search for alongside this brand:\n${truncate(suggestions, LIMITS.autocomplete)}`);
  }

  // YouTube video content
  if (data.videos && data.videos.length > 0) {
    const selected = data.videos.slice(0, LIMITS.maxVideos);
    const videoBlock = selected
      .map(
        (v) =>
          `- "${v.title}" — ${v.channelName}${v.viewCount != null ? ` (${v.viewCount.toLocaleString()} views)` : ''}\n  ${truncate(v.description, LIMITS.video)}\n  ${v.url}`,
      )
      .join('\n\n');
    parts.push(`## Video Content (YouTube)\n${videoBlock}`);
  }

  // Pass through any scraping warnings so the AI can caveat low-data sections
  if (data.warnings.length > 0) {
    parts.push(`## Data Gaps (scraping warnings)\n${data.warnings.join('\n')}`);
  }

  return parts.join('\n\n---\n\n');
}

// ============================================================
// Prompt builders — one per section
// ============================================================

export function buildBrandPerceptionPrompt(request: AnalysisRequest, context: string): string {
  return `Analyze the brand perception for **${request.companyName}** (${request.websiteUrl}).${request.goal ? `\n\nTeam's stated goal: "${request.goal}"` : ''}

Focus on:
- What tone and identity does this brand actually project based on its copy, structure, and public signals?
- What specific things is it doing well that a real visitor would notice?
- Where is the messaging unclear, absent, or contradictory?
- How consistently does the brand hold together across its homepage, other pages, and public mentions?

Where available, use structured reviews (ratings, pros/cons from G2/Trustpilot), Twitter/X social mentions, and news/PR coverage to triangulate how the market actually perceives this brand versus its self-presentation. Google autocomplete signals reveal what customers actually associate with the brand.

Score the consistency: 90–100 = tight and unified; 70–89 = mostly consistent with gaps; 50–69 = noticeable contradictions; below 50 = fragmented.

Ground every strength and signal in actual quotes or observations from the data. Do not produce generic observations.

---

${context}`;
}

export function buildIcpAssessmentPrompt(request: AnalysisRequest, context: string): string {
  return `Identify the Ideal Customer Profiles (ICPs) for **${request.companyName}** (${request.websiteUrl}).${request.goal ? `\n\nTeam's stated goal: "${request.goal}"` : ''}

Focus on:
- Who does this product's messaging and positioning actually speak to — not who they claim to target?
- What specific pain points and motivations does the brand signal through its copy and positioning?
- Rank audience segments by how strongly the current brand resonates with them.
- Identify buying triggers: the specific moments or events that push someone to purchase.

Where available, use structured reviews (reviewer roles from G2/Trustpilot reveal who's actually buying) and Twitter/X mentions (language patterns reveal real customer context). Autocomplete signals indicate how customers categorise this product.

Do NOT produce stock personas like "SMB decision maker". Be specific about role, company stage, context, and what makes this person different. Draw on competitor positioning and public mentions to triangulate.

---

${context}`;
}

export function buildActionablesPrompt(request: AnalysisRequest, context: string): string {
  return `Generate specific, actionable brand direction recommendations for **${request.companyName}** (${request.websiteUrl}).${request.goal ? `\n\nTeam's stated goal: "${request.goal}"` : ''}

For each actionable:
- Reference actual copy, signals, or gaps from the data as evidence
- Mark priority "high" only for things actively harming positioning or conversions
- Be specific: not "improve your messaging" but "your homepage hero says X — change it to Y because Z"

For copy suggestions:
- Quote the actual current copy (or describe what it implies) as "before"
- Give a concrete, ready-to-use alternative as "after"
- Focus on highest-visibility placements: hero headline, subhead, primary CTA, nav labels

---

${context}`;
}

export function buildLeadSuggestionsPrompt(request: AnalysisRequest, context: string): string {
  return `Suggest specific customer acquisition targets for **${request.companyName}** (${request.websiteUrl}).${request.goal ? `\n\nTeam's stated goal: "${request.goal}"` : ''}

Based on ICP signals from the brand positioning and market signals from public mentions:
- Name real, specific communities (exact subreddit names, Slack groups, Discord servers) where these buyers gather
- Describe types of companies most likely to buy, with concrete example categories
- Identify creators, podcasts, or newsletters with genuine audience overlap
- Avoid generic recommendations like "go to LinkedIn" — prefer specific, actionable channels

If public mentions reference Reddit threads, Hacker News posts, or review sites, use them to justify community suggestions. YouTube channels covering this product type are strong signals for creator partnerships.

---

${context}`;
}

export function buildIcpStudioPrompt(request: AnalysisRequest, context: string): string {
  return `Create 2–3 fictional but evidence-grounded customer personas for **${request.companyName}** (${request.websiteUrl}).${request.goal ? `\n\nTeam's stated goal: "${request.goal}"` : ''}

Each persona must:
- Be grounded in actual signals from the scraped data, not stock archetypes
- Have a distinct role, context, and relationship to the product (no two personas that are basically the same)
- Include a simulated 5-second homepage reaction written in their authentic voice

For the 5-second reaction:
- "reaction" should be first-person, natural, slightly rough — not polished marketing copy
- "firstImpression" should name a specific element they noticed (headline text, hero image, nav item, etc.)
- "likelyAction" should be honest — it might be "Close tab" or "Google competitors" if the persona wouldn't convert

For painPointGaps: be specific about where the current brand fails to speak to what this person actually cares about.

---

${context}`;
}
