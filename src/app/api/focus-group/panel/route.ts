/**
 * POST /api/focus-group/panel
 *
 * Panel mode endpoint: accepts optional visual media + text stimulus,
 * runs personas SEQUENTIALLY (each hears the previous ones), and streams
 * results token-by-token via SSE.
 *
 * SSE event types:
 *   { type: 'session_id', sessionId: string }
 *   { type: 'persona_reaction_start', personaId: string, personaName: string }
 *   { type: 'persona_reaction_chunk', personaId: string, delta: string }
 *   { type: 'persona_reaction_complete', reaction: PanelReaction }
 *   { type: 'round_complete', sessionId: string }
 *   { type: 'error', error: string }
 */

import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { requireTier } from '@/lib/auth/require-tier';
import type { FocusGroupMessage, MediaAttachment, PanelRoundRequest, Persona } from '@/lib/types';
import {
  createFocusGroupSession,
  getFocusGroupSession,
  addFocusGroupMessage,
} from '@/lib/pipeline/store';
import { assignMarketWeights } from '@/lib/ai/focus-group';
import { generateAllPanelReactions } from '@/lib/ai/focus-group-panel';

function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const tierCheck = await requireTier('PRO');
  if (!tierCheck.ok) return tierCheck.response;

  let body: PanelRoundRequest;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { jobId, stimulus, media, conversationHistory, targetedPersonaId } = body;
  let { sessionId, personas } = body;

  if (!jobId || !personas?.length) {
    return new Response('Missing required fields: jobId, personas', { status: 400 });
  }

  if (!stimulus?.trim() && !media) {
    return new Response('Provide at least a stimulus or media attachment', { status: 400 });
  }

  personas = assignMarketWeights(personas) as Persona[];

  // Resolve or create session
  let session = sessionId ? getFocusGroupSession(sessionId) : undefined;
  if (!session) {
    sessionId = randomUUID();
    session = createFocusGroupSession(sessionId, jobId, personas);
  }

  const resolvedSessionId = session.id;

  // Persist user message for analytics (only on the first round — subsequent
  // autoplay rounds are continuations of the same stimulus)
  if (!conversationHistory?.length) {
    if (stimulus?.trim()) {
      addFocusGroupMessage(resolvedSessionId, {
        id: randomUUID(),
        role: 'user',
        content: stimulus.trim(),
        timestamp: new Date().toISOString(),
        mediaType: media?.type,
      });
    } else if (media) {
      addFocusGroupMessage(resolvedSessionId, {
        id: randomUUID(),
        role: 'user',
        content: `[Shared ${media.type}: ${media.name}]`,
        timestamp: new Date().toISOString(),
        mediaType: media.type,
      });
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (data: object) => controller.enqueue(enc.encode(sseEvent(data)));

      try {
        send({ type: 'session_id', sessionId: resolvedSessionId });

        // Run personas sequentially; emit start/chunk/complete per turn so the
        // client can render tokens as they arrive and show a typing indicator.
        await generateAllPanelReactions(
          personas,
          stimulus,
          media as MediaAttachment | undefined,
          ({ reaction, error, personaId }) => {
            const persona = personas.find((p) => p.id === personaId);

            if (error || !reaction) {
              send({
                type: 'persona_reaction_complete',
                reaction: {
                  personaId,
                  personaName: persona?.name ?? 'Unknown',
                  content: "I couldn't form a reaction right now.",
                  sentiment: 'neutral',
                  timestamp: new Date().toISOString(),
                },
              });
              return;
            }

            // Persist for analytics
            const personaMsg: FocusGroupMessage = {
              id: randomUUID(),
              role: 'persona',
              personaId: reaction.personaId,
              personaName: reaction.personaName,
              content: reaction.content,
              timestamp: reaction.timestamp,
            };
            addFocusGroupMessage(resolvedSessionId, personaMsg);

            send({ type: 'persona_reaction_complete', reaction });
          },
          conversationHistory,
          targetedPersonaId,
          // onReactionStart — fires before generation so client shows typing indicator
          (personaId) => {
            const persona = personas.find((p) => p.id === personaId);
            send({
              type: 'persona_reaction_start',
              personaId,
              personaName: persona?.name ?? 'Unknown',
            });
          },
          // onChunk — fires for each token delta so client renders text progressively
          (personaId, delta) => {
            send({ type: 'persona_reaction_chunk', personaId, delta });
          },
        );

        send({ type: 'round_complete', sessionId: resolvedSessionId });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[focus-group/panel] Error:', msg);
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
