import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { getJob } from "@/lib/pipeline/store";
import { ReportPDF } from "@/lib/pdf/report-pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const job = getJob(params.id);

  if (!job) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  if (job.status !== "complete" || !job.report) {
    return NextResponse.json(
      { error: "Report is not ready yet." },
      { status: 202 }
    );
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(ReportPDF, { report: job.report }) as any;
    const buffer = await renderToBuffer(element);
    const body = new Uint8Array(buffer);

    const slug = job.report.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="fitcheck-${slug}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[export] PDF render error:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF." },
      { status: 500 }
    );
  }
}
