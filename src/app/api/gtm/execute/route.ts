/**
 * POST /api/gtm/execute
 *
 * PRO required. Takes an approved GtmPlan and runs the 4 execution agents
 * in parallel, streaming progress via SSE.
 *
 * Body: { planId: string }
 *
 * SSE event shapes:
 *   { type: 'agent_start', agent: GtmAgentType }
 *   { type: 'asset_complete', agent: GtmAgentType, asset: GtmAssetRecord }
 *   { type: 'execution_complete' }
 *   { type: 'error', error: string }
 */

import { NextRequest } from 'next/server';
import { requireTier } from '@/lib/auth/require-tier';
import { prisma } from '@/lib/prisma';
import type { FitCheckReport, GtmAgentType, GtmAssetRecord, GtmStrategy } from '@/lib/types';
import { executeGtmPlan } from '@/lib/ai/gtm-orchestrator';

function sseEvent(data: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  const tierCheck = await requireTier('PRO');
  if (!tierCheck.ok) return tierCheck.response;

  const { userId } = tierCheck;

  let body: { planId: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { planId } = body;
  if (!planId) {
    return new Response('Missing required field: planId', { status: 400 });
  }

  // Fetch plan + its associated analysis (for the report JSON)
  const plan = await prisma.gtmPlan.findUnique({
    where: { id: planId },
    include: {
      analysis: {
        select: { reportJson: true },
      },
    },
  });

  if (!plan || plan.userId !== userId) {
    return Response.json({ error: 'Plan not found' }, { status: 404 });
  }

  if (!plan.analysis?.reportJson) {
    return Response.json({ error: 'Analysis report not found' }, { status: 409 });
  }

  // Resolve which strategy to use: user's edited version takes priority
  const strategy = (plan.editedJson ?? plan.planJson) as unknown as GtmStrategy | null;
  if (!strategy) {
    return Response.json({ error: 'Plan strategy not yet generated' }, { status: 409 });
  }

  if (!['ready', 'approved', 'complete', 'failed'].includes(plan.status)) {
    return Response.json(
      { error: `Plan is not ready for execution (status: ${plan.status})` },
      { status: 409 },
    );
  }

  const report = plan.analysis.reportJson as unknown as FitCheckReport;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await executeGtmPlan(planId, report, strategy, (event) => {
          if (event.type === 'agent_start') {
            controller.enqueue(sseEvent({ type: 'agent_start', agent: event.agent }));
          } else if (event.type === 'asset_complete') {
            controller.enqueue(
              sseEvent({
                type: 'asset_complete',
                agent: event.agent,
                asset: event.asset,
              }),
            );
          } else if (event.type === 'execution_complete') {
            controller.enqueue(sseEvent({ type: 'execution_complete' }));
          } else if (event.type === 'error') {
            controller.enqueue(sseEvent({ type: 'error', error: event.error }));
          }
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(sseEvent({ type: 'error', error: msg }));
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
