/**
 * GET /api/reports
 *
 * Returns the authenticated user's past analyses.
 * FREE users see only their 1 most recent analysis.
 * PRO/AGENCY users see all analyses (paginated, newest first).
 *
 * Query params:
 *   page  - page number (1-based, default 1)
 *   limit - results per page (default 20, max 50)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { TIER_LIMITS, type UserTier } from "@/lib/tier";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tier: true, role: true },
  });

  const tier = (user?.tier ?? "FREE") as UserTier;
  const isAdmin = user?.role === "ADMIN";

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  // FREE users are limited to viewing their 1 most recent analysis
  const maxResults = (!isAdmin && TIER_LIMITS[tier].analyses !== Infinity)
    ? TIER_LIMITS[tier].analyses
    : undefined;

  const [analyses, total] = await Promise.all([
    prisma.analysis.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: maxResults ?? limit,
      skip: maxResults ? 0 : skip,
      select: {
        jobId: true,
        company: true,
        url: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.analysis.count({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({
    analyses,
    total: maxResults ? Math.min(total, maxResults) : total,
    page: maxResults ? 1 : page,
    limit: maxResults ?? limit,
    tier,
  });
}
