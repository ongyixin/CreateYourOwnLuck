"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Zap, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressTracker } from "@/components/processing/progress-tracker";
import { PIPELINE_STAGES, STAGE_LABELS } from "@/lib/types";
import type {
  StatusEvent,
  ProgressStage,
  JobStatus,
} from "@/lib/types";

// Build the initial stages list (all pending) from the type definitions
function buildInitialStages(): ProgressStage[] {
  return PIPELINE_STAGES.map((stage) => ({
    stage,
    status: "pending",
    label: STAGE_LABELS[stage],
  }));
}

export default function ProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";

  const [stages, setStages] = useState<ProgressStage[]>(buildInitialStages);
  const [progress, setProgress] = useState(0);
  const [jobStatus, setJobStatus] = useState<JobStatus>("pending");
  const [companyName, setCompanyName] = useState("your company");
  const [sseError, setSseError] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | undefined>();

  // Track whether we've redirected to avoid double-redirects
  const redirected = useRef(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!id) return;

    // Connect to SSE stream
    const es = new EventSource(`/api/status/${id}`);
    esRef.current = es;

    es.onmessage = (event) => {
      let data: StatusEvent;
      try {
        data = JSON.parse(event.data) as StatusEvent;
      } catch {
        // Ignore malformed events
        return;
      }

      setStages(data.stages);
      setProgress(data.progress);
      setJobStatus(data.status);

      if (data.error) {
        setJobError(data.error);
      }

      // Pull company name from the first stage label if not yet set
      // (The backend should ideally send it; we fall back to what's available)
      if (data.stages.length > 0 && companyName === "your company") {
        // No company name in StatusEvent — wait for it if backend adds it later
      }

      if (data.status === "complete" && !redirected.current) {
        redirected.current = true;
        es.close();
        // Small delay so the user sees the "complete" state
        setTimeout(() => {
          router.push(`/report/${id}`);
        }, 1200);
      }

      if (data.status === "failed") {
        es.close();
      }
    };

    es.onerror = () => {
      es.close();
      // Only show error if we haven't completed successfully
      if (!redirected.current) {
        setSseError(
          "Lost connection to the analysis stream. The analysis may still be running — try refreshing."
        );
      }
    };

    return () => {
      es.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Pick up company name stored by the analyze page on submit
  useEffect(() => {
    if (!id) return;
    const stored = sessionStorage.getItem(`fitcheck-company-${id}`);
    if (stored) setCompanyName(stored);
  }, [id]);

  return (
    <div className="flex min-h-screen flex-col bg-[#09090b]">
      {/* Nav */}
      <nav className="border-b border-zinc-800/50 px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-semibold text-zinc-200">FitCheck</span>
          </div>
          <span className="text-xs text-zinc-500">Job ID: {id}</span>
        </div>
      </nav>

      {/* Main */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Connection error banner */}
        {sseError && (
          <div className="mb-6 flex w-full max-w-lg items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm text-amber-300">{sseError}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                className="mt-2 h-auto p-0 text-xs text-amber-400 hover:text-amber-200"
              >
                Refresh page
              </Button>
            </div>
          </div>
        )}

        <ProgressTracker
          companyName={companyName}
          progress={progress}
          stages={stages}
          status={jobStatus}
          error={jobError}
        />

        {/* Complete CTA */}
        {jobStatus === "complete" && (
          <div className="mt-8 text-center animate-fade-in">
            <p className="mb-4 text-sm text-zinc-400">
              Your FitCheck report is ready.
            </p>
            <Button asChild size="lg" className="gap-2">
              <Link href={`/report/${id}`}>
                View Report <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        {/* Failed CTA */}
        {jobStatus === "failed" && (
          <div className="mt-8 text-center">
            <p className="mb-4 text-sm text-zinc-400">
              Something went wrong during analysis.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/analyze">Try again</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
