/**
 * GET /api/gtm/assets/[planId]
 *
 * Returns all GtmAssets for the given plan.
 * Auth required; ownership enforced.
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/prisma';
import type { GtmAgentType, GtmAssetRecord } from '@/lib/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: { planId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { planId } = params;

  const plan = await prisma.gtmPlan.findUnique({
    where: { id: planId },
    select: {
      userId: true,
      assets: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!plan || plan.userId !== session.user.id) {
    return Response.json({ error: 'Plan not found' }, { status: 404 });
  }

  const assets: GtmAssetRecord[] = plan.assets.map((a) => ({
    id: a.id,
    planId: a.planId,
    agent: a.agent as GtmAgentType,
    assetType: a.assetType,
    title: a.title,
    content: a.content as unknown as GtmAssetRecord['content'],
    status: a.status as GtmAssetRecord['status'],
    createdAt: a.createdAt.toISOString(),
  }));

  return Response.json({ assets });
}
