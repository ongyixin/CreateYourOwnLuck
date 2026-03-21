/**
 * POST /api/focus-group/analyze
 *
 * Synthesizes a completed focus group session into structured analytics.
 * Fetches the session from the store, runs the AI synthesis, persists
 * the result, and returns the FocusGroupAnalytics object.
 *
 * Body: { sessionId: string }
 * Response: FocusGroupAnalytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFocusGroupSession, setSessionAnalytics } from '@/lib/pipeline/store';
import { generateFocusGroupAnalytics } from '@/lib/ai/focus-group-analyze';

export async function POST(req: NextRequest) {
  let body: { sessionId: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sessionId } = body;

  if (!sessionId?.trim()) {
    return NextResponse.json({ error: 'Missing required field: sessionId' }, { status: 400 });
  }

  const session = getFocusGroupSession(sessionId);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const personaMessages = session.messages.filter((m) => m.role === 'persona');
  if (personaMessages.length === 0) {
    return NextResponse.json(
      { error: 'Session has no persona messages to analyze' },
      { status: 422 }
    );
  }

  try {
    const analytics = await generateFocusGroupAnalytics(session);
    setSessionAnalytics(sessionId, analytics);
    return NextResponse.json(analytics);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[focus-group/analyze] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
