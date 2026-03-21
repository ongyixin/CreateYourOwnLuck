/**
 * In-memory job store for FitCheck analysis pipeline jobs.
 *
 * A single module-level Map acts as the store. This is intentionally simple:
 * at hackathon scale one Node process handles all requests, so there are no
 * concurrency or persistence requirements.
 *
 * Owned by: backend agent
 */

import type {
  AnalysisJob,
  AnalysisRequest,
  FitCheckReport,
  JobStatus,
  PipelineStage,
  ProgressStage,
  StageStatus,
} from "../types";
import { PIPELINE_STAGES, STAGE_LABELS } from "../types";

// ─── Store ────────────────────────────────────────────────────────────────────

const jobs = new Map<string, AnalysisJob>();

// ─── Read ─────────────────────────────────────────────────────────────────────

export function getJob(id: string): AnalysisJob | undefined {
  return jobs.get(id);
}

export function getAllJobs(): AnalysisJob[] {
  return Array.from(jobs.values());
}

// ─── Create ───────────────────────────────────────────────────────────────────

export function createJob(id: string, request: AnalysisRequest): AnalysisJob {
  const now = new Date().toISOString();

  const stages: ProgressStage[] = PIPELINE_STAGES.map((stage) => ({
    stage,
    status: "pending" as StageStatus,
    label: STAGE_LABELS[stage],
  }));

  const job: AnalysisJob = {
    id,
    status: "pending",
    request,
    stages,
    progress: 0,
    createdAt: now,
    updatedAt: now,
  };

  jobs.set(id, job);
  return job;
}

// ─── Stage updates ────────────────────────────────────────────────────────────

/**
 * Update a single pipeline stage and recalculate overall progress.
 * Safe to call with an unknown id — no-ops silently.
 */
export function updateStage(
  id: string,
  stage: PipelineStage,
  status: StageStatus,
  message?: string
): void {
  const job = jobs.get(id);
  if (!job) return;

  const entry = job.stages.find((s) => s.stage === stage);
  if (!entry) return;

  entry.status = status;

  if (status === "running" && !entry.startedAt) {
    entry.startedAt = new Date().toISOString();
  }

  if (
    status === "complete" ||
    status === "failed" ||
    status === "skipped"
  ) {
    entry.completedAt = new Date().toISOString();
  }

  if (message !== undefined) {
    entry.message = message;
  }

  // Recalculate overall progress: count resolved stages (complete or skipped)
  const resolved = job.stages.filter(
    (s) => s.status === "complete" || s.status === "skipped"
  ).length;
  job.progress = Math.round((resolved / job.stages.length) * 100);
  job.updatedAt = new Date().toISOString();

  // Write back (spread to trigger reference change, useful for future polling)
  jobs.set(id, { ...job, stages: [...job.stages] });
}

// ─── Job status transitions ───────────────────────────────────────────────────

export function setJobRunning(id: string): void {
  patch(id, { status: "running" as JobStatus });
}

export function setJobComplete(id: string, report: FitCheckReport): void {
  patch(id, { status: "complete" as JobStatus, progress: 100, report });
}

export function setJobFailed(id: string, error: string): void {
  patch(id, { status: "failed" as JobStatus, error });
}

// ─── Internal helper ──────────────────────────────────────────────────────────

function patch(id: string, updates: Partial<AnalysisJob>): void {
  const job = jobs.get(id);
  if (!job) return;
  jobs.set(id, { ...job, ...updates, updatedAt: new Date().toISOString() });
}
