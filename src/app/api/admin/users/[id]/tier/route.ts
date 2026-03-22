import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const tier = body.tier as "FREE" | "PRO" | "AGENCY" | undefined;
  const durationDays = body.durationDays as number | null | undefined;

  if (!tier || !["FREE", "PRO", "AGENCY"].includes(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  let tierExpiresAt: Date | null = null;
  if (tier !== "FREE" && durationDays !== null && durationDays !== undefined) {
    tierExpiresAt = new Date();
    tierExpiresAt.setDate(tierExpiresAt.getDate() + durationDays);
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: {
      tier,
      tierGrantedBy: tier === "FREE" ? null : session.user.email ?? session.user.id,
      tierExpiresAt,
    },
    select: { id: true, email: true, tier: true, tierExpiresAt: true },
  });

  return NextResponse.json({ user });
}
