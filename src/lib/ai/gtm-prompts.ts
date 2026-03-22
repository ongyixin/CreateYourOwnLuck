// ============================================================
// FitCheck — GTM Brand Copilot Prompts + Zod Schemas
// Owned by: GTM agent
// ============================================================

import { z } from 'zod';
import type { FitCheckReport, GtmStrategy } from '../types';

// ============================================================
// Zod schemas
// ============================================================

const GtmObjectiveSchema = z.object({
  goal: z.string().describe('The specific GTM goal, e.g. "Reduce homepage bounce rate by 30%"'),
  metric: z.string().describe('The measurable KPI, e.g. "Homepage bounce rate" or "Trial conversion rate"'),
  rationale: z.string().describe('Why this objective matters given the brand analysis'),
  linkedActionables: z
    .array(z.string())
    .describe('Exact titles of actionables from the report this objective addresses'),
});

const MessagingWorkstreamSchema = z.object({
  id: z.string().describe('Short slug, e.g. "hero-rewrite"'),
  title: z.string().describe('Human-readable title, e.g. "Homepage hero rewrite"'),
  brief: z.string().describe('What needs to change and why — reference specific copy from the report'),
  placements: z
    .array(z.string())
    .describe('Where the new messaging will appear, e.g. ["Homepage hero", "Nav tagline", "CTA button"]'),
  toneShift: z.string().describe('Current tone → desired tone, e.g. "Technical/defensive → confident/outcome-first"'),
});

const CreativeWorkstreamSchema = z.object({
  id: z.string().describe('Short slug, e.g. "email-sequence"'),
  title: z.string().describe('Human-readable title'),
  assetType: z.enum(['landing_page', 'ad_copy', 'social_post', 'email_sequence', 'one_pager']),
  brief: z.string().describe('What to create and why — reference the brand gaps this addresses'),
  targetAudience: z.string().describe('The specific persona or segment this creative targets'),
  keyMessage: z.string().describe('The single most important message this asset must communicate'),
});

const OutreachWorkstreamSchema = z.object({
  id: z.string().describe('Short slug, e.g. "partner-outreach"'),
  title: z.string().describe('Human-readable title'),
  targetType: z.enum(['investor', 'partner', 'influencer', 'customer', 'press']),
  brief: z.string().describe('Why this outreach makes strategic sense right now'),
  channels: z
    .array(z.string())
    .describe('Which channels to use, e.g. ["LinkedIn DM", "Cold email", "Twitter/X reply"]'),
});

const GrowthWorkstreamSchema = z.object({
  id: z.string().describe('Short slug, e.g. "cta-ab-test"'),
  title: z.string().describe('Human-readable title'),
  experimentType: z.enum(['ab_test', 'landing_page_test', 'pricing_test', 'channel_test']),
  hypothesis: z
    .string()
    .describe('If [change], then [metric] will [direction] because [rationale]'),
  metric: z.string().describe('Primary success metric'),
  brief: z.string().describe('What to test, why, and the strategic context'),
});

export const GtmStrategySchema = z.object({
  summary: z
    .string()
    .describe(
      '2-3 sentence executive summary of the GTM strategy — the key insight and directional bet',
    ),
  objectives: z.array(GtmObjectiveSchema).min(2).max(4),
  messagingWorkstreams: z.array(MessagingWorkstreamSchema).min(1).max(3),
  creativeWorkstreams: z.array(CreativeWorkstreamSchema).min(1).max(3),
  outreachWorkstreams: z.array(OutreachWorkstreamSchema).min(1).max(3),
  growthWorkstreams: z.array(GrowthWorkstreamSchema).min(1).max(3),
});

// ──────────────────────────────────────────────────────────
// Messaging asset schema
// ──────────────────────────────────────────────────────────

export const MessagingAssetSchema = z.object({
  workstreamId: z.string(),
  workstreamTitle: z.string(),
  placements: z
    .array(
      z.object({
        placement: z.string(),
        before: z.string().describe('The actual current copy or what it implies'),
        after: z.string().describe('Ready-to-use replacement copy'),
        rationale: z.string(),
      }),
    )
    .min(1),
  positioningStatement:
    z.string().describe('One crisp sentence: For [ICP], [company] is the [category] that [differentiator]'),
  valueProps: z.array(z.string()).min(2).max(5).describe('3-5 concrete value propositions'),
  proofPoints: z.array(z.string()).min(2).max(5).describe('Specific evidence supporting the positioning'),
  toneGuide: z.string().describe('2-3 sentences describing the voice, tone, and what to avoid'),
});

// ──────────────────────────────────────────────────────────
// Creative asset schema
// ──────────────────────────────────────────────────────────

export const CreativeAssetSchema = z.object({
  workstreamId: z.string(),
  workstreamTitle: z.string(),
  assetType: z.enum(['landing_page', 'ad_copy', 'social_post', 'email_sequence', 'one_pager']),
  blocks: z
    .array(
      z.object({
        label: z.string().describe('Section name, e.g. "Hero headline", "Email subject line", "Ad variant A"'),
        content: z.string().describe('Full ready-to-use copy for this block'),
      }),
    )
    .min(2),
  notes: z.string().describe('Designer/developer notes: visual direction, CTA placement, layout hints'),
});

// ──────────────────────────────────────────────────────────
// Outreach asset schema
// ──────────────────────────────────────────────────────────

export const OutreachAssetSchema = z.object({
  workstreamId: z.string(),
  workstreamTitle: z.string(),
  targetType: z.enum(['investor', 'partner', 'influencer', 'customer', 'press']),
  stakeholderProfiles: z
    .array(
      z.object({
        role: z.string(),
        companyType: z.string(),
        whyTheyMatter: z.string(),
      }),
    )
    .min(2)
    .max(4),
  templates: z
    .array(
      z.object({
        channel: z.string(),
        subject: z.string().optional(),
        body: z.string(),
      }),
    )
    .min(1),
  followUpSequence: z
    .array(z.string())
    .min(2)
    .max(4)
    .describe('Follow-up touchpoints, e.g. "Day 3: Share one relevant case study"'),
});

// ──────────────────────────────────────────────────────────
// Growth asset schema
// ──────────────────────────────────────────────────────────

export const GrowthAssetSchema = z.object({
  workstreamId: z.string(),
  workstreamTitle: z.string(),
  experimentType: z.enum(['ab_test', 'landing_page_test', 'pricing_test', 'channel_test']),
  hypothesis: z.string(),
  control: z.string().describe('The existing baseline (what users see today)'),
  variant: z.string().describe('The change being tested'),
  successMetric: z.string(),
  sampleSizeNote: z
    .string()
    .describe('Plain-English guidance on minimum sample size or test duration'),
  implementationSteps: z.array(z.string()).min(3).max(7),
  copyVariants: z
    .array(
      z.object({
        label: z.string(),
        copy: z.string(),
      }),
    )
    .min(2)
    .describe('The actual copy variants to test, labelled A/B or Control/Variant'),
});

// ============================================================
// Prompt builders
// ============================================================

function formatReportSummary(report: FitCheckReport): string {
  const bp = report.brandPerception;
  const lines: string[] = [
    `## Company: ${report.companyName} (${report.websiteUrl})`,
    ``,
    `### Brand Perception`,
    `Consistency score: ${bp.consistencyScore ?? 'N/A'}/100`,
    bp.summary ? `Summary: ${bp.summary}` : '',
    bp.toneAndIdentity?.length
      ? `Tone: ${bp.toneAndIdentity.slice(0, 5).join(', ')}`
      : '',
    bp.perceivedStrengths?.length
      ? `Strengths: ${bp.perceivedStrengths.slice(0, 3).map((s) => s.title).join('; ')}`
      : '',
    bp.weakOrConfusingSignals?.length
      ? `Weaknesses: ${bp.weakOrConfusingSignals.slice(0, 3).map((w) => w.title).join('; ')}`
      : '',
  ];

  const icp = report.icpAssessment;
  if (icp) {
    lines.push(``, `### ICP Assessment`);
    lines.push(`Summary: ${icp.summary}`);
    if (icp.audienceSegments?.length) {
      const top = icp.audienceSegments[0];
      lines.push(`Top segment: ${top.label} (fit score: ${top.fitScore})`);
    }
  }

  const act = report.actionables;
  if (act) {
    lines.push(``, `### Actionables Summary`);
    if (act.whatToImprove?.length) {
      lines.push(`What to improve: ${act.whatToImprove.map((a) => a.title).join(', ')}`);
    }
    if (act.whatToChange?.length) {
      lines.push(`What to change: ${act.whatToChange.map((a) => a.title).join(', ')}`);
    }
    if (act.whatToLeanInto?.length) {
      lines.push(`What to lean into: ${act.whatToLeanInto.map((a) => a.title).join(', ')}`);
    }
    if (act.messagingAngles?.length) {
      lines.push(
        `Messaging angles: ${act.messagingAngles.map((a) => `"${a.angle}"`).join(', ')}`,
      );
    }
    if (act.copySuggestions?.length) {
      lines.push(
        `Copy suggestions:\n${act.copySuggestions
          .map((s) => `  - ${s.placement}: "${s.before}" → "${s.after}"`)
          .join('\n')}`,
      );
    }
  }

  return lines.filter(Boolean).join('\n');
}

export const GTM_SYSTEM_PROMPT = `You are FitCheck's GTM Brand Copilot — an expert go-to-market strategist who turns brand analysis into executable strategy.

Your job is to take a completed FitCheck brand analysis and produce actionable GTM workstreams that a founding team can execute this week.

Core rules:
- Every workstream must be grounded in specific findings from the analysis. No generic startup advice.
- Be specific and opinionated. Name the exact copy to change, the exact audience to target, the exact hypothesis to test.
- Prioritize ruthlessly — only include what would move the needle in the next 30-90 days.
- Output must match the requested JSON schema exactly.`;

export function buildStrategistPrompt(report: FitCheckReport): string {
  const summary = formatReportSummary(report);
  return `Based on this FitCheck brand analysis, produce a concrete GTM execution strategy.

${summary}

The strategy should:
1. Identify 2-4 clear GTM objectives tied directly to the report's actionables
2. Define 1-3 messaging workstreams (copy changes to make immediately)
3. Define 1-3 creative workstreams (assets to produce: landing pages, ads, emails)
4. Define 1-3 outreach workstreams (who to contact and how)
5. Define 1-3 growth experiment workstreams (what to A/B test or experiment with)

Be direct and specific. Reference actual findings from the report as justification for each workstream.`;
}

export function buildMessagingAgentPrompt(
  workstream: { id: string; title: string; brief: string; placements: string[]; toneShift: string },
  report: FitCheckReport,
): string {
  const summary = formatReportSummary(report);
  return `You are executing the following messaging workstream for ${report.companyName}:

**Workstream:** ${workstream.title}
**Brief:** ${workstream.brief}
**Target placements:** ${workstream.placements.join(', ')}
**Tone shift:** ${workstream.toneShift}

Brand context:
${summary}

Produce:
1. A rewrite for each placement — cite the current copy from the report as "before", provide a ready-to-use replacement as "after"
2. A crisp positioning statement (For [ICP], [company] is the [category] that [differentiator])
3. 3-5 concrete value propositions
4. 3-5 specific proof points from the existing brand data
5. A 2-3 sentence tone guide

Every "after" must be immediately usable copy, not a description of what to write.`;
}

export function buildCreativeAgentPrompt(
  workstream: { id: string; title: string; assetType: string; brief: string; targetAudience: string; keyMessage: string },
  report: FitCheckReport,
): string {
  const summary = formatReportSummary(report);
  return `You are executing the following creative workstream for ${report.companyName}:

**Workstream:** ${workstream.title}
**Asset type:** ${workstream.assetType}
**Brief:** ${workstream.brief}
**Target audience:** ${workstream.targetAudience}
**Key message:** ${workstream.keyMessage}

Brand context:
${summary}

Produce the complete asset as structured content blocks. Each block should have a clear label (e.g. "Hero headline", "Subhead", "Email subject line", "Ad variant A") and full ready-to-use copy.

Requirements by asset type:
- landing_page: hero, subhead, 3 feature sections, social proof, CTA
- ad_copy: 3-4 variants across different angles (pain, outcome, credibility)
- social_post: 3-4 posts for different platforms/angles
- email_sequence: subject line + body for 3-email nurture sequence
- one_pager: headline, problem, solution, proof, CTA

Also provide implementation notes for the designer/developer.`;
}

export function buildOutreachAgentPrompt(
  workstream: { id: string; title: string; targetType: string; brief: string; channels: string[] },
  report: FitCheckReport,
): string {
  const summary = formatReportSummary(report);
  return `You are executing the following outreach workstream for ${report.companyName}:

**Workstream:** ${workstream.title}
**Target type:** ${workstream.targetType}
**Brief:** ${workstream.brief}
**Channels:** ${workstream.channels.join(', ')}

Brand context:
${summary}

Produce:
1. 2-4 stakeholder profiles — describe the ideal person to reach out to (role, company type, why they matter for ${report.companyName} right now)
2. Message templates for each channel — subject line (if applicable) + full body. Make these personal and specific, not generic. Reference ${report.companyName}'s actual positioning.
3. A 2-4 step follow-up sequence with timing and what to send at each touchpoint

Templates should feel like they were written by the founder, not a marketing automation tool.`;
}

export function buildGrowthAgentPrompt(
  workstream: { id: string; title: string; experimentType: string; hypothesis: string; metric: string; brief: string },
  report: FitCheckReport,
): string {
  const summary = formatReportSummary(report);
  return `You are executing the following growth experiment workstream for ${report.companyName}:

**Workstream:** ${workstream.title}
**Experiment type:** ${workstream.experimentType}
**Hypothesis:** ${workstream.hypothesis}
**Success metric:** ${workstream.metric}
**Brief:** ${workstream.brief}

Brand context:
${summary}

Produce:
1. A clear hypothesis (If [change], then [metric] will [direction] because [rationale])
2. Describe the control (what exists today) and the variant (what to change)
3. Practical implementation steps (3-7 steps)
4. Sample size or test duration guidance (plain English, no stats jargon)
5. 2+ actual copy variants to test — the exact words, headlines, or CTAs

Be specific enough that a developer could implement this tomorrow.`;
}

export type { GtmStrategy };
