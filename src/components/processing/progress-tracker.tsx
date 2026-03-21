"use client";

import {
  Globe,
  Search,
  MessageSquare,
  Sparkles,
  Users,
  Target,
  TrendingUp,
  UserCircle,
  FileText,
  Check,
  X,
  SkipForward,
  Loader2,
  Star,
  Twitter,
  Briefcase,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProgressStage, PipelineStage, StageStatus } from "@/lib/types";

const STAGE_ICONS: Record<PipelineStage, React.ElementType> = {
  crawl_company: Globe,
  crawl_competitors: Search,
  search_mentions: MessageSquare,
  scrape_reviews: Star,
  scrape_social: Twitter,
  scrape_enrichment: Briefcase,
  analyze_brand: Sparkles,
  analyze_icp: Users,
  analyze_actionables: Target,
  analyze_leads: TrendingUp,
  analyze_personas: UserCircle,
  build_report: FileText,
};

const STAGE_GROUPS: { label: string; stages: PipelineStage[] }[] = [
  {
    label: "Data Collection",
    stages: [
      "crawl_company",
      "crawl_competitors",
      "search_mentions",
      "scrape_reviews",
      "scrape_social",
      "scrape_enrichment",
    ],
  },
  {
    label: "AI Analysis",
    stages: [
      "analyze_brand",
      "analyze_icp",
      "analyze_actionables",
      "analyze_leads",
      "analyze_personas",
    ],
  },
  {
    label: "Report",
    stages: ["build_report"],
  },
];

function StageStatusIcon({ status }: { status: StageStatus }) {
  if (status === "running") {
    return (
      <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
    );
  }
  if (status === "complete") {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
        <Check className="h-3 w-3 text-emerald-400" />
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20">
        <X className="h-3 w-3 text-red-400" />
      </div>
    );
  }
  if (status === "skipped") {
    return <SkipForward className="h-4 w-4 text-zinc-600" />;
  }
  // pending
  return <div className="h-2 w-2 rounded-full bg-zinc-700" />;
}

function StageRow({ stage }: { stage: ProgressStage }) {
  const Icon = STAGE_ICONS[stage.stage];
  const isRunning = stage.status === "running";
  const isComplete = stage.status === "complete";
  const isFailed = stage.status === "failed";
  const isPending = stage.status === "pending";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-all",
        isRunning && "bg-violet-500/8 ring-1 ring-violet-500/20",
        isFailed && "bg-red-500/5"
      )}
    >
      {/* Stage icon */}
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
          isRunning && "bg-violet-500/20",
          isComplete && "bg-emerald-500/10",
          isFailed && "bg-red-500/10",
          isPending && "bg-zinc-800",
          stage.status === "skipped" && "bg-zinc-800/50"
        )}
      >
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            isRunning && "text-violet-400",
            isComplete && "text-emerald-400",
            isFailed && "text-red-400",
            isPending && "text-zinc-600",
            stage.status === "skipped" && "text-zinc-700"
          )}
        />
      </div>

      {/* Label + message */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm leading-snug",
            isRunning && "font-medium text-zinc-200",
            isComplete && "text-zinc-400",
            isFailed && "text-red-400",
            isPending && "text-zinc-600",
            stage.status === "skipped" && "text-zinc-700 line-through"
          )}
        >
          {stage.label}
        </p>
        {stage.message && (
          <p className="mt-0.5 text-xs text-zinc-500">{stage.message}</p>
        )}
      </div>

      {/* Status indicator */}
      <div className="mt-0.5 shrink-0">
        <StageStatusIcon status={stage.status} />
      </div>
    </div>
  );
}

interface ProgressTrackerProps {
  companyName: string;
  progress: number;
  stages: ProgressStage[];
  status: "pending" | "running" | "complete" | "failed";
  error?: string;
}

export function ProgressTracker({
  companyName,
  progress,
  stages,
  status,
  error,
}: ProgressTrackerProps) {
  const stageMap = new Map(stages.map((s) => [s.stage, s]));

  const completedCount = stages.filter((s) => s.status === "complete").length;
  const totalCount = stages.length;

  return (
    <div className="w-full max-w-lg space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">
            {status === "complete"
              ? "Analysis complete!"
              : status === "failed"
                ? "Analysis failed"
                : `Analyzing ${companyName}`}
          </h2>
          <Badge
            variant={
              status === "complete"
                ? "success"
                : status === "failed"
                  ? "destructive"
                  : "info"
            }
          >
            {status === "complete"
              ? "Done"
              : status === "failed"
                ? "Failed"
                : status === "pending"
                  ? "Starting..."
                  : "Live"}
          </Badge>
        </div>

        {status !== "failed" && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>
                {completedCount} / {totalCount} stages
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}
      </div>

      {/* Error state */}
      {status === "failed" && error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Stage groups */}
      <div className="space-y-4">
        {STAGE_GROUPS.map((group) => {
          const groupStages = group.stages
            .map((stageName) => stageMap.get(stageName))
            .filter((s): s is ProgressStage => Boolean(s));

          if (groupStages.length === 0) return null;

          const groupComplete = groupStages.every(
            (s) => s.status === "complete" || s.status === "skipped"
          );
          const groupRunning = groupStages.some((s) => s.status === "running");

          return (
            <div key={group.label}>
              <div className="mb-1.5 flex items-center gap-2 px-3">
                <p
                  className={cn(
                    "text-xs font-semibold uppercase tracking-widest",
                    groupComplete
                      ? "text-zinc-500"
                      : groupRunning
                        ? "text-violet-400"
                        : "text-zinc-600"
                  )}
                >
                  {group.label}
                </p>
                {groupComplete && (
                  <Check className="h-3 w-3 text-emerald-500" />
                )}
              </div>
              <div className="space-y-0.5">
                {groupStages.map((stage) => (
                  <StageRow key={stage.stage} stage={stage} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Connecting dots while running */}
      {(status === "pending" || status === "running") && (
        <p className="text-center text-xs text-zinc-600">
          This usually takes 60–90 seconds...
        </p>
      )}
    </div>
  );
}
