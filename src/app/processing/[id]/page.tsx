"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, AlertCircle, FileText } from "lucide-react";
import { useSession } from "next-auth/react";
import { ProgressTracker } from "@/components/processing/progress-tracker";
import AnimatedLogo from "@/components/animated-logo";
import ScanlineOverlay from "@/components/scanline-overlay";
import { PIPELINE_STAGES, STAGE_LABELS } from "@/lib/types";
import type {
  StatusEvent,
  ProgressStage,
  JobStatus,
} from "@/lib/types";

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
  const { status } = useSession();
  const id = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";

  const [stages, setStages] = useState<ProgressStage[]>(buildInitialStages);
  const [progress, setProgress] = useState(0);
  const [jobStatus, setJobStatus] = useState<JobStatus>("pending");
  const [companyName, setCompanyName] = useState("your company");
  const [sseError, setSseError] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | undefined>();

  const redirected = useRef(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!id) return;

    const es = new EventSource(`/api/status/${id}`);
    esRef.current = es;

    es.onmessage = (event) => {
      let data: StatusEvent;
      try {
        data = JSON.parse(event.data) as StatusEvent;
      } catch {
        return;
      }

      setStages(data.stages);
      setProgress(data.progress);
      setJobStatus(data.status);

      if (data.error) {
        setJobError(data.error);
      }

      if (data.status === "complete" && !redirected.current) {
        redirected.current = true;
        es.close();
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

  useEffect(() => {
    if (!id) return;
    const stored = sessionStorage.getItem(`fitcheck-company-${id}`);
    if (stored) setCompanyName(stored);
  }, [id]);

  return (
    <div className="flex min-h-screen flex-col relative">
      <ScanlineOverlay />

      {/* Nav */}
      <nav className="relative z-40 flex items-center justify-between px-6 py-3 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <AnimatedLogo size={18} />
          <span className="font-mono text-neon-green font-bold text-sm tracking-wider">
            FITCHECK<span className="blink">_</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {status === "authenticated" && (
            <Link
              href="/reports"
              className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground hover:text-neon-green transition-colors tracking-wider"
            >
              <FileText className="w-3 h-3" />
              REPORTS
            </Link>
          )}
          <span className="font-mono text-[10px] text-muted-foreground tracking-widest">
            JOB: {id.slice(0, 8)}
          </span>
        </div>
      </nav>

      {/* Main */}
      <main className="relative z-20 flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Connection error banner */}
        {sseError && (
          <div className="mb-6 w-full max-w-lg terminal-card border-neon-amber">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-neon-amber" />
              <div>
                <p className="text-sm text-neon-amber font-mono">{sseError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 font-mono text-[10px] text-neon-green hover:underline tracking-wider"
                >
                  REFRESH PAGE
                </button>
              </div>
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
            <p className="mb-4 text-sm text-muted-foreground font-mono">
              Your FitCheck report is ready.
            </p>
            <Link
              href={`/report/${id}`}
              className="inline-flex items-center gap-2 bg-neon-green text-primary-foreground font-mono font-bold px-6 py-3 rounded-sm text-sm tracking-wider hover:glow-green transition-all active:scale-95"
            >
              VIEW REPORT <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* Failed CTA */}
        {jobStatus === "failed" && (
          <div className="mt-8 text-center">
            <p className="mb-4 text-sm text-muted-foreground font-mono">
              Something went wrong during analysis.
            </p>
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 border-2 border-neon-pink text-neon-pink font-mono font-bold px-5 py-2 rounded-sm text-xs tracking-wider hover:bg-neon-pink hover:text-primary-foreground transition-all"
            >
              TRY AGAIN
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
