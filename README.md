# FitCheck

AI-powered brand perception and ideal customer profile analysis, grounded in live web data.

## The Problem

Startups and businesses often struggle with branding and positioning because they rely on instinct, internal opinions, or outdated market research. They don't know whether their brand is clear or confusing, whether they're appealing to the right customer segment, what differentiates them from competitors, or what messaging changes would actually improve conversion.

Most existing tools are static or generic. FitCheck is different because it uses fresh, real-time web data alongside the company's own materials to deliver actionable, evidence-backed insights.

## Who it's for

- Startups validating their positioning
- Indie hackers refining their brand
- SaaS products entering a new market or audience segment
- Small businesses trying to understand their competitive landscape
- Founders and teams who want data-driven branding decisions instead of guesswork

## Features

### 1. Brand Perception Analysis

Understand how your brand actually comes across — not how you think it does. FitCheck analyzes your website, marketing materials, and public mentions to assess:

- **Current tone and identity** — The adjectives and impressions your brand projects
- **Perceived strengths** — What you're doing well, backed by evidence from your site and public discussions
- **Weak or confusing signals** — Where your messaging is unclear, contradictory, or missing
- **Consistency score** — How well your brand holds together across your website, ads, docs, and public presence

### 2. Ideal Customer Profile (ICP) Assessment

Discover who your product is actually resonating with and who it should be targeting:

- **Likely ideal customer profiles** — Data-driven personas based on your positioning and market signals
- **Audience segments ranked by fit** — Which customer types are most aligned with your current brand
- **Inferred pain points and motivations** — What problems your ideal customers face and what drives their purchasing decisions
- **Buying triggers** — The specific moments, events, or frustrations that push your ideal customers to seek a solution

### 3. Brand Direction Actionables

Get concrete recommendations on what to change, not just what's wrong:

- **What to improve** — Specific weaknesses to address with suggested fixes
- **What to change** — Messaging that's actively hurting your positioning
- **What to lean into** — Strengths you're underutilizing
- **Recommended messaging angles** — New ways to frame your value proposition
- **Homepage, ad, and copy suggestions** — Before/after examples you can implement immediately

### 4. Customer and Lead Suggestions

Know where to find the people most likely to buy:

- **Relevant customer types** — Specific roles, company sizes, and industries to target
- **Communities where they hang out** — Subreddits, Slack groups, Discord servers, forums
- **Companies or leads to target** — Types of organizations that match your ICP
- **Creators, channels, and ecosystems** — Influencers, podcasts, newsletters, and platforms worth reaching

### 5. ICP Studio

Test your messaging against AI-generated customer personas grounded in real web evidence:

- **2-3 fictional but evidence-backed personas** — Each with a name, psychographics, pain points, and buying triggers
- **Simulated 5-second reactions** — How each persona would react to your homepage or pitch at first glance
- **Pain-point matching** — Identifies gaps between your current branding and what your customers actually care about
- **Focus group mode** — Test new messaging ideas, landing page copy, or product positioning against your personas

## User Flow

### Step 1: Submit your company info

Enter your company name and website URL. This is the only required input — everything else is optional but improves the analysis.

### Step 2: Add materials (optional)

Upload or paste additional context: pitch decks, product screenshots, marketing copy, demo videos, product docs, or a GitHub repo link. The more context FitCheck has, the richer the analysis.

### Step 3: Add competitors (optional)

Provide URLs for 1-3 competitors. FitCheck will crawl their sites and factor their positioning into your analysis, surfacing what differentiates you and where you overlap.

### Step 4: State your goal (optional)

Tell FitCheck what you're trying to achieve: "We want to move upmarket," "We're launching in Europe," "We need to stand out from [competitor]." This focuses the recommendations on what matters most to you.

### Step 5: Watch the analysis happen

A real-time progress screen shows each stage of the pipeline as it runs:

```
[====] Crawling company website...
[======] Scraping competitor sites...
[=========] Searching for public mentions and reviews...
[============] Running AI brand analysis...
[==============] Generating ICP profiles...
[================] Building personas...
[==================] Report ready!
```

### Step 6: Review your FitCheck report

A visual, interactive report with all 5 sections. Each insight is grounded in real evidence from your website, competitors, and public web data — not generic advice.

## How it works

```
User submits company info
        │
        ▼
┌──────────────────────┐
│   Apify Scraping     │  Website Content Crawler + Google Search Scraper
│   Layer              │  Crawls company site, competitors, reviews, mentions
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   AI Analysis        │  Claude or GPT-4o (switchable)
│   Layer              │  5 parallel analyses on scraped + uploaded data
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   FitCheck Report    │  Visual, actionable, evidence-backed
└──────────────────────┘
```

### The pipeline in detail

1. **Company material ingestion** — Collects uploaded files, URLs, company info, competitor links, and business goals
2. **Web intelligence layer (Apify)** — Crawls company pages, competitor sites, and searches for reviews, discussions, mentions, and market signals across the public web
3. **AI synthesis layer** — Uses LLMs to generate brand perception analysis, ICP hypotheses, strengths/weaknesses, recommended changes, and synthetic persona reactions
4. **Report generation** — Structures all findings into a visual, interactive report with evidence citations

## Apify Integration

Apify is the core data engine — not a bolt-on. It powers all web intelligence collection:

- **`apify/website-content-crawler`** — Crawls company and competitor websites, extracting content as clean markdown. Runs with the Cheerio crawler for speed, configured to capture up to 8 pages per company site and 4 per competitor.
- **`apify/google-search-scraper`** — Searches for public mentions across Reddit, Hacker News, G2, Trustpilot, and the broader web. Runs targeted queries like `"company name" reviews`, `"company name" site:reddit.com`, and `company name vs competitors`.

All Apify actors run in parallel using `Promise.allSettled` for resilience. If any individual scrape fails or times out (120s limit), the pipeline continues with whatever data was successfully collected. Partial data produces a less detailed but still useful report.

The scraped data is normalized into a structured format — pages truncated to prevent context window overflow, URLs deduplicated, mentions tagged by source — before being passed to the AI analysis layer.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router, fullstack) |
| UI | Tailwind CSS + shadcn/ui |
| Web data | Apify (website crawler + search scraper) |
| AI | Vercel AI SDK (Anthropic Claude / OpenAI GPT-4o / Google Gemini) |
| Real-time | Server-Sent Events (SSE) for progress tracking |
| Storage | In-memory (hackathon MVP) |
| Deploy | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- Apify account + API token
- Anthropic or OpenAI API key

### Setup

```bash
npm install
cp .env.example .env.local
# Fill in your API keys in .env.local
npm run dev
```

### Environment variables

```
APIFY_TOKEN=apify_api_xxxxx
AI_PROVIDER=anthropic          # or 'openai' / 'gemini'
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
GEMINI_API_KEY=xxxxx
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── analyze/page.tsx            # Multi-step onboarding form
│   ├── processing/[id]/page.tsx    # Real-time progress tracker (SSE)
│   ├── report/[id]/page.tsx        # Report view with all 5 sections
│   └── api/
│       ├── analyze/route.ts        # POST: Accept form, kick off pipeline
│       ├── status/[id]/route.ts    # GET: SSE stream for progress updates
│       └── report/[id]/route.ts    # GET: Fetch completed report
├── lib/
│   ├── types.ts                    # Shared TypeScript types
│   ├── apify/
│   │   ├── client.ts               # Apify API wrapper
│   │   ├── actors.ts               # Actor IDs and input builders
│   │   ├── orchestrator.ts         # Parallel scraping orchestration
│   │   └── normalizer.ts           # Raw data → structured format
│   ├── ai/
│   │   ├── provider.ts             # AI provider abstraction (Claude/GPT)
│   │   └── prompts.ts              # Prompt templates for all 5 report sections
│   └── pipeline/
│       ├── runner.ts               # Full pipeline: scrape → analyze → report
│       └── store.ts                # In-memory job state store
└── components/
    ├── ui/                         # shadcn/ui primitives
    ├── landing/                    # Hero and landing page components
    ├── form/                       # Multi-step onboarding wizard
    ├── processing/                 # Progress tracker with animations
    └── report/                     # 5 report section components
```

## License

MIT
