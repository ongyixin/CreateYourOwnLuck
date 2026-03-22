import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTier } from "@/lib/auth/require-tier";
import { getAdapter } from "@/lib/social/adapters";
import type { SocialPlatform, PublishableContent } from "@/lib/types";

interface PublishBody {
  connectionId: string;
  assetId: string;
  content: string;
}

export async function POST(req: NextRequest) {
  const check = await requireTier("PRO");
  if (!check.ok) return check.response;

  let body: PublishBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { connectionId, assetId, content } = body;

  if (!connectionId || !assetId || !content) {
    return NextResponse.json(
      { error: "connectionId, assetId, and content are required" },
      { status: 400 }
    );
  }

  // Verify the connection belongs to this user
  const connection = await prisma.socialConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  if (connection.userId !== check.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify the asset exists
  const asset = await prisma.gtmAsset.findUnique({ where: { id: assetId } });
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Create a pending publish log
  const log = await prisma.publishLog.create({
    data: {
      userId: check.userId,
      assetId,
      connectionId,
      platform: connection.platform,
      contentSnapshot: content,
      status: "pending",
    },
  });

  const publishable: PublishableContent = { text: content };
  const adapter = getAdapter(connection.platform as SocialPlatform);

  let result;
  try {
    result = await adapter.publish(connection, publishable);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    await prisma.publishLog.update({
      where: { id: log.id },
      data: { status: "failed", errorMessage },
    });
    return NextResponse.json({ error: errorMessage }, { status: 502 });
  }

  if (!result.success) {
    await prisma.publishLog.update({
      where: { id: log.id },
      data: { status: "failed", errorMessage: result.errorMessage },
    });
    return NextResponse.json({ error: result.errorMessage }, { status: 502 });
  }

  await prisma.publishLog.update({
    where: { id: log.id },
    data: {
      status: "published",
      externalUrl: result.externalUrl ?? null,
    },
  });

  return NextResponse.json({
    success: true,
    externalUrl: result.externalUrl,
    logId: log.id,
  });
}
