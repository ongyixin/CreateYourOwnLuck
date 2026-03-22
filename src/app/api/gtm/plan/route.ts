/**
 * /api/gtm/plan
 *
 * POST  { analysisId }
 *   PRO required. Creates a GtmPlan, runs the Strategist agent, and streams
 *   progress via SSE until the plan is ready for review.
 *
 *   SSE event shapes:
 *     { type: 'plan_thinking', content: string }
 *     { type: 'plan_complete', plan: GtmStrategy, planId: string }
 *     { type: 'error', error: string }
 *
 * GET   ?analysisId=<id>
 *   Returns the most recent GtmPlan for the given analysis (with assets).
 *
 * PATCH { planId, editedJson }
 *   Saves the user's edited GtmStrategy to editedJson and marks plan as approved.
 */

import { NextRequest } from 'next/server';
import { requireTier } from '@/lib/auth/require-tier';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import type { FitCheckReport, GtmAgentType, GtmAssetRecord, GtmPlanRecord, GtmStrategy } from '@/lib/types';
import { generateGtmPlan } from '@/lib/ai/gtm-orchestrator';

function sseEvent(data: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

// ── POST — generate plan with SSE streaming ──────────────────────────────────

export async function POST(req: NextRequest) {
  const tierCheck = await requireTier('PRO');
  if (!tierCheck.ok) return tierCheck.response;

  const { userId } = tierCheck;

  let body: { jobId: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { jobId } = body;
  if (!jobId) {
    return new Response('Missing required field: jobId', { status: 400 });
  }

  // Verify the analysis belongs to this user
  const analysis = await prisma.analysis.findUnique({
    where: { jobId },
    select: { id: true, userId: true, status: true, reportJson: true },
  });

  if (!analysis) {
    return new Response(JSON.stringify({ error: 'Analysis not found' }), { status: 404 });
  }

  if (analysis.userId !== userId) {
    return new Response(JSON.stringify({ error: 'Analysis not found' }), { status: 404 });
  }

  if (analysis.status !== 'complete' || !analysis.reportJson) {
    return new Response(
      JSON.stringify({ error: 'Analysis is not complete yet' }),
      { status: 409 },
    );
  }

  const report = analysis.reportJson as unknown as FitCheckReport;
  const analysisId = analysis.id;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await generateGtmPlan(analysisId, userId, report, (event) => {
          if (event.type === 'plan_thinking') {
            controller.enqueue(sseEvent({ type: 'plan_thinking', content: event.content }));
          } else if (event.type === 'plan_complete') {
            controller.enqueue(
              sseEvent({ type: 'plan_complete', plan: event.plan, planId: event.planId }),
            );
          } else if (event.type === 'error') {
            controller.enqueue(sseEvent({ type: 'error', error: event.content }));
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

// ── GET — fetch existing plan ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return Response.json({ error: 'Missing jobId query param' }, { status: 400 });
  }

  // Resolve DB analysis id from jobId
  const analysis = await prisma.analysis.findUnique({
    where: { jobId },
    select: { id: true, userId: true },
  });

  if (!analysis || analysis.userId !== session.user.id) {
    return Response.json({ plan: null });
  }

  const plan = await prisma.gtmPlan.findFirst({
    where: {
      analysisId: analysis.id,
      userId: session.user.id,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      assets: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!plan) {
    return Response.json({ plan: null });
  }

  const record: GtmPlanRecord = {
    id: plan.id,
    analysisId: plan.analysisId,
    userId: plan.userId,
    status: plan.status as GtmPlanRecord['status'],
    planJson: plan.planJson as GtmStrategy | null,
    editedJson: plan.editedJson as GtmStrategy | null,
    assets: plan.assets.map((a) => ({
      id: a.id,
      planId: a.planId,
      agent: a.agent as GtmAgentType,
      assetType: a.assetType,
      title: a.title,
      content: a.content as unknown as GtmAssetRecord['content'],
      status: a.status as GtmAssetRecord['status'],
      createdAt: a.createdAt.toISOString(),
    })),
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };

  return Response.json({ plan: record });
}

// ── PATCH — save user edits and approve plan ──────────────────────────────────

export async function PATCH(req: NextRequest) {
  const tierCheck = await requireTier('PRO');
  if (!tierCheck.ok) return tierCheck.response;

  const { userId } = tierCheck;

  let body: { planId: string; editedJson: GtmStrategy };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { planId, editedJson } = body;
  if (!planId || !editedJson) {
    return new Response('Missing required fields: planId, editedJson', { status: 400 });
  }

  const existing = await prisma.gtmPlan.findUnique({
    where: { id: planId },
    select: { userId: true, status: true },
  });

  if (!existing || existing.userId !== userId) {
    return Response.json({ error: 'Plan not found' }, { status: 404 });
  }

  const updated = await prisma.gtmPlan.update({
    where: { id: planId },
    data: {
      editedJson: editedJson as unknown as Parameters<typeof prisma.gtmPlan.update>[0]['data']['editedJson'],
      status: 'approved',
    },
  });

  return Response.json({ planId: updated.id, status: updated.status });
}
