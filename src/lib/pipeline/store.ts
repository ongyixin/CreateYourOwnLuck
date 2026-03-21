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
  FocusGroupAnalytics,
  FocusGroupMessage,
  FocusGroupPhase,
  FocusGroupSession,
  JobStatus,
  Persona,
  PipelineStage,
  ProgressStage,
  StageStatus,
} from "../types";
import { PIPELINE_STAGES, STAGE_LABELS } from "../types";

// ─── Store ────────────────────────────────────────────────────────────────────
//
// Anchored to globalThis so Next.js dev mode (which can load modules in
// separate module-instance contexts per route) still shares a single Map
// across /api/analyze and /api/status/[id].

declare global {
  // eslint-disable-next-line no-var
  var __fitcheckJobs: Map<string, AnalysisJob> | undefined;
  // eslint-disable-next-line no-var
  var __fitcheckFocusGroups: Map<string, FocusGroupSession> | undefined;
}

const jobs: Map<string, AnalysisJob> =
  globalThis.__fitcheckJobs ?? (globalThis.__fitcheckJobs = new Map());

const focusGroups: Map<string, FocusGroupSession> =
  globalThis.__fitcheckFocusGroups ?? (globalThis.__fitcheckFocusGroups = new Map());

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

// ─── Focus Group Store ────────────────────────────────────────────────────────

export function createFocusGroupSession(
  id: string,
  jobId: string,
  personas: Persona[]
): FocusGroupSession {
  const now = new Date().toISOString();
  const session: FocusGroupSession = {
    id,
    jobId,
    personas,
    messages: [],
    phase: "probe",
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  focusGroups.set(id, session);
  return session;
}

export function getFocusGroupSession(id: string): FocusGroupSession | undefined {
  return focusGroups.get(id);
}

export function addFocusGroupMessage(
  id: string,
  message: FocusGroupMessage
): void {
  const session = focusGroups.get(id);
  if (!session) return;
  focusGroups.set(id, {
    ...session,
    messages: [...session.messages, message],
    updatedAt: new Date().toISOString(),
  });
}

export function updateSessionPhase(
  id: string,
  phase: FocusGroupPhase
): void {
  const session = focusGroups.get(id);
  if (!session) return;
  focusGroups.set(id, {
    ...session,
    phase,
    updatedAt: new Date().toISOString(),
  });
}

export function setSessionAnalytics(
  id: string,
  analytics: FocusGroupAnalytics
): void {
  const session = focusGroups.get(id);
  if (!session) return;
  focusGroups.set(id, {
    ...session,
    analytics,
    status: "complete",
    updatedAt: new Date().toISOString(),
  });
}
