/**
 * POST /api/analyze
 *
 * Accepts an AnalysisRequest body, creates a job, fires off the pipeline
 * in the background, and immediately returns { jobId }.
 *
 * Owned by: backend agent
 */

import { NextResponse } from "next/server";
import type { AnalysisRequest, AnalyzeResponse } from "../../../lib/types";
import { createJob } from "../../../lib/pipeline/store";
import { runPipeline } from "../../../lib/pipeline/runner";

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  // ── Parse body ────────────────────────────────────────────────────────────

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // ── Validate required fields ──────────────────────────────────────────────

  const validationError = validateRequest(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const analysisRequest = body as AnalysisRequest;

  // Clamp competitor list to 3 entries max
  if (analysisRequest.competitorUrls) {
    analysisRequest.competitorUrls = analysisRequest.competitorUrls.slice(0, 3);
  }

  // ── Create job ────────────────────────────────────────────────────────────

  const jobId = crypto.randomUUID();
  createJob(jobId, analysisRequest);

  // ── Start pipeline (fire-and-forget) ─────────────────────────────────────
  //
  // In local dev / standard Node.js: the async pipeline runs until completion.
  // In Vercel production: wrap with waitUntil() from @vercel/functions so the
  // serverless function stays alive after returning the response:
  //
  //   import { waitUntil } from "@vercel/functions";
  //   waitUntil(runPipeline(jobId, analysisRequest));
  //
  void runPipeline(jobId, analysisRequest);

  // ── Return job ID immediately ─────────────────────────────────────────────

  const response: AnalyzeResponse = { jobId };
  return NextResponse.json(response, { status: 202 });
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateRequest(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be a JSON object";
  }

  const obj = body as Record<string, unknown>;

  if (!obj.companyName || typeof obj.companyName !== "string" || !obj.companyName.trim()) {
    return "companyName is required and must be a non-empty string";
  }

  if (!obj.websiteUrl || typeof obj.websiteUrl !== "string" || !obj.websiteUrl.trim()) {
    return "websiteUrl is required and must be a non-empty string";
  }

  if (!isValidUrl(obj.websiteUrl as string)) {
    return "websiteUrl must be a valid URL (include https://)";
  }

  if (obj.competitorUrls !== undefined) {
    if (!Array.isArray(obj.competitorUrls)) {
      return "competitorUrls must be an array";
    }
    for (const url of obj.competitorUrls) {
      if (typeof url !== "string" || !isValidUrl(url)) {
        return `Invalid competitor URL: ${String(url)}`;
      }
    }
  }

  if (obj.extraMaterials !== undefined && typeof obj.extraMaterials !== "string") {
    return "extraMaterials must be a string";
  }

  if (obj.goal !== undefined && typeof obj.goal !== "string") {
    return "goal must be a string";
  }

  return null;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
