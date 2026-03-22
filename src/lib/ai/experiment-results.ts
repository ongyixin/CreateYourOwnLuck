/**
 * Synthesizes an Experiment Results Report after the controlled session completes.
 */

import { generateText, Output } from 'ai';
import { z } from 'zod';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type {
  ExperimentDesignDocument,
  ExperimentResultsReport,
  ExperimentTranscriptEntry,
  Persona,
} from '../types';
import { computeExperimentLiveMetrics } from '../experiment/metrics';

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

const PersonaVariantScoreSchema = z.object({
  personaId: z.string(),
  personaName: z.string(),
  variant: z.enum(['A', 'B', 'pooled']),
  conversionScore: z.number().min(0).max(100),
  recallHit: z.boolean(),
  topObjection: z.string().optional(),
});

const ExperimentResultsSchema = z.object({
  personaScoresByVariant: z.array(PersonaVariantScoreSchema),
  weightedPmfDelta: z.number(),
  hypothesisStatus: z.enum(['supported', 'inconclusive', 'not_supported']),
  topObjectionsByVariant: z.record(
    z.string(),
    z.array(
      z.object({
        objection: z.string(),
        tamPercent: z.number(),
        raisedBy: z.array(z.string()),
      }),
    ),
  ),
  messageRecallComparison: z.string(),
  plainLanguageRecommendation: z.string(),
});

const DISCLAIMER =
  'These results are directional outputs from a synthetic persona panel and are not a substitute for live user research. Validate conclusions with real customers before making major decisions.';

function confidenceFromPoolSize(n: number): 'low' | 'medium' | 'high' {
  if (n < 4) return 'low';
  if (n < 6) return 'medium';
  return 'high';
}

function formatTranscript(entries: ExperimentTranscriptEntry[]): string {
  return entries
    .map(
      (e) =>
        `[${e.stepLabel}${e.variant ? ` · ${e.variant}` : ''}] ${e.personaName}: ${e.content} (${e.sentiment})`,
    )
    .join('\n');
}

export async function generateExperimentResultsReport(input: {
  design: ExperimentDesignDocument;
  transcript: ExperimentTranscriptEntry[];
  personas: Persona[];
  personaIdsA: string[];
  personaIdsB: string[];
  experimentType: string;
}): Promise<ExperimentResultsReport> {
  const { design, transcript, personas, personaIdsA, personaIdsB } = input;
  const live = computeExperimentLiveMetrics(
    transcript,
    personas,
    personaIdsA,
    personaIdsB,
    design.recallTargets,
  );

  const prompt = `You are synthesizing outcomes from a controlled synthetic panel experiment.

## Design summary
- Testable hypothesis: ${design.testableHypothesis}
- Methodology (designer): ${design.methodology}
- Positive / neutral / negative rubric:
  - Positive: ${design.positiveResult}
  - Neutral: ${design.neutralResult}
  - Negative: ${design.negativeResult}

## Live metrics snapshot (heuristic, from sentiment + recall string match)
- Weighted sentiment mean variant A: ${live.variantAScore.toFixed(3)}
- Weighted sentiment mean variant B: ${live.variantBScore.toFixed(3)}
- A − B delta (sentiment proxy): ${(live.conversionDeltaAB ?? 0).toFixed(3)}
- Objection-like turns (skeptical/negative count): ${live.objectionCount}
- Recall target substring hits (noisy): ${live.recallHits}

## Transcript
${formatTranscript(transcript).slice(0, 28000)}

## Instructions
1. personaScoresByVariant: one row per persona in the session. conversionScore is 0–100 estimated likelihood to convert / adopt based on their statements. variant is "A" or "B" if their arm was A/B, else "pooled".
2. weightedPmfDelta: market-weighted PMF-style delta between arms if A/B was run (else use 0). Scale roughly -50..+50 similar to "points of PMF".
3. hypothesisStatus: supported | inconclusive | not_supported — based on evidence strength (small N → prefer inconclusive).
4. topObjectionsByVariant: keys must be "A", "B", and/or "pooled" as applicable. List top 3 objections each with tamPercent summing market weights of personas raising it.
5. messageRecallComparison: 2–4 sentences comparing recall / message stickiness across arms if applicable.
6. plainLanguageRecommendation: 1 short paragraph for a founder.

Ground every claim in the transcript; if evidence is thin, say so.`;

  const result = await generateText({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: getModel() as any,
    output: Output.object({ schema: ExperimentResultsSchema }),
    prompt,
    system:
      'You are a quantitative UX researcher. Be conservative when evidence is weak. No hallucinated quotes.',
  });

  const out = result.output as z.infer<typeof ExperimentResultsSchema>;

  return {
    personaScoresByVariant: out.personaScoresByVariant,
    weightedPmfDelta: out.weightedPmfDelta,
    hypothesisStatus: out.hypothesisStatus,
    topObjectionsByVariant: out.topObjectionsByVariant,
    messageRecallComparison: out.messageRecallComparison,
    plainLanguageRecommendation: out.plainLanguageRecommendation,
    confidenceLevel: confidenceFromPoolSize(personas.length),
    disclaimer: DISCLAIMER,
  };
}
