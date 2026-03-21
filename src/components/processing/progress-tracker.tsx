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
import NeonBadge from "@/components/neon-badge";
import CountUp from "@/components/count-up";
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

const STAGE_GROUPS: { label: string; stages: PipelineStage[]; color: string }[] = [
  {
    label: "DATA COLLECTION",
    color: "text-neon-green",
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
    label: "AI ANALYSIS",
    color: "text-neon-cyan",
    stages: [
      "analyze_brand",
      "analyze_icp",
      "analyze_actionables",
      "analyze_leads",
      "analyze_personas",
    ],
  },
  {
    label: "REPORT",
    color: "text-neon-amber",
    stages: ["build_report"],
  },
];

function StageStatusIcon({ status }: { status: StageStatus }) {
  if (status === "running") {
    return <Loader2 className="h-4 w-4 animate-spin text-neon-cyan" />;
  }
  if (status === "complete") {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-neon-green/20">
        <Check className="h-3 w-3 text-neon-green" />
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-neon-pink/20">
        <X className="h-3 w-3 text-neon-pink" />
      </div>
    );
  }
  if (status === "skipped") {
    return <SkipForward className="h-4 w-4 text-muted-foreground" />;
  }
  return <div className="h-2 w-2 rounded-full bg-border" />;
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
        "flex items-start gap-3 rounded-sm px-3 py-2.5 transition-all",
        isRunning && "bg-neon-cyan/5 ring-1 ring-neon-cyan/20",
        isFailed && "bg-neon-pink/5"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm",
          isRunning && "bg-neon-cyan/20",
          isComplete && "bg-neon-green/10",
          isFailed && "bg-neon-pink/10",
          isPending && "bg-secondary",
          stage.status === "skipped" && "bg-secondary/50"
        )}
      >
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            isRunning && "text-neon-cyan",
            isComplete && "text-neon-green",
            isFailed && "text-neon-pink",
            isPending && "text-muted-foreground",
            stage.status === "skipped" && "text-muted-foreground/50"
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-mono leading-snug",
            isRunning && "font-medium text-foreground",
            isComplete && "text-muted-foreground",
            isFailed && "text-neon-pink",
            isPending && "text-muted-foreground/50",
            stage.status === "skipped" && "text-muted-foreground/30 line-through"
          )}
        >
          {stage.label}
        </p>
        {stage.message && (
          <p className="mt-0.5 text-xs text-muted-foreground">{stage.message}</p>
        )}
      </div>

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
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-lg font-bold text-foreground tracking-wider">
            {status === "complete"
              ? "ANALYSIS COMPLETE"
              : status === "failed"
                ? "ANALYSIS FAILED"
                : `ANALYZING ${companyName.toUpperCase()}`}
          </h2>
          <NeonBadge
            variant={
              status === "complete"
                ? "green"
                : status === "failed"
                  ? "pink"
                  : "cyan"
            }
          >
            {status === "complete"
              ? "DONE"
              : status === "failed"
                ? "FAILED"
                : status === "pending"
                  ? "STARTING"
                  : "LIVE"}
          </NeonBadge>
        </div>

        {status !== "failed" && (
          <div className="space-y-1">
            <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground tracking-widest">
              <span>
                {completedCount} / {totalCount} STAGES
              </span>
              <span className="text-neon-green">
                <CountUp end={progress} suffix="%" />
              </span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}
      </div>

      {/* Error state */}
      {status === "failed" && error && (
        <div className="terminal-card border-neon-pink">
          <p className="text-sm text-neon-pink font-mono">{error}</p>
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
                    "font-mono text-[10px] font-bold uppercase tracking-widest",
                    groupComplete
                      ? "text-neon-green"
                      : groupRunning
                        ? group.color
                        : "text-muted-foreground"
                  )}
                >
                  {group.label}
                </p>
                {groupComplete && (
                  <Check className="h-3 w-3 text-neon-green" />
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

      {(status === "pending" || status === "running") && (
        <p className="text-center font-mono text-[10px] text-muted-foreground tracking-widest">
          THIS USUALLY TAKES 60–90 SECONDS...
        </p>
      )}
    </div>
  );
}
