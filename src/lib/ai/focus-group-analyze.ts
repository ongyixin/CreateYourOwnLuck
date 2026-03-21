/**
 * FitCheck — Focus Group Analytics Synthesis
 *
 * After a focus group session completes, this module sends the full transcript
 * to the main AI model and extracts structured, market-weighted analytics.
 */

import { generateText, Output } from 'ai';
import { z } from 'zod';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { FocusGroupAnalytics, FocusGroupSession } from '../types';
import { formatConversationHistory } from './focus-group';

// ─── Model selection (main model, not chat) ───────────────────────────────────

function getModel() {
  const provider = (process.env.AI_PROVIDER ?? 'gemini').toLowerCase();

  if (provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    return createAnthropic({ apiKey })('claude-sonnet-4-6');
  }

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    return createGoogleGenerativeAI({ apiKey })('gemini-2.5-pro');
  }

  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
    return createOpenAI({ apiKey })('gpt-4o');
  }

  throw new Error(`Unknown AI_PROVIDER "${provider}"`);
}

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const PersonaScoreSchema = z.object({
  personaId: z.string(),
  personaName: z.string(),
  personaTitle: z.string(),
  marketWeight: z
    .number()
    .min(0)
    .max(100)
    .describe('Estimated % share of the total addressable market for this segment'),
  conversionLikelihood: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe('0–100 score: how likely this persona is to actually buy or convert based on the session'),
  weightedSignal: z
    .number()
    .describe('conversionLikelihood × (marketWeight / 100), rounded to 1 decimal place'),
});

const RankedSegmentSchema = z.object({
  personaName: z.string(),
  personaTitle: z.string(),
  rationale: z
    .string()
    .describe('Why this segment ranks here — what signals from the session justify this position'),
  weightedSignal: z.number(),
});

const WeightedObjectionSchema = z.object({
  objection: z
    .string()
    .describe('Concise label for the objection, e.g. "Team adoption risk" or "Missing enterprise controls"'),
  tamPercent: z
    .number()
    .min(0)
    .max(100)
    .describe('Combined market weight of the personas who raised this objection'),
  raisedBy: z.array(z.string()).describe('Names of the personas who raised this objection'),
});

export const FocusGroupAnalyticsSchema = z.object({
  pmfScore: z
    .number()
    .min(0)
    .max(100)
    .describe('Market-weighted PMF score: sum of (conversionLikelihood × marketWeight / 100) across all personas'),
  personaScores: z
    .array(PersonaScoreSchema)
    .describe('One entry per persona, sorted by weightedSignal descending'),
  icpPriorityRanking: z
    .array(RankedSegmentSchema)
    .min(1)
    .describe('Personas ranked by acquisition priority (weightedSignal descending), include rationale'),
  topObjections: z
    .array(WeightedObjectionSchema)
    .min(1)
    .max(6)
    .describe('Key objections raised, sorted by tamPercent descending'),
  consensusSignals: z
    .array(z.string())
    .min(1)
    .max(6)
    .describe('Claims or aspects that resonated positively across multiple personas'),
  deadWeight: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe('Messaging or features that generated no positive response'),
  recommendedActions: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe('Specific, evidence-backed next steps the founder should take'),
  adjacentSegmentSignal: z
    .string()
    .optional()
    .describe('If there is a near-miss persona who could convert with specific changes, describe the opportunity'),
});

// ─── Prompt builder ───────────────────────────────────────────────────────────

export function buildFocusGroupAnalysisPrompt(session: FocusGroupSession): string {
  const personaProfiles = session.personas
    .map((p) => {
      const weight = p.marketWeight ?? Math.round(100 / session.personas.length);
      return `**${p.name}** (${p.title}, ~${weight}% of TAM)
- Pain points: ${p.painPoints.join('; ')}
- Buying triggers: ${p.buyingTriggers.join('; ')}
- Initial sentiment: ${p.fiveSecondReaction.sentiment}`;
    })
    .join('\n\n');

  const transcript = formatConversationHistory(session.messages);

  return `You are a market research analyst synthesizing a focus group session into quantified PMF signals.

## Participant Profiles

${personaProfiles}

## Full Session Transcript

${transcript}

## Your Task

Analyze the transcript and produce a structured Focus Group Report. For each persona:

1. Assess their **conversion likelihood** (0–100) based on how they engaged in the session — their enthusiasm, objections, and stated next actions.
2. Multiply by their **market weight** (provided above as % of TAM) to get a **weighted signal**.
3. Sum all weighted signals to produce the **market-weighted PMF score** (0–100).

Then extract:
- **ICP priority ranking** — who to acquire first, based on weighted signal
- **Top objections** — key blockers raised, weighted by the TAM % of who raised them
- **Consensus signals** — what landed positively across participants
- **Dead weight** — what generated no meaningful response
- **Recommended actions** — specific, non-generic next steps grounded in the transcript
- **Adjacent segment signal** — if any persona represents expansion upside with specific changes

Be concrete. Quote the transcript where relevant in rationale fields. Do not produce generic startup advice.`;
}

// ─── Generator ────────────────────────────────────────────────────────────────

export async function generateFocusGroupAnalytics(
  session: FocusGroupSession
): Promise<FocusGroupAnalytics> {
  const prompt = buildFocusGroupAnalysisPrompt(session);

  const result = await generateText({
    model: getModel() as any,
    output: Output.object({ schema: FocusGroupAnalyticsSchema }),
    system: `You are a quantitative market research analyst. Extract precise, evidence-backed signals from focus group transcripts. Never produce generic advice — every output must be grounded in what was actually said.`,
    prompt,
    temperature: 0.3,
  });

  return result.output as FocusGroupAnalytics;
}
