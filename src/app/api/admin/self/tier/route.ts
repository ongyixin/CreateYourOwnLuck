import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const tier = body.tier as "FREE" | "PRO" | "AGENCY" | undefined;

  if (!tier || !["FREE", "PRO", "AGENCY"].includes(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { tier, tierGrantedBy: null, tierExpiresAt: null },
    select: { id: true, email: true, tier: true, role: true },
  });

  return NextResponse.json({ user });
}
