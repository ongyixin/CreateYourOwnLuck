/**
 * Server-side tier enforcement utility.
 * Use in API routes to gate access to PRO/AGENCY features.
 */

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { canAccessTier, type UserTier } from "@/lib/tier";

type TierCheckSuccess = {
  ok: true;
  userId: string;
  tier: UserTier;
};

type TierCheckFailure = {
  ok: false;
  response: NextResponse;
};

export type TierCheckResult = TierCheckSuccess | TierCheckFailure;

/**
 * Verify the current user has access to a tier-gated feature.
 *
 * Usage:
 *   const check = await requireTier("PRO");
 *   if (!check.ok) return check.response;
 *   // check.userId and check.tier are now available
 */
export async function requireTier(requiredTier: "PRO" | "AGENCY"): Promise<TierCheckResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tier: true, role: true },
  });

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "User not found" }, { status: 401 }),
    };
  }

  // Admins bypass all tier checks
  if (user.role === "ADMIN") {
    return { ok: true, userId: session.user.id, tier: user.tier as UserTier };
  }

  if (!canAccessTier(user.tier as UserTier, requiredTier)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `This feature requires ${requiredTier === "PRO" ? "Series A" : "Series B"} or higher`,
          requiredTier,
          currentTier: user.tier,
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId: session.user.id, tier: user.tier as UserTier };
}
