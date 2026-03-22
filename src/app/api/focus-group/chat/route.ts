/**
 * POST /api/focus-group/chat
 *
 * Handles both phases of the focus group:
 *
 * Phase 1 (probe) — normal round:
 *   The founder sends a message/claim; all personas respond in turn, each
 *   reading prior responses within the round.
 *
 * Phase 2 (flip) initiation — `isFlipInitiation: true`:
 *   No founder message. Each persona asks their single most important
 *   question drawn from the full probe transcript.
 *
 * Phase 2 (flip) follow-up — normal round with phase "flip":
 *   The founder answers; personas react and can push back or follow up.
 *
 * SSE event types:
 *   { type: 'system_message', message: FocusGroupMessage }
 *   { type: 'user_message', message: FocusGroupMessage, sessionId }
 *   { type: 'persona_start', personaId, personaName }
 *   { type: 'persona_message', message: FocusGroupMessage }
 *   { type: 'round_complete', sessionId }
 *   { type: 'error', error: string }
 */

import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { requireTier } from '@/lib/auth/require-tier';
import type { FocusGroupMessage, FocusGroupPhase, Persona } from '@/lib/types';
import {
  createFocusGroupSession,
  getFocusGroupSession,
  addFocusGroupMessage,
  updateSessionPhase,
} from '@/lib/pipeline/store';
import {
  assignMarketWeights,
  countCompletedRounds,
  generatePersonaFlipQuestion,
  generatePersonaTurn,
  getSpeakingOrder,
} from '@/lib/ai/focus-group';

interface FocusGroupChatRequest {
  sessionId?: string;
  jobId: string;
  personas: Persona[];
  stimulus?: string;
  phase?: FocusGroupPhase;
  /** When true: transition to flip phase and generate one question per persona. */
  isFlipInitiation?: boolean;
  /**
   * When set, only this persona responds to the user's message.
   * All others are aware via conversation history but stay silent this round.
   */
  targetedPersonaId?: string;
}

function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const tierCheck = await requireTier("PRO");
  if (!tierCheck.ok) return tierCheck.response;

  let body: FocusGroupChatRequest;

  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { jobId, isFlipInitiation, phase, targetedPersonaId } = body;
  let { sessionId, personas, stimulus } = body;

  if (!jobId || !personas?.length) {
    return new Response('Missing required fields: jobId, personas', { status: 400 });
  }

  if (!isFlipInitiation && !stimulus?.trim()) {
    return new Response('Missing required field: stimulus', { status: 400 });
  }

  // Assign market weights if not yet set
  personas = assignMarketWeights(personas);

  // Resolve or create session
  let session = sessionId ? getFocusGroupSession(sessionId) : undefined;
  if (!session) {
    sessionId = randomUUID();
    session = createFocusGroupSession(sessionId, jobId, personas);
  }

  // Determine phase for this request
  const currentPhase: FocusGroupPhase = isFlipInitiation ? 'flip' : (phase ?? session.phase);

  // Persist phase transition
  if (currentPhase !== session.phase) {
    updateSessionPhase(session.id, currentPhase);
  }

  const roundIndex = countCompletedRounds(session);

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (data: object) => controller.enqueue(enc.encode(sseEvent(data)));

      try {
        if (isFlipInitiation) {
          // ── Flip initiation: inject a system banner, then each persona asks one question ──

          const sysMsg: FocusGroupMessage = {
            id: randomUUID(),
            role: 'system',
            content: '— PHASE 2: THE ROOM HAS QUESTIONS FOR YOU —',
            timestamp: new Date().toISOString(),
          };
          addFocusGroupMessage(session!.id, sysMsg);
          send({ type: 'system_message', message: sysMsg, sessionId: session!.id });

          // Personas ask questions in order (no rotation — each is distinct)
          for (const persona of session!.personas) {
            send({ type: 'persona_start', personaId: persona.id, personaName: persona.name });

            const latest = getFocusGroupSession(session!.id)!;

            const turn = await generatePersonaFlipQuestion(
              persona,
              latest.personas,
              latest.messages
            );

            const personaMsg: FocusGroupMessage = {
              id: randomUUID(),
              role: 'persona',
              personaId: turn.personaId,
              personaName: turn.personaName,
              content: turn.content,
              timestamp: new Date().toISOString(),
            };

            addFocusGroupMessage(session!.id, personaMsg);
            send({ type: 'persona_message', message: personaMsg });
          }
        } else {
          // ── Normal round: founder sends message, personas respond in turn ──

          const userMsg: FocusGroupMessage = {
            id: randomUUID(),
            role: 'user',
            content: stimulus!.trim(),
            timestamp: new Date().toISOString(),
          };
          addFocusGroupMessage(session!.id, userMsg);
          send({ type: 'user_message', message: userMsg, sessionId: session!.id });

          const sessionNow = getFocusGroupSession(session!.id)!;
          const speakingOrder = getSpeakingOrder(sessionNow.personas, roundIndex);

          // When a persona is targeted, only they respond; others are aware
          // of the exchange through the conversation history in future rounds.
          const effectiveOrder = targetedPersonaId
            ? speakingOrder.filter((p) => p.id === targetedPersonaId)
            : speakingOrder;

          for (const persona of effectiveOrder) {
            send({ type: 'persona_start', personaId: persona.id, personaName: persona.name });

            const latest = getFocusGroupSession(session!.id)!;

            const turn = await generatePersonaTurn(
              persona,
              latest.personas,
              latest.messages,
              currentPhase,
              !!targetedPersonaId,
            );

            const personaMsg: FocusGroupMessage = {
              id: randomUUID(),
              role: 'persona',
              personaId: turn.personaId,
              personaName: turn.personaName,
              content: turn.content,
              timestamp: new Date().toISOString(),
            };

            addFocusGroupMessage(session!.id, personaMsg);
            send({ type: 'persona_message', message: personaMsg });
          }
        }

        send({ type: 'round_complete', sessionId: session!.id });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[focus-group/chat] Error:', msg);
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
