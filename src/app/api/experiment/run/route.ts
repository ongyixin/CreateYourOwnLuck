/**
 * POST /api/experiment/run
 *
 * Controlled experiment session — SSE stream.
 * See handler for event types.
 */

import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { requireTier } from '@/lib/auth/require-tier';
import type {
  ExperimentOrchestrationStep,
  ExperimentRunRequest,
  ExperimentTranscriptEntry,
  MediaAttachment,
  PanelReaction,
  Persona,
} from '@/lib/types';
import { assignMarketWeights } from '@/lib/ai/focus-group';
import { generateAllPanelReactions } from '@/lib/ai/focus-group-panel';
import { generateExperimentResultsReport } from '@/lib/ai/experiment-results';
import { createExperimentSession, patchExperimentSession } from '@/lib/pipeline/store';
import { computeExperimentLiveMetrics } from '@/lib/experiment/metrics';

function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function splitAb(personas: Persona[]): {
  personasA: Persona[];
  personasB: Persona[];
  personaIdsA: string[];
  personaIdsB: string[];
} {
  if (personas.length < 2) {
    return {
      personasA: personas,
      personasB: [],
      personaIdsA: personas.map((p) => p.id),
      personaIdsB: [],
    };
  }
  const mid = Math.ceil(personas.length / 2);
  const personasA = personas.slice(0, mid);
  const personasB = personas.slice(mid);
  return {
    personasA,
    personasB,
    personaIdsA: personasA.map((p) => p.id),
    personaIdsB: personasB.map((p) => p.id),
  };
}

function moderatorBlock(step: ExperimentOrchestrationStep, adjacent?: string): string {
  const q = step.probeQuestion?.trim();
  const base = step.moderatorPrompt.trim();
  const parts = [
    base,
    q ? `Moderator question (answer this directly): ${q}` : '',
    adjacent?.trim()
      ? `Adjacent profile lens (factor in where natural): ${adjacent.trim()}`
      : '',
  ].filter(Boolean);
  return parts.join('\n\n');
}

export async function POST(req: NextRequest) {
  const tierCheck = await requireTier('PRO');
  if (!tierCheck.ok) return tierCheck.response;

  let body: ExperimentRunRequest;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const {
    jobId,
    companyName,
    goal,
    successMetric,
    design,
    experimentType,
    stimulus,
    stimulusVariantB,
    media,
    mediaVariantB,
    adjacentProfileNote,
  } = body;
  let { personas } = body;

  if (!jobId || !design?.steps?.length || !personas?.length) {
    return new Response('Missing jobId, design.steps, or personas', { status: 400 });
  }

  if (!stimulus?.trim() && !media && !stimulusVariantB?.trim() && !mediaVariantB) {
    return new Response('Provide stimulus text and/or media', { status: 400 });
  }

  if (experimentType === 'ab_test') {
    if (!stimulusVariantB?.trim() && !mediaVariantB) {
      return new Response('A/B tests require variant B (add text and/or media for arm B)', {
        status: 400,
      });
    }
  }

  personas = assignMarketWeights(personas) as Persona[];

  const { personasA, personasB, personaIdsA, personaIdsB } = splitAb(personas);
  const isAb =
    experimentType === 'ab_test' &&
    personasB.length > 0 &&
    (!!stimulusVariantB?.trim() || !!mediaVariantB);

  const sessionId = randomUUID();
  const transcript: ExperimentTranscriptEntry[] = [];

  const now = new Date().toISOString();
  createExperimentSession({
    id: sessionId,
    jobId,
    companyName,
    goal,
    experimentType,
    successMetric,
    personas,
    personaIdsVariantA: personaIdsA,
    personaIdsVariantB: isAb ? personaIdsB : [],
    design,
    transcript,
    liveMetrics: computeExperimentLiveMetrics(
      transcript,
      personas,
      personaIdsA,
      isAb ? personaIdsB : [],
      design.recallTargets ?? [],
    ),
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (data: object) => controller.enqueue(enc.encode(sseEvent(data)));

      const historyShared: PanelReaction[][] = [];
      const historyA: PanelReaction[][] = [];
      const historyB: PanelReaction[][] = [];

      let stepIndexCounter = 0;

      async function runPanelRound(params: {
        variant?: 'A' | 'B';
        subset: Persona[];
        stim: string | undefined;
        med: MediaAttachment | undefined;
        history: PanelReaction[][];
        stepMeta: ExperimentOrchestrationStep;
        parallelLabel: string;
      }): Promise<void> {
        const { variant, subset, stim, med, history, stepMeta, parallelLabel } = params;
        if (!subset.length) return;

        const roundReactions: PanelReaction[] = [];
        const mod = moderatorBlock(stepMeta, adjacentProfileNote);
        const idx = stepIndexCounter;

        await generateAllPanelReactions(
          subset,
          stim,
          med,
          (result) => {
            if (!result.reaction) return;
            roundReactions.push(result.reaction);
            const r = result.reaction;
            const entry: ExperimentTranscriptEntry = {
              id: randomUUID(),
              stepIndex: idx,
              stepLabel: parallelLabel || stepMeta.label,
              variant,
              personaId: r.personaId,
              personaName: r.personaName,
              content: r.content,
              sentiment: r.sentiment,
              timestamp: r.timestamp,
            };
            transcript.push(entry);

            const live = computeExperimentLiveMetrics(
              transcript,
              personas,
              personaIdsA,
              isAb ? personaIdsB : [],
              design.recallTargets ?? [],
            );
            patchExperimentSession(sessionId, { transcript: [...transcript], liveMetrics: live });

            send({
              type: 'persona_reaction_complete',
              reaction: r,
              variant: variant ?? null,
              stepIndex: idx,
              stepLabel: parallelLabel || stepMeta.label,
            });
            send({ type: 'metrics_update', metrics: live });
          },
          history,
          undefined,
          (personaId) => {
            const p = subset.find((x) => x.id === personaId);
            send({
              type: 'persona_reaction_start',
              personaId,
              personaName: p?.name ?? 'Unknown',
              variant: variant ?? null,
            });
          },
          (personaId, delta) => {
            send({ type: 'persona_reaction_chunk', personaId, delta, variant: variant ?? null });
          },
          { experimentModeratorAppend: mod },
        );

        history.push(roundReactions);
      }

      try {
        send({ type: 'session_started', sessionId, isAb });

        const steps = design.steps;

        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          send({
            type: 'step_started',
            stepIndex: stepIndexCounter,
            label: step.label,
            stepType: step.type,
            variant: step.variant ?? null,
          });

          if (step.type === 'transition') {
            send({
              type: 'system_message',
              content: `[Experiment] ${step.label}`,
            });
            stepIndexCounter++;
            send({ type: 'step_complete', stepIndex: stepIndexCounter - 1 });
            continue;
          }

          const stimA = stimulus?.trim() || undefined;
          const stimB = stimulusVariantB?.trim() || undefined;
          const medA = media as MediaAttachment | undefined;
          const medB = (mediaVariantB as MediaAttachment | undefined) ?? medA;

          if (
            isAb &&
            step.type === 'stimulus' &&
            step.variant === 'A' &&
            steps[i + 1]?.type === 'stimulus' &&
            steps[i + 1]?.variant === 'B'
          ) {
            const stepB = steps[i + 1];
            await Promise.all([
              runPanelRound({
                variant: 'A',
                subset: personasA,
                stim: stimA,
                med: medA,
                history: historyA,
                stepMeta: step,
                parallelLabel: `${step.label} · parallel`,
              }),
              runPanelRound({
                variant: 'B',
                subset: personasB,
                stim: stimB,
                med: medB,
                history: historyB,
                stepMeta: stepB,
                parallelLabel: `${stepB.label} · parallel`,
              }),
            ]);
            stepIndexCounter++;
            i++;
            send({ type: 'step_complete', stepIndex: stepIndexCounter - 1 });
            continue;
          }

          if (step.type === 'stimulus') {
            if (step.variant === 'A' && isAb) {
              await runPanelRound({
                variant: 'A',
                subset: personasA,
                stim: stimA,
                med: medA,
                history: historyA,
                stepMeta: step,
                parallelLabel: step.label,
              });
            } else if (step.variant === 'B' && isAb) {
              await runPanelRound({
                variant: 'B',
                subset: personasB,
                stim: stimB,
                med: medB,
                history: historyB,
                stepMeta: step,
                parallelLabel: step.label,
              });
            } else {
              await runPanelRound({
                variant: undefined,
                subset: personas,
                stim: stimA,
                med: medA,
                history: historyShared,
                stepMeta: step,
                parallelLabel: step.label,
              });
            }
          } else if (step.type === 'probe' || step.type === 'recall_check') {
            const q = step.probeQuestion?.trim() || 'Share your reaction in one or two sentences.';
            if (isAb) {
              await Promise.all([
                runPanelRound({
                  variant: 'A',
                  subset: personasA,
                  stim: q,
                  med: undefined,
                  history: historyA,
                  stepMeta: step,
                  parallelLabel: step.label,
                }),
                runPanelRound({
                  variant: 'B',
                  subset: personasB,
                  stim: q,
                  med: undefined,
                  history: historyB,
                  stepMeta: step,
                  parallelLabel: step.label,
                }),
              ]);
            } else {
              await runPanelRound({
                variant: undefined,
                subset: personas,
                stim: q,
                med: undefined,
                history: historyShared,
                stepMeta: step,
                parallelLabel: step.label,
              });
            }
          }

          stepIndexCounter++;
          send({ type: 'step_complete', stepIndex: stepIndexCounter - 1 });
        }

        send({ type: 'generating_results' });

        const results = await generateExperimentResultsReport({
          design,
          transcript,
          personas,
          personaIdsA,
          personaIdsB: isAb ? personaIdsB : [],
          experimentType,
        });

        patchExperimentSession(sessionId, {
          results,
          status: 'complete',
          transcript: [...transcript],
        });

        send({ type: 'complete', sessionId, results });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[experiment/run]', msg);
        send({ type: 'error', error: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
