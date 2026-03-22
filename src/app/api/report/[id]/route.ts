/**
 * GET /api/report/[id]
 *
 * Returns the completed FitCheckReport, or a 202 response while the job is
 * still running, or 404/500 for missing/failed jobs.
 *
 * Response shapes:
 *   404  { error: "Job not found" }
 *   202  { status: "pending" | "running", progress: number }
 *   500  { error: string, status: "failed" }
 *   200  FitCheckReport
 *
 * Demo: GET /api/report/demo always returns rich mock data for UI testing.
 *   Visit /report/demo to see the full report experience without running a pipeline.
 *
 * Owned by: backend agent (demo data added by report agent)
 */

import type { FitCheckReport, PendingReportResponse } from "../../../../lib/types";
import { getJob } from "../../../../lib/pipeline/store";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

// ─── Demo / mock report (report agent) ───────────────────────────────────────

const DEMO_REPORT: FitCheckReport = {
  jobId: "demo",
  companyName: "Acme Analytics",
  websiteUrl: "https://acmeanalytics.io",
  generatedAt: new Date().toISOString(),
  warnings: [
    "Competitor site acme-rival.com returned 0 pages (blocked by bot protection)",
  ],
  brandPerception: {
    summary:
      "Acme Analytics projects a technically credible but subtly inaccessible brand. The messaging resonates with engineers but loses the business stakeholders who hold the purchasing decision. There's real signal here — it's just hidden behind too much infrastructure language.",
    toneAndIdentity: ["technical", "data-forward", "startup-y", "credible", "dense"],
    consistencyScore: 62,
    perceivedStrengths: [
      {
        title: "Genuine Technical Depth",
        description:
          "Engineering blog and documentation signal real expertise. Developer audiences pick up on this immediately, creating strong word-of-mouth in technical communities.",
        evidence: [
          {
            quote: "Their pipeline architecture post on HN got 400+ points — the technical depth is real.",
            sourceLabel: "Hacker News thread",
            sourceUrl: "https://news.ycombinator.com",
          },
        ],
      },
      {
        title: "Clear Pain Statement",
        description:
          "The homepage hero does a good job of naming the specific pain: 'stop guessing what your data means.' This is concrete and resonates with time-pressed founders.",
        evidence: [
          {
            quote: '"Stop guessing what your data means" — landing page hero copy',
            sourceLabel: "acmeanalytics.io homepage",
          },
        ],
      },
      {
        title: "Fast Time-to-Value Reputation",
        description:
          "Multiple reviews mention getting a first useful dashboard in under 10 minutes. This is a strong differentiator that's currently underused in marketing.",
        evidence: [
          {
            quote: '"Got my first useful dashboard in under 10 minutes, no joke."',
            sourceLabel: "G2 review",
            sourceUrl: "https://g2.com",
          },
        ],
      },
    ],
    weakOrConfusingSignals: [
      {
        title: "Business Value Buried",
        description:
          "ROI and business outcomes appear only on the pricing page. Decision-makers who don't scroll deep will miss the value proposition entirely and bounce.",
        evidence: [
          {
            quote: '"I had to dig to figure out if this was for me as a non-technical founder."',
            sourceLabel: "r/SaaS Reddit thread",
            sourceUrl: "https://reddit.com/r/SaaS",
          },
        ],
      },
      {
        title: "Split-Personality Tone",
        description:
          "The blog uses casual, conversational language while the product UI and docs are extremely technical. This inconsistency creates confusion about who the product is actually for.",
        evidence: [],
      },
      {
        title: "Missing Non-Engineer Social Proof",
        description:
          "All testimonials are from engineers or CTOs. Founders and growth marketers — who make or influence purchase decisions — see no one like themselves.",
        evidence: [
          {
            quote: "All case studies feature engineering teams, not business owners.",
            sourceLabel: "acmeanalytics.io/customers",
          },
        ],
      },
    ],
  },
  icpAssessment: {
    summary:
      "Your strongest segment is technically-literate founders at seed to Series A who have outgrown spreadsheets but can't justify a full data team. A secondary, high-potential segment is growth marketers at PLG SaaS — they have the pain, budget authority, and a specific attribution problem your product can solve, but your current messaging doesn't reach them.",
    audienceSegments: [
      { label: "Seed/Series A Technical Founders", fitScore: 91, rationale: "Directly addressed by product positioning and pain language. Have both the pain and authority to buy solo." },
      { label: "Growth Marketers at PLG SaaS", fitScore: 74, rationale: "High intent and budget. Attribution and channel ROI are daily pains, but brand language doesn't speak their dialect." },
      { label: "Indie Hackers & Solo Builders", fitScore: 68, rationale: "Strong community match, viral potential, but lower revenue per customer. Good for growth, not enterprise ARR." },
      { label: "Enterprise Data Analysts", fitScore: 38, rationale: "Product lacks enterprise features (SSO, audit logs, RBAC). Pricing doesn't match enterprise expectations." },
    ],
    profiles: [
      {
        name: "Technical Founder",
        description: "A founder-engineer who builds and ships. Needs data insights without hiring a data team. Makes most purchasing decisions independently.",
        fitScore: 91,
        painPoints: [
          "Spending hours weekly rebuilding the same Google Sheets dashboard",
          "Investors asking for cohort analysis that doesn't exist yet",
          "Can't tell which acquisition channels are actually driving revenue",
        ],
        motivations: ["Ship faster and focus on product", "Look credible to investors", "Make data-backed decisions without a data hire"],
        buyingTriggers: ["Board meeting in 2–3 weeks", "Just closed a funding round", "Team crossed 10 people and spreadsheets are breaking"],
        evidence: [
          {
            quote: '"I spend 4 hours every Monday morning making the same Google Sheets dashboard for our weekly sync."',
            sourceLabel: "Indie Hackers forum discussion",
            sourceUrl: "https://indiehackers.com",
          },
        ],
      },
      {
        name: "Head of Growth",
        description: "Performance-focused marketer at a B2B SaaS. Runs experiments constantly and needs clean, reliable channel data to justify spend.",
        fitScore: 74,
        painPoints: ["Revenue attribution scattered across 6+ paid channels", "Data team backlog is 3 weeks — experiments get blocked", "CEO asks weekly why paid CAC keeps climbing"],
        motivations: ["Prove channel ROI with confidence", "Run more experiments with less engineering dependency", "Show measurable impact to leadership"],
        buyingTriggers: ["Missed quarterly target and needs a channel audit", "New attribution tool just failed them", "Promoted to VP and needs to demonstrate impact quickly"],
        evidence: [],
      },
    ],
  },
  actionables: {
    whatToImprove: [
      {
        title: "Lead with business outcomes in the hero",
        description: "The hero currently leads with features. Add a line that translates to business impact. Decision-makers need to understand the outcome before they care about how it works.",
        priority: "high",
        evidence: [{ quote: "B2B SaaS companies see 20–30% higher conversion when hero copy addresses a business outcome vs. a feature.", sourceLabel: "CXL Blog — Landing Page Optimization" }],
      },
      {
        title: "Add non-technical social proof section",
        description: "Create a dedicated section of testimonials from founders and growth marketers, not just engineers. This unlocks the 74% of potential buyers who don't see themselves in current social proof.",
        priority: "high",
        evidence: [],
      },
      {
        title: "Simplify onboarding language",
        description: "The onboarding flow uses infrastructure terminology (schemas, warehouses, pipelines) that creates cognitive friction for non-engineers. Replace with outcome-oriented steps.",
        priority: "medium",
        evidence: [{ quote: '"I almost dropped off during setup — too many technical terms for what I needed."', sourceLabel: "App Store review" }],
      },
    ],
    whatToChange: [
      {
        title: "Drop the 'data warehouse' positioning",
        description: "Competing on infrastructure against Snowflake and BigQuery is a losing battle. Reframe entirely around speed-to-insight and founder outcomes, not data architecture.",
        priority: "high",
        evidence: [{ quote: '"We already have Snowflake, not sure what this adds on top."', sourceLabel: "G2 Reviews", sourceUrl: "https://g2.com" }],
      },
      {
        title: "Remove jargon from CTA area",
        description: 'CTAs like "Connect your data stack" assume familiarity with warehouse terminology. Replace with direct, outcome-oriented language for both technical and non-technical visitors.',
        priority: "medium",
        evidence: [],
      },
    ],
    whatToLeanInto: [
      {
        title: "Speed-to-insight as the hero differentiator",
        description: '"Under 10 minutes to first dashboard" appears in 6 of 12 most-helpful G2 reviews. This is legitimately rare in analytics and should be front and center — not buried in a feature list.',
        priority: "high",
        evidence: [{ quote: '"First useful dashboard in under 10 minutes" appears in 6 of the 12 most helpful G2 reviews.', sourceLabel: "G2 review analysis" }],
      },
      {
        title: "Developer community trust",
        description: "The HN traction and technical blog are working. Lean into engineering content marketing — it builds pipeline with technical founders who become champions inside companies.",
        priority: "medium",
        evidence: [],
      },
    ],
    messagingAngles: [
      {
        angle: "Analytics for teams who can't afford a data team",
        rationale: "Directly addresses the gap between spreadsheets and a data hire. Resonates strongly with seed/Series A founders.",
        exampleHeadline: "Enterprise-grade analytics. No data team required.",
      },
      {
        angle: "From zero to dashboard in 10 minutes",
        rationale: "Speed is the clear and defensible differentiator in user reviews. Make the time-to-value the headline, not a footnote.",
        exampleHeadline: "Connect your data. See what's working. In 10 minutes.",
      },
      {
        angle: "The dashboard your investors keep asking for",
        rationale: "Highly specific to the primary ICP trigger: board decks and investor requests. Names an exact, recurring, stressful moment.",
        exampleHeadline: "Build investor-ready dashboards in an afternoon. Without SQL.",
      },
    ],
    copySuggestions: [
      {
        placement: "Homepage hero subheading",
        before: "A unified analytics platform built for modern data stacks.",
        after: "See which channels are actually driving revenue — without engineers, SQL, or a data team.",
        rationale: "Replaces infrastructure jargon with a specific, outcome-focused value prop that speaks directly to the primary ICP.",
      },
      {
        placement: "Primary CTA button",
        before: "Get Started",
        after: "See Your Data in 10 Minutes",
        rationale: "Reinforces the speed differentiator and sets a concrete, credible expectation that reduces signup hesitation.",
      },
      {
        placement: "Features section headline",
        before: "Everything you need to analyze your data",
        after: "Your board deck, weekly metrics, and channel ROI — automated.",
        rationale: "Names three specific, high-value outputs instead of the generic 'everything you need' pattern that every analytics tool uses.",
      },
    ],
  },
  leadSuggestions: {
    customerTypes: [
      {
        role: "Founder / CTO",
        companySizes: ["Seed", "Series A"],
        industries: ["B2B SaaS", "Fintech", "Dev Tools"],
        rationale: "Highest fit with current positioning. Have both the pain and solo purchase authority.",
      },
      {
        role: "Head of Growth / VP Marketing",
        companySizes: ["Series A", "Series B"],
        industries: ["PLG SaaS", "E-commerce", "Marketplace"],
        rationale: "Large underserved segment with urgent attribution pain. Have budget and quarterly targets that make them active buyers.",
      },
      {
        role: "Product Manager (data-focused)",
        companySizes: ["Series A", "Series B", "Series C"],
        industries: ["Consumer Tech", "SaaS", "Marketplace"],
        rationale: "Increasingly owning analytics tooling decisions. Need product metrics without depending on data engineering.",
      },
    ],
    communities: [
      { name: "r/startups", platform: "Reddit", url: "https://reddit.com/r/startups", rationale: "High concentration of seed/Series A founders actively discussing tools, processes, and metrics." },
      { name: "Indie Hackers", platform: "Forum", url: "https://indiehackers.com", rationale: "Technical founders who self-serve and actively share tool reviews. Strong amplification potential." },
      { name: "Demand Curve Slack", platform: "Slack", rationale: "Growth marketers sharing channel attribution problems daily. Very relevant to the secondary ICP." },
      { name: "r/analytics", platform: "Reddit", url: "https://reddit.com/r/analytics", rationale: "Practitioners looking for tool recommendations. Good for SEO-adjacent content and organic discovery." },
      { name: "SaaS Alliance Discord", platform: "Discord", rationale: "Founders and operators sharing growth tactics. High signal-to-noise ratio for B2B SaaS tools." },
    ],
    targetCompanyProfiles: [
      {
        description: "B2B SaaS companies that have recently raised seed or Series A and are building out their metrics reporting for the first time.",
        exampleTypes: ["Post-seed SaaS (6–18 months after raising)", "PLG companies approaching first enterprise deal", "Developer tools with growing teams"],
        rationale: "Just raised money, just got investors asking for dashboards. Have budget and urgency simultaneously.",
      },
      {
        description: "E-commerce or marketplace companies running 3+ paid channels without a unified attribution view.",
        exampleTypes: ["DTC brands scaling paid acquisition", "B2B marketplace operators", "SaaS with heavy performance marketing"],
        rationale: "Attribution pain is acute and budget is tied directly to channel ROI. High willingness to pay for clarity.",
      },
    ],
    creatorChannels: [
      { name: "Lenny's Newsletter", type: "newsletter", url: "https://lennysnewsletter.com", rationale: "Read by exactly the growth + founder audience. Highly trusted for tool recommendations." },
      { name: "My First Million", type: "podcast", rationale: "Large entrepreneurial audience constantly seeking tools to move faster. Strong ICP overlap." },
      { name: "Corey Haines (Swipefiles)", type: "influencer", url: "https://swipefiles.com", rationale: "Marketing-focused audience, high overlap with growth marketing ICP. Known for honest SaaS tool reviews." },
      { name: "No-Code Founders YouTube", type: "youtube", rationale: "Non-technical founders seeking accessible tools. Strong alignment with the 'no data team required' angle." },
    ],
  },
  icpStudio: {
    personas: [
      {
        id: "p1",
        name: "Alex Rivera",
        title: "Co-founder & CTO, 8-person B2B SaaS",
        age: 31,
        psychographics: ["builder-first mindset", "data-skeptical until proven", "values speed over polish", "hates busywork", "trusts technical peers"],
        painPoints: [
          "Investors keep asking for cohort analysis that doesn't exist yet",
          "Spending 4 hours every Monday rebuilding the same Sheets dashboard",
          "Can't tell which acquisition channels are actually driving signups",
        ],
        buyingTriggers: ["Board deck due in 3 weeks with no clean metrics", "Just hit 100 paying customers, needs to understand retention", "First non-technical hire needs data access without asking engineering"],
        fiveSecondReaction: {
          sentiment: "positive",
          reaction: "Oh, this is actually for me. It's not another Tableau. The 'no data team required' thing is exactly what I needed to see.",
          firstImpression: "The hero headline and the '10 minutes to first dashboard' claim",
          likelyAction: "Click the primary CTA",
        },
        painPointGaps: [
          "Current copy doesn't mention investor-ready reports — that's Alex's primary trigger right now",
          "No social proof from technical founders specifically, only generic testimonials",
          "Setup flow uses warehouse terminology that creates friction before the aha moment",
        ],
        evidence: [{ quote: '"I spend 4 hours every Monday morning making the same Google Sheets dashboard for our weekly sync."', sourceLabel: "Indie Hackers forum", sourceUrl: "https://indiehackers.com" }],
      },
      {
        id: "p2",
        name: "Sarah Kim",
        title: "Head of Growth, Series B PLG SaaS",
        age: 34,
        psychographics: ["experiment-obsessed", "attribution-anxious", "rigorous evaluator", "results-driven", "skeptical of vendor claims"],
        painPoints: [
          "Revenue attribution is unreliable across 6 paid channels",
          "Data team backlog is 3 weeks — growth experiments are blocked",
          "CEO asks weekly why paid CAC keeps climbing, she can't pinpoint why",
        ],
        buyingTriggers: ["Missed Q3 pipeline target, needs a definitive channel audit", "Previous attribution tool gave conflicting numbers with Salesforce", "Just promoted to VP, needs to demonstrate measurable impact"],
        fiveSecondReaction: {
          sentiment: "neutral",
          reaction: "Looks like another analytics tool. I need to see if this handles multi-touch attribution before I spend another minute here. Where's the integrations list?",
          firstImpression: "The 'no data team' headline — but immediately wonders if it's powerful enough for her use case",
          likelyAction: "Scroll to integrations or features section",
        },
        painPointGaps: [
          "Multi-touch attribution and channel ROI are not mentioned anywhere on the homepage",
          "No case studies from growth teams — only founders and CTOs",
          "Missing integration logos for ad platforms (Meta, Google Ads, LinkedIn)",
        ],
        evidence: [],
      },
      {
        id: "p3",
        name: "Marcus Osei",
        title: "Indie Hacker, bootstrapped SaaS, solo",
        age: 28,
        psychographics: ["cost-conscious", "self-sufficient", "community-driven", "early adopter", "vocal when it works"],
        painPoints: [
          "Every analytics tool is priced for enterprise, not solo builders",
          "Spends more time managing tools than building product",
          "Wants to know what's working without a dashboard full of noise",
        ],
        buyingTriggers: ["Writing a 'tools I use' post and realized his analytics setup is embarrassing", "Saw a competitor mention a specific metric he can't access easily", "Revenue crossed $1k MRR, wants to understand growth levers"],
        fiveSecondReaction: {
          sentiment: "positive",
          reaction: "This could actually be it. I've been looking for something simple that doesn't cost $500/month. What's the pricing?",
          firstImpression: "The 'no data team required' angle and overall simplicity of the hero",
          likelyAction: "Click to pricing page immediately",
        },
        painPointGaps: [
          "No solo/indie pricing tier visible in hero — Marcus will bounce to pricing and might not return",
          "No community proof (Indie Hackers, Twitter) — Marcus trusts peer recommendations over marketing copy",
          "Template gallery or example dashboards would reduce his setup anxiety",
        ],
        evidence: [{ quote: '"All I want is to see my MRR, churn, and top channels in one place without paying for a BI tool."', sourceLabel: "r/indiehackers post", sourceUrl: "https://reddit.com/r/indiehackers" }],
      },
    ],
  },
};

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  const { id } = params;

  // Demo mode — always return rich mock data (no pipeline required)
  if (id === "demo") {
    return Response.json({ ...DEMO_REPORT, generatedAt: new Date().toISOString() });
  }

  // ── Require authentication ────────────────────────────────────────────────

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Verify ownership via DB ───────────────────────────────────────────────
  // The Analysis record is created before the pipeline starts, so it always
  // exists for valid jobs regardless of whether the job is still in memory.

  const record = await prisma.analysis.findUnique({
    where: { jobId: id },
    select: { userId: true, status: true, reportJson: true },
  });

  if (!record) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  const isAdmin = session.user.role === "ADMIN";
  if (record.userId !== session.user.id && !isAdmin) {
    // Return 404 rather than 403 to avoid leaking job existence
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  // ── Check in-memory job for live status (takes precedence for running jobs)

  const job = getJob(id);

  if (job) {
    if (job.status === "failed") {
      return Response.json(
        { error: job.error ?? "Analysis failed", status: "failed" },
        { status: 500 }
      );
    }

    if (job.status === "pending" || job.status === "running") {
      const pending: PendingReportResponse = {
        status: job.status,
        progress: job.progress,
      };
      return Response.json(pending, { status: 202 });
    }

    if (job.report) {
      return Response.json(job.report, { status: 200 });
    }

    return Response.json({ error: "Report data is missing" }, { status: 500 });
  }

  // ── Not in memory — use DB record (e.g. after server restart) ────────────

  if (record.status === "failed") {
    return Response.json({ error: "Analysis failed", status: "failed" }, { status: 500 });
  }

  if (record.status !== "complete" || !record.reportJson) {
    return Response.json({ status: record.status, progress: 0 }, { status: 202 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Response.json(record.reportJson as any as FitCheckReport, { status: 200 });
}
