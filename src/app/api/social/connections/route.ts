import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SocialConnectionRecord } from "@/lib/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connections = await prisma.socialConnection.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      platform: true,
      platformAccountId: true,
      platformUsername: true,
      expiresAt: true,
      scopes: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const records: SocialConnectionRecord[] = connections.map((c) => ({
    id: c.id,
    platform: c.platform as SocialConnectionRecord["platform"],
    platformAccountId: c.platformAccountId,
    platformUsername: c.platformUsername,
    expiresAt: c.expiresAt?.toISOString() ?? null,
    scopes: c.scopes,
    metadata: c.metadata as Record<string, unknown> | null,
    createdAt: c.createdAt.toISOString(),
  }));

  return NextResponse.json({ connections: records });
}
