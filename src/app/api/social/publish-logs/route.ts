import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { PublishLogRecord } from "@/lib/types";

/**
 * GET /api/social/publish-logs?assetId=xxx
 * Returns all publish logs for a given asset (owned by the current user).
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assetId = req.nextUrl.searchParams.get("assetId");
  if (!assetId) {
    return NextResponse.json({ error: "assetId query param required" }, { status: 400 });
  }

  const logs = await prisma.publishLog.findMany({
    where: { assetId, userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const records: PublishLogRecord[] = logs.map((l) => ({
    id: l.id,
    assetId: l.assetId,
    connectionId: l.connectionId,
    platform: l.platform as PublishLogRecord["platform"],
    contentSnapshot: l.contentSnapshot,
    externalUrl: l.externalUrl,
    status: l.status as PublishLogRecord["status"],
    errorMessage: l.errorMessage,
    createdAt: l.createdAt.toISOString(),
  }));

  return NextResponse.json({ logs: records });
}
