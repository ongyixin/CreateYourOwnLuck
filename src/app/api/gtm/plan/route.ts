/**
 * POST /api/gtm/plan   — generates a GTM plan and streams SSE events
 * GET  /api/gtm/plan   — fetches an existing GTM plan by planId
 * PATCH /api/gtm/plan  — saves edited plan JSON before execution
 */

import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { getJob } from "@/lib/pipeline/store";
import type { FitCheckReport, GtmStrategy, GtmSseEvent } from "@/lib/types";

// ── Schema — must match GtmStrategy in src/lib/types.ts ──────────────────────

const GtmPlanSchema = z.object({
  summary: z.string(),
  objectives: z.array(
    z.object({
      goal: z.string(),
      metric: z.string(),
      rationale: z.string(),
      linkedActionables: z.array(z.string()),
    })
  ),
  messagingWorkstreams: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      brief: z.string(),
      placements: z.array(z.string()),
      toneShift: z.string(),
    })
  ),
  creativeWorkstreams: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      assetType: z.enum(["landing_page", "ad_copy", "social_post", "email_sequence", "one_pager"]),
      brief: z.string(),
      targetAudience: z.string(),
      keyMessage: z.string(),
    })
  ),
  outreachWorkstreams: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      targetType: z.enum(["investor", "partner", "influencer", "customer", "press"]),
      brief: z.string(),
      channels: z.array(z.string()),
    })
  ),
  growthWorkstreams: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      experimentType: z.enum(["ab_test", "landing_page_test", "pricing_test", "channel_test"]),
      hypothesis: z.string(),
      metric: z.string(),
      brief: z.string(),
    })
  ),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function getModel() {
  const provider = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    return createOpenAI({ apiKey })("gpt-4o");
  }

  if (provider === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    return createAnthropic({ apiKey })("claude-sonnet-4-6");
  }

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    return createGoogleGenerativeAI({ apiKey })("gemini-2.5-pro");
  }

  throw new Error(`Unknown AI_PROVIDER "${provider}"`);
}

function buildFallbackPlan(report: FitCheckReport): GtmStrategy {
  const company = report.companyName ?? "The company";
  return {
    summary: `${company} should focus on clarifying its positioning and activating high-fit channels identified in the FitCheck report. Priority actions address the top actionables from brand perception and ICP analysis.`,
    objectives: [
      {
        goal: "Improve brand positioning clarity",
        metric: "Aided brand awareness among target ICP (survey)",
        rationale: "Brand perception signals indicate messaging needs sharpening.",
        linkedActionables: ["Clarify value proposition", "Align messaging with ICP pain points"],
      },
      {
        goal: "Generate qualified pipeline from priority segments",
        metric: "MQLs from target segments (monthly)",
        rationale: "ICP assessment identifies high-fit segments with unmet needs.",
        linkedActionables: ["Activate top channels", "Launch targeted outreach"],
      },
    ],
    messagingWorkstreams: [
      {
        id: "msg-1",
        title: "Homepage & Core Messaging Refresh",
        brief: `Rewrite homepage hero and product page copy to reflect ${company}'s differentiated value for the primary ICP segment.`,
        placements: ["Homepage hero", "Product page", "Meta descriptions"],
        toneShift: "From feature-centric to outcome-centric; authoritative but approachable.",
      },
      {
        id: "msg-2",
        title: "Social & Content Voice",
        brief: "Define a consistent content voice for social channels that resonates with the target audience.",
        placements: ["LinkedIn posts", "Twitter/X", "Blog intro sections"],
        toneShift: "Conversational and insight-driven; lead with the problem before the solution.",
      },
    ],
    creativeWorkstreams: [
      {
        id: "cre-1",
        title: "ICP-Targeted Landing Page",
        assetType: "landing_page",
        brief: `Create a dedicated landing page for the primary ICP segment, highlighting the top 3 value props and a clear CTA.`,
        targetAudience: "Primary ICP segment identified in the FitCheck report",
        keyMessage: `${company} solves [core pain] faster and more reliably than alternatives.`,
      },
      {
        id: "cre-2",
        title: "Awareness Ad Copy",
        assetType: "ad_copy",
        brief: "Write 3 ad variants for top-of-funnel awareness on LinkedIn and/or Google, testing different angles.",
        targetAudience: "Decision-makers in target segments",
        keyMessage: "Outcome-first messaging that stops the scroll.",
      },
    ],
    outreachWorkstreams: [
      {
        id: "out-1",
        title: "Customer Champion Outreach",
        targetType: "customer",
        brief: "Identify and personally reach out to 20 high-fit prospects from the recommended communities and creator channels.",
        channels: ["Email", "LinkedIn DM"],
      },
      {
        id: "out-2",
        title: "Partnership Development",
        targetType: "partner",
        brief: "Reach out to 5 complementary products or communities for co-marketing or integration opportunities.",
        channels: ["Email", "LinkedIn"],
      },
    ],
    growthWorkstreams: [
      {
        id: "growth-1",
        title: "Homepage CTA A/B Test",
        experimentType: "ab_test",
        hypothesis: "Changing the primary CTA from 'Get Started' to a benefit-led CTA will increase sign-up conversion rate.",
        metric: "Sign-up conversion rate",
        brief: "Run a 2-week A/B test on the homepage CTA copy with equal traffic split.",
      },
      {
        id: "growth-2",
        title: "Channel Effectiveness Test",
        experimentType: "channel_test",
        hypothesis: "LinkedIn outreach will generate higher-quality MQLs than cold email for the primary ICP segment.",
        metric: "MQL quality score and conversion to demo",
        brief: "Run parallel outreach campaigns on LinkedIn and email for 3 weeks, tracking MQL quality.",
      },
    ],
  };
}

function isPrismaConnectionError(err: unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: string }).code;
    return code === "P1001" || code === "P1002" || code === "P1017";
  }
  return false;
}

function sseEvent(event: GtmSseEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// ── POST — generate plan, stream SSE ─────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const jobId = (body as Record<string, unknown>)?.jobId;
  if (typeof jobId !== "string" || !jobId.trim()) {
    return NextResponse.json({ error: "jobId is required in request body" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Fetch analysis record ────────────────────────────────────────────────

  let record: { id: string; userId: string; status: string; reportJson: unknown } | null;
  try {
    record = await prisma.analysis.findUnique({
      where: { jobId: jobId.trim() },
      select: { id: true, userId: true, status: true, reportJson: true },
    });
  } catch (err) {
    if (isPrismaConnectionError(err)) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again in a moment." },
        { status: 503 }
      );
    }
    throw err;
  }

  if (!record) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const isAdmin = session.user.role === "ADMIN";
  if (record.userId !== session.user.id && !isAdmin) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  let report: FitCheckReport | null = null;
  const job = getJob(jobId.trim());
  if (job?.report) {
    report = job.report;
  } else if (record.status === "complete" && record.reportJson) {
    report = record.reportJson as unknown as FitCheckReport;
  }

  if (!report) {
    return NextResponse.json(
      {
        error:
          record.status === "pending" || record.status === "running"
            ? "Report is still being generated"
            : "Report not found or incomplete",
      },
      { status: record.status === "failed" ? 500 : 202 }
    );
  }

  // ── Stream SSE ────────────────────────────────────────────────────────────

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: GtmSseEvent) => {
        controller.enqueue(encoder.encode(sseEvent(event)));
      };

      try {
        emit({ type: "plan_thinking", content: "Analysing your FitCheck report…" });

        const reportContext = JSON.stringify(
          {
            companyName: report!.companyName,
            websiteUrl: report!.websiteUrl,
            brandPerception: report!.brandPerception,
            icpAssessment: report!.icpAssessment,
            actionables: report!.actionables,
            leadSuggestions: report!.leadSuggestions,
            resonanceMap: report!.resonanceMap,
          },
          null,
          2
        );

        emit({ type: "plan_thinking", content: "Generating Go-To-Market strategy…" });

        let plan: GtmStrategy;

        try {
          const result = await generateObject({
            model: getModel() as Parameters<typeof generateObject>[0]["model"],
            schema: GtmPlanSchema,
            system:
              "You are a Go-To-Market strategist. Return a complete, actionable GTM plan grounded in the report data. Every array must have at least 2 items. Use specific details from the report — never use generic placeholders. All IDs must be unique slugs (e.g. 'msg-1', 'cre-2').",
            prompt: `Generate a Go-To-Market plan for this company based on their FitCheck report.

Report context (JSON):
${reportContext}

Return a COMPLETE GTM plan with:
- summary: 2-3 sentence strategic overview
- objectives: 2-3 measurable goals with linked actionables from the report
- messagingWorkstreams: 2-3 workstreams covering key copy/messaging placements (id must be unique e.g. "msg-1")
- creativeWorkstreams: 2-3 workstreams for creative assets — assetType must be one of: landing_page, ad_copy, social_post, email_sequence, one_pager (id must be unique e.g. "cre-1")
- outreachWorkstreams: 2 workstreams for outreach — targetType must be one of: investor, partner, influencer, customer, press (id must be unique e.g. "out-1")
- growthWorkstreams: 2 workstreams for growth experiments — experimentType must be one of: ab_test, landing_page_test, pricing_test, channel_test (id must be unique e.g. "growth-1")`,
            temperature: 0.4,
          });

          const generated = result.object as GtmStrategy;
          const hasContent =
            generated.summary?.trim() &&
            generated.objectives?.length > 0 &&
            generated.messagingWorkstreams?.length > 0 &&
            generated.creativeWorkstreams?.length > 0;

          plan = hasContent ? generated : buildFallbackPlan(report!);
        } catch {
          plan = buildFallbackPlan(report!);
        }

        emit({ type: "plan_thinking", content: "Saving plan…" });

        // Persist plan to DB
        const gtmPlan = await prisma.gtmPlan.create({
          data: {
            analysisId: record!.id,
            userId: session.user.id,
            status: "ready",
            planJson: plan as object,
          },
        });

        emit({ type: "plan_complete", plan, planId: gtmPlan.id });
      } catch (err) {
        const message = err instanceof Error ? err.message : "GTM plan generation failed";
        console.error("[/api/gtm/plan POST]", err);
        emit({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ── GET — fetch existing plan by jobId ───────────────────────────────────────

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId?.trim()) {
    return NextResponse.json({ error: "jobId query parameter is required" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const analysis = await prisma.analysis.findUnique({
    where: { jobId: jobId.trim() },
    select: { id: true, userId: true },
  });

  if (!analysis) {
    return NextResponse.json({ plan: null });
  }

  const isAdmin = session.user.role === "ADMIN";
  if (analysis.userId !== session.user.id && !isAdmin) {
    return NextResponse.json({ plan: null });
  }

  // Return the most recent plan for this analysis
  const plan = await prisma.gtmPlan.findFirst({
    where: { analysisId: analysis.id },
    orderBy: { createdAt: "desc" },
    include: { assets: true },
  });

  return NextResponse.json({ plan });
}

// ── PATCH — save edited plan ──────────────────────────────────────────────────

export async function PATCH(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { planId, editedJson } = body as Record<string, unknown>;

  if (typeof planId !== "string" || !planId.trim()) {
    return NextResponse.json({ error: "planId is required" }, { status: 400 });
  }
  if (!editedJson || typeof editedJson !== "object") {
    return NextResponse.json({ error: "editedJson is required" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.gtmPlan.findUnique({
    where: { id: planId.trim() },
    select: { userId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const isAdmin = session.user.role === "ADMIN";
  if (existing.userId !== session.user.id && !isAdmin) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  await prisma.gtmPlan.update({
    where: { id: planId.trim() },
    data: {
      editedJson: editedJson as object,
      status: "approved",
    },
  });

  return NextResponse.json({ ok: true });
}
