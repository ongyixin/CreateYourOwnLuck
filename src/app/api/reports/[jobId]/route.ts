/**
 * DELETE /api/reports/[jobId]
 *
 * Deletes an analysis report. Requires authentication and ownership.
 * Also removes the job from in-memory store if present.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { deleteJob } from "@/lib/pipeline/store";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { jobId } = await params;
  if (!jobId) {
    return NextResponse.json({ error: "Job ID required" }, { status: 400 });
  }

  const record = await prisma.analysis.findUnique({
    where: { jobId },
    select: { userId: true },
  });

  if (!record) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const isAdmin = session.user.role === "ADMIN";
  if (record.userId !== session.user.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.analysis.delete({ where: { jobId } });
    deleteJob(jobId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/reports]", err);
    return NextResponse.json(
      { error: "Failed to delete report. Please try again." },
      { status: 500 }
    );
  }
}
