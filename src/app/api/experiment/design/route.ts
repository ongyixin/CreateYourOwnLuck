/**
 * POST /api/experiment/design
 *
 * Body: ExperimentDesignRequest
 * Returns: ExperimentDesignDocument
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTier } from '@/lib/auth/require-tier';
import type { ExperimentDesignRequest } from '@/lib/types';
import { generateExperimentDesignDocument } from '@/lib/ai/experiment-design';

export async function POST(req: NextRequest) {
  const tierCheck = await requireTier('PRO');
  if (!tierCheck.ok) return tierCheck.response;

  let body: ExperimentDesignRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.goal || !body.experimentType || !body.successMetric) {
    return NextResponse.json(
      { error: 'Missing goal, experimentType, or successMetric' },
      { status: 400 },
    );
  }

  if (!body.stimulusSummary?.trim()) {
    return NextResponse.json({ error: 'stimulusSummary is required' }, { status: 400 });
  }

  try {
    const doc = await generateExperimentDesignDocument(body);
    return NextResponse.json(doc);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[experiment/design]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
