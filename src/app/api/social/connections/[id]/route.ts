import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await prisma.socialConnection.findUnique({
    where: { id: params.id },
    select: { userId: true },
  });

  if (!connection) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (connection.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.socialConnection.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
