// ============================================================
// FitCheck — GTM Brand Copilot Orchestrator
// Owned by: GTM agent
//
// Exports:
//   generateGtmPlan(analysisId, userId, report)
//     → runs Strategist agent, persists GtmPlan, calls onProgress events
//   executeGtmPlan(planId, report, effectivePlan)
//     → runs 4 execution agents in parallel, persists GtmAssets, calls onAsset/onDone
// ============================================================

import { prisma } from '../prisma';
import type {
  FitCheckReport,
  GtmStrategy,
  GtmAssetRecord,
  GtmAgentType,
} from '../types';
import {
  runStrategistAgent,
  runMessagingAgent,
  runCreativeAgent,
  runOutreachAgent,
  runGrowthAgent,
} from './gtm-agents';

// ============================================================
// Plan generation
// ============================================================

export interface PlanProgressEvent {
  type: 'plan_thinking' | 'plan_complete' | 'error';
  content?: string;
  plan?: GtmStrategy;
  planId?: string;
}

export async function generateGtmPlan(
  analysisId: string,
  userId: string,
  report: FitCheckReport,
  onProgress?: (event: PlanProgressEvent) => void,
): Promise<string> {
  // Create the plan row in "generating" state
  const plan = await prisma.gtmPlan.create({
    data: {
      analysisId,
      userId,
      status: 'generating',
    },
  });

  onProgress?.({ type: 'plan_thinking', content: 'Strategist agent is analyzing your brand report...' });

  try {
    const strategy = await runStrategistAgent(report);

    await prisma.gtmPlan.update({
      where: { id: plan.id },
      data: {
        status: 'ready',
        planJson: strategy as unknown as Parameters<typeof prisma.gtmPlan.update>[0]['data']['planJson'],
      },
    });

    onProgress?.({ type: 'plan_complete', plan: strategy, planId: plan.id });
    return plan.id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.gtmPlan.update({
      where: { id: plan.id },
      data: { status: 'failed' },
    });
    onProgress?.({ type: 'error', content: msg });
    throw err;
  }
}

// ============================================================
// Plan execution
// ============================================================

export interface ExecutionProgressEvent {
  type: 'agent_start' | 'asset_complete' | 'execution_complete' | 'error';
  agent?: GtmAgentType;
  asset?: GtmAssetRecord;
  error?: string;
}

export async function executeGtmPlan(
  planId: string,
  report: FitCheckReport,
  strategy: GtmStrategy,
  onProgress?: (event: ExecutionProgressEvent) => void,
): Promise<void> {
  await prisma.gtmPlan.update({
    where: { id: planId },
    data: { status: 'executing' },
  });

  const tasks: Promise<void>[] = [];

  // Messaging workstreams
  for (const ws of strategy.messagingWorkstreams) {
    tasks.push(
      runAgentTask({
        planId,
        agent: 'messaging',
        assetType: 'messaging_guide',
        title: ws.title,
        run: () => runMessagingAgent(ws, report),
        onProgress,
      }),
    );
  }

  // Creative workstreams
  for (const ws of strategy.creativeWorkstreams) {
    tasks.push(
      runAgentTask({
        planId,
        agent: 'creative',
        assetType: ws.assetType,
        title: ws.title,
        run: () => runCreativeAgent(ws, report),
        onProgress,
      }),
    );
  }

  // Outreach workstreams
  for (const ws of strategy.outreachWorkstreams) {
    tasks.push(
      runAgentTask({
        planId,
        agent: 'outreach',
        assetType: `${ws.targetType}_outreach`,
        title: ws.title,
        run: () => runOutreachAgent(ws, report),
        onProgress,
      }),
    );
  }

  // Growth workstreams
  for (const ws of strategy.growthWorkstreams) {
    tasks.push(
      runAgentTask({
        planId,
        agent: 'growth',
        assetType: ws.experimentType,
        title: ws.title,
        run: () => runGrowthAgent(ws, report),
        onProgress,
      }),
    );
  }

  await Promise.allSettled(tasks);

  await prisma.gtmPlan.update({
    where: { id: planId },
    data: { status: 'complete' },
  });

  onProgress?.({ type: 'execution_complete' });
}

// ============================================================
// Internal: run a single agent task and persist the asset
// ============================================================

async function runAgentTask({
  planId,
  agent,
  assetType,
  title,
  run,
  onProgress,
}: {
  planId: string;
  agent: GtmAgentType;
  assetType: string;
  title: string;
  run: () => Promise<unknown>;
  onProgress?: (event: ExecutionProgressEvent) => void;
}): Promise<void> {
  onProgress?.({ type: 'agent_start', agent });

  // Create asset row in "generating" state
  const asset = await prisma.gtmAsset.create({
    data: {
      planId,
      agent,
      assetType,
      title,
      content: {},
      status: 'generating',
    },
  });

  try {
    const content = await run();

    const updated = await prisma.gtmAsset.update({
      where: { id: asset.id },
      data: {
        content: content as Parameters<typeof prisma.gtmAsset.update>[0]['data']['content'],
        status: 'complete',
      },
    });

    const assetRecord: GtmAssetRecord = {
      id: updated.id,
      planId: updated.planId,
      agent: updated.agent as GtmAgentType,
      assetType: updated.assetType,
      title: updated.title,
      content: updated.content as unknown as GtmAssetRecord['content'],
      status: 'complete',
      createdAt: updated.createdAt.toISOString(),
    };

    onProgress?.({ type: 'asset_complete', agent, asset: assetRecord });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.gtmAsset.update({
      where: { id: asset.id },
      data: { status: 'failed' },
    });
    onProgress?.({ type: 'error', agent, error: `${agent} agent failed for "${title}": ${msg}` });
  }
}
