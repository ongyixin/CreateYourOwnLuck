/**
 * POST /api/focus-group/panel/followup
 *
 * Generates a single persona's follow-up reaction after the initial round.
 * Called when the user taps a "[Name]'s follow-up" chip in Panel mode.
 *
 * Returns a single PanelReaction JSON object.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireTier } from '@/lib/auth/require-tier';
import type { PanelFollowUpRequest, FocusGroupMessage } from '@/lib/types';
import { getFocusGroupSession, addFocusGroupMessage } from '@/lib/pipeline/store';
import { generatePersonaFollowUp } from '@/lib/ai/focus-group-panel';

export async function POST(req: NextRequest) {
  const tierCheck = await requireTier('PRO');
  if (!tierCheck.ok) return tierCheck.response;

  let body: PanelFollowUpRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sessionId, personaId, personas, stimulus, media, allReactions, hint } = body;

  if (!personaId || !personas?.length || !hint) {
    return NextResponse.json(
      { error: 'Missing required fields: personaId, personas, hint' },
      { status: 400 },
    );
  }

  const persona = personas.find((p) => p.id === personaId);
  if (!persona) {
    return NextResponse.json({ error: `Persona "${personaId}" not found in personas list` }, { status: 400 });
  }

  try {
    const reaction = await generatePersonaFollowUp(
      persona,
      personas,
      stimulus,
      media,
      allReactions ?? [],
      hint,
    );

    // Persist to session for analytics if we have a session
    if (sessionId) {
      const session = getFocusGroupSession(sessionId);
      if (session) {
        const msg: FocusGroupMessage = {
          id: randomUUID(),
          role: 'persona',
          personaId: reaction.personaId,
          personaName: reaction.personaName,
          content: `[follow-up] ${reaction.content}`,
          timestamp: reaction.timestamp,
        };
        addFocusGroupMessage(sessionId, msg);
      }
    }

    return NextResponse.json(reaction);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[focus-group/panel/followup] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
