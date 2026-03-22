/**
 * POST /api/focus-group/panel
 *
 * Panel mode endpoint: accepts optional visual media + text stimulus,
 * runs all personas IN PARALLEL (unlike the sequential chat route),
 * and streams results as each persona finishes via SSE.
 *
 * SSE event types:
 *   { type: 'session_id', sessionId: string }
 *   { type: 'persona_reaction_start', personaId: string, personaName: string }
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

  const { jobId, stimulus, media } = body;
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

  // Store the user message (stimulus) in the session for analytics compatibility
  if (stimulus?.trim()) {
    const userMsg: FocusGroupMessage = {
      id: randomUUID(),
      role: 'user',
      content: stimulus.trim(),
      timestamp: new Date().toISOString(),
      mediaType: media?.type,
    };
    addFocusGroupMessage(resolvedSessionId, userMsg);
  } else if (media) {
    const userMsg: FocusGroupMessage = {
      id: randomUUID(),
      role: 'user',
      content: `[Shared ${media.type}: ${media.name}]`,
      timestamp: new Date().toISOString(),
      mediaType: media.type,
    };
    addFocusGroupMessage(resolvedSessionId, userMsg);
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (data: object) => controller.enqueue(enc.encode(sseEvent(data)));

      try {
        // Emit session ID immediately so the client can track it
        send({ type: 'session_id', sessionId: resolvedSessionId });

        // Emit persona_reaction_start for all personas right away (they run in parallel)
        for (const persona of personas) {
          send({ type: 'persona_reaction_start', personaId: persona.id, personaName: persona.name });
        }

        // Run all reactions in parallel; callback fires as each finishes
        await generateAllPanelReactions(
          personas,
          stimulus,
          media as MediaAttachment | undefined,
          ({ reaction, error, personaId }) => {
            if (error || !reaction) {
              // Send a graceful error for this specific persona
              send({
                type: 'persona_reaction_complete',
                reaction: {
                  personaId,
                  personaName: personas.find((p) => p.id === personaId)?.name ?? 'Unknown',
                  content: 'I couldn\'t form a reaction right now.',
                  sentiment: 'neutral',
                  timestamp: new Date().toISOString(),
                },
              });
              return;
            }

            // Persist as a focus group message so analytics pipeline can read it
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
          }
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
