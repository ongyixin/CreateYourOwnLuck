/**
 * FitCheck analysis pipeline runner.
 *
 * Orchestrates the full pipeline:
 *   1. Scrape (company + competitors + mentions) via Apify
 *   2. Run all 5 AI analyses in parallel, updating stage progress as each resolves
 *   3. Assemble and store the completed FitCheckReport
 *
 * Called as a fire-and-forget async function from POST /api/analyze.
 * Never throws — all errors are captured into the job store.
 *
 * Owned by: backend agent
 */

import type {
  AnalysisRequest,
  BrandPerception,
  IcpAssessment,
  Actionables,
  LeadSuggestions,
  IcpStudio,
  FitCheckReport,
  ScrapedData,
} from "../types";
import { scrapeAll } from "../apify/orchestrator";
import {
  generateBrandPerception,
  generateIcpAssessment,
  generateActionables,
  generateLeadSuggestions,
  generateIcpStudio,
  type AnalysisContext,
} from "../ai/provider";
import {
  createJob,
  getJob,
  setJobComplete,
  setJobFailed,
  setJobRunning,
  updateStage,
} from "./store";

// ─── Public entry points ──────────────────────────────────────────────────────

/**
 * Initialize a job in the store.
 * Called synchronously from POST /api/analyze before returning the job ID.
 */
export { createJob };

/**
 * Run the full analysis pipeline for the given job.
 *
 * This function is designed to be called with `void` — it manages all state
 * internally and never rejects. Errors are stored on the job.
 *
 * For Vercel production: wrap with `waitUntil(runPipeline(...))` from
 * @vercel/functions to keep the serverless function alive after the response.
 */
export async function runPipeline(
  jobId: string,
  request: AnalysisRequest
): Promise<void> {
  setJobRunning(jobId);

  let scrapedData: ScrapedData;
  const pipelineWarnings: string[] = [];

  // ── Stage 1–3: Scraping ──────────────────────────────────────────────────

  const hasCompetitors =
    (request.competitorUrls ?? []).length > 0;

  updateStage(jobId, "crawl_company", "running");
  if (hasCompetitors) updateStage(jobId, "crawl_competitors", "running");
  updateStage(jobId, "search_mentions", "running");
  updateStage(jobId, "scrape_reviews", "running");
  updateStage(jobId, "scrape_social", "running");
  updateStage(jobId, "scrape_enrichment", "running");

  try {
    scrapedData = await scrapeAll(request);
    pipelineWarnings.push(...scrapedData.warnings);
  } catch (err) {
    // Catastrophic scrape failure — mark all scrape stages failed and bail
    const msg = errorMessage(err);
    updateStage(jobId, "crawl_company", "failed", msg);
    if (hasCompetitors) updateStage(jobId, "crawl_competitors", "failed", msg);
    updateStage(jobId, "search_mentions", "failed", msg);
    updateStage(jobId, "scrape_reviews", "failed", msg);
    updateStage(jobId, "scrape_social", "failed", msg);
    updateStage(jobId, "scrape_enrichment", "failed", msg);
    setJobFailed(jobId, `Scraping failed: ${msg}`);
    return;
  }

  // Update scraping stages based on what came back
  resolveScrapeStages(jobId, request, scrapedData);

  // ── Stages 4–8: AI analyses (parallel) ───────────────────────────────────

  const ctx: AnalysisContext = { request, scrapedData };

  updateStage(jobId, "analyze_brand", "running");
  updateStage(jobId, "analyze_icp", "running");
  updateStage(jobId, "analyze_actionables", "running");
  updateStage(jobId, "analyze_leads", "running");
  updateStage(jobId, "analyze_personas", "running");

  // Run all 5 in parallel; each updates its own stage on completion.
  const [
    brandResult,
    icpResult,
    actionablesResult,
    leadsResult,
    personasResult,
  ] = await Promise.allSettled([
    generateBrandPerception(ctx).then((v) => {
      updateStage(jobId, "analyze_brand", "complete");
      return v;
    }),
    generateIcpAssessment(ctx).then((v) => {
      updateStage(jobId, "analyze_icp", "complete");
      return v;
    }),
    generateActionables(ctx).then((v) => {
      updateStage(jobId, "analyze_actionables", "complete");
      return v;
    }),
    generateLeadSuggestions(ctx).then((v) => {
      updateStage(jobId, "analyze_leads", "complete");
      return v;
    }),
    generateIcpStudio(ctx).then((v) => {
      updateStage(jobId, "analyze_personas", "complete");
      return v;
    }),
  ]);

  // Collect any AI section failures into warnings (not fatal)
  const brandPerception = unwrapOrFallback(
    brandResult,
    "analyze_brand",
    jobId,
    fallbackBrandPerception(),
    pipelineWarnings
  );
  const icpAssessment = unwrapOrFallback(
    icpResult,
    "analyze_icp",
    jobId,
    fallbackIcpAssessment(),
    pipelineWarnings
  );
  const actionables = unwrapOrFallback(
    actionablesResult,
    "analyze_actionables",
    jobId,
    fallbackActionables(),
    pipelineWarnings
  );
  const leadSuggestions = unwrapOrFallback(
    leadsResult,
    "analyze_leads",
    jobId,
    fallbackLeadSuggestions(),
    pipelineWarnings
  );
  const icpStudio = unwrapOrFallback(
    personasResult,
    "analyze_personas",
    jobId,
    fallbackIcpStudio(),
    pipelineWarnings
  );

  // ── Stage 9: Build report ─────────────────────────────────────────────────

  updateStage(jobId, "build_report", "running");

  const report: FitCheckReport = {
    jobId,
    companyName: request.companyName,
    websiteUrl: request.websiteUrl,
    generatedAt: new Date().toISOString(),
    brandPerception,
    icpAssessment,
    actionables,
    leadSuggestions,
    icpStudio,
    warnings: pipelineWarnings,
  };

  updateStage(jobId, "build_report", "complete");
  setJobComplete(jobId, report);
}

// ─── Stage resolution helpers ─────────────────────────────────────────────────

/**
 * Resolve the 3 scraping stages based on what scrapeAll actually returned.
 * Marks stages complete, failed, or skipped depending on the data.
 */
function resolveScrapeStages(
  jobId: string,
  request: AnalysisRequest,
  data: ScrapedData
): void {
  const warnings = data.warnings;

  // Company crawl
  if (data.companyPages.length > 0) {
    updateStage(jobId, "crawl_company", "complete");
  } else {
    const msg = warnings.find((w) => w.includes("Company website")) ?? "No pages returned";
    updateStage(jobId, "crawl_company", "failed", msg);
  }

  // Competitor crawl
  const hasCompetitors = (request.competitorUrls ?? []).length > 0;
  if (!hasCompetitors) {
    updateStage(jobId, "crawl_competitors", "skipped", "No competitor URLs provided");
  } else if (data.competitorPages.length > 0) {
    updateStage(jobId, "crawl_competitors", "complete");
  } else {
    const msg = warnings.find((w) => w.toLowerCase().includes("competitor")) ?? "No competitor pages returned";
    updateStage(jobId, "crawl_competitors", "failed", msg);
  }

  // Search / mentions
  if (data.mentions.length > 0) {
    updateStage(jobId, "search_mentions", "complete");
  } else {
    const msg = warnings.find((w) => w.toLowerCase().includes("search") || w.toLowerCase().includes("mention")) ?? "No mentions returned";
    updateStage(jobId, "search_mentions", "failed", msg);
  }

  // Structured reviews (G2 + Trustpilot)
  // undefined = actor was not run (not wired into orchestrator yet); skip rather than fail
  if (data.reviews === undefined) {
    updateStage(jobId, "scrape_reviews", "skipped", "Not included in this build");
  } else if (data.reviews.length > 0) {
    updateStage(jobId, "scrape_reviews", "complete");
  } else {
    const msg = warnings.find((w) => /g2|trustpilot|review/i.test(w)) ?? "No structured reviews returned";
    updateStage(jobId, "scrape_reviews", "failed", msg);
  }

  // Social mentions (Twitter/X)
  if (data.socialMentions === undefined) {
    updateStage(jobId, "scrape_social", "skipped", "Not included in this build");
  } else if (data.socialMentions.length > 0) {
    updateStage(jobId, "scrape_social", "complete");
  } else {
    const msg = warnings.find((w) => /twitter|tweet|social/i.test(w)) ?? "No social mentions returned";
    updateStage(jobId, "scrape_social", "failed", msg);
  }

  // Enrichment data (jobs, YouTube, Product Hunt, autocomplete)
  const hasEnrichment =
    (data.jobPostings && data.jobPostings.length > 0) ||
    (data.videos && data.videos.length > 0) ||
    (data.productHuntEntries && data.productHuntEntries.length > 0) ||
    (data.autocompleteSuggestions && data.autocompleteSuggestions.length > 0);
  const enrichmentAttempted =
    data.jobPostings !== undefined ||
    data.videos !== undefined ||
    data.productHuntEntries !== undefined ||
    data.autocompleteSuggestions !== undefined;

  if (!enrichmentAttempted) {
    updateStage(jobId, "scrape_enrichment", "skipped", "Not included in this build");
  } else if (hasEnrichment) {
    updateStage(jobId, "scrape_enrichment", "complete");
  } else {
    const msg = warnings.find((w) => /job|youtube|product hunt|autocomplete/i.test(w)) ?? "No enrichment data returned";
    updateStage(jobId, "scrape_enrichment", "failed", msg);
  }
}

// ─── Settled result helper ────────────────────────────────────────────────────

/**
 * Unwrap a PromiseSettledResult. On rejection, marks the stage failed,
 * pushes a warning, and returns the fallback value.
 */
function unwrapOrFallback<T>(
  result: PromiseSettledResult<T>,
  stage: Parameters<typeof updateStage>[1],
  jobId: string,
  fallback: T,
  warnings: string[]
): T {
  if (result.status === "fulfilled") return result.value;

  const msg = errorMessage(result.reason);
  updateStage(jobId, stage, "failed", msg);
  warnings.push(`${stage} failed: ${msg}`);
  return fallback;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// ─── Fallback data shapes ─────────────────────────────────────────────────────
// Used when an AI section fails so the UI can still render the report.

function fallbackBrandPerception(): BrandPerception {
  return {
    toneAndIdentity: [],
    perceivedStrengths: [],
    weakOrConfusingSignals: [],
    consistencyScore: 0,
    summary: "Brand analysis could not be completed for this run.",
  };
}

function fallbackIcpAssessment(): IcpAssessment {
  return {
    profiles: [],
    audienceSegments: [],
    summary: "ICP assessment could not be completed for this run.",
  };
}

function fallbackActionables(): Actionables {
  return {
    whatToImprove: [],
    whatToChange: [],
    whatToLeanInto: [],
    messagingAngles: [],
    copySuggestions: [],
  };
}

function fallbackLeadSuggestions(): LeadSuggestions {
  return {
    customerTypes: [],
    communities: [],
    targetCompanyProfiles: [],
    creatorChannels: [],
  };
}

function fallbackIcpStudio(): IcpStudio {
  return {
    personas: [],
  };
}

// Re-export getJob for convenience (API routes use it from store directly,
// but runner consumers may want a single import point)
export { getJob } from "./store";
