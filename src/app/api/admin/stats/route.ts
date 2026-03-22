import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [userCount, analysisCount, tierCounts] = await Promise.all([
    prisma.user.count(),
    prisma.analysis.count(),
    prisma.user.groupBy({ by: ["tier"], _count: { tier: true } }),
  ]);

  const tiers = Object.fromEntries(tierCounts.map((t) => [t.tier, t._count.tier]));

  return NextResponse.json({
    userCount,
    analysisCount,
    tiers,
  });
}
