/**
 * Live and aggregate metrics for Experiment Mode sessions.
 */

import type {
  ExperimentLiveMetrics,
  ExperimentTranscriptEntry,
  PanelReaction,
  Persona,
} from '../types';

function sentimentScore(s: PanelReaction['sentiment']): number {
  if (s === 'positive') return 1;
  if (s === 'negative') return -1;
  if (s === 'skeptical') return -0.45;
  return 0;
}

function personaWeight(personas: Persona[], personaId: string): number {
  const p = personas.find((x) => x.id === personaId);
  if (p?.marketWeight != null) return p.marketWeight;
  return personas.length > 0 ? 100 / personas.length : 1;
}

function weightedMean(
  entries: ExperimentTranscriptEntry[],
  personas: Persona[],
  filter?: (e: ExperimentTranscriptEntry) => boolean,
): number {
  const list = filter ? entries.filter(filter) : entries;
  let num = 0;
  let den = 0;
  for (const e of list) {
    const w = personaWeight(personas, e.personaId);
    num += sentimentScore(e.sentiment) * w;
    den += w;
  }
  return den > 0 ? num / den : 0;
}

function recallHit(content: string, targets: string[]): boolean {
  const t = content.toLowerCase();
  return targets.some((x) => x.length > 1 && t.includes(x.toLowerCase()));
}

export function computeExperimentLiveMetrics(
  transcript: ExperimentTranscriptEntry[],
  personas: Persona[],
  personaIdsA: string[],
  personaIdsB: string[],
  recallTargets: string[],
): ExperimentLiveMetrics {
  const setA = new Set(personaIdsA);
  const setB = new Set(personaIdsB);
  const hasAb = personaIdsA.length > 0 && personaIdsB.length > 0;

  let objectionCount = 0;
  let recallHits = 0;

  for (const e of transcript) {
    if (e.sentiment === 'negative' || e.sentiment === 'skeptical') objectionCount++;
    if (recallTargets.length && recallHit(e.content, recallTargets)) recallHits++;
  }

  const variantAScore = weightedMean(
    transcript,
    personas,
    hasAb ? (e) => setA.has(e.personaId) : () => true,
  );
  const variantBScore = weightedMean(
    transcript,
    personas,
    hasAb ? (e) => setB.has(e.personaId) : () => false,
  );

  const conversionDeltaAB = hasAb ? variantAScore - variantBScore : null;

  return {
    conversionDeltaAB,
    variantAScore,
    variantBScore,
    objectionCount,
    recallHits,
    totalReactions: transcript.length,
  };
}
