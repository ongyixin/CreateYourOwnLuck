"use client";

import { useState } from "react";
import {
  MessageSquare,
  Palette,
  Users,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Target,
  ToggleLeft,
  ToggleRight,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import NeonBadge from "@/components/neon-badge";
import type {
  GtmStrategy,
  MessagingWorkstream,
  CreativeWorkstream,
  OutreachWorkstream,
  GrowthWorkstream,
} from "@/lib/types";

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface WorkstreamToggleState {
  messaging: Set<string>;
  creative: Set<string>;
  outreach: Set<string>;
  growth: Set<string>;
}

interface GtmPlanReviewProps {
  strategy: GtmStrategy;
  onApprove: (edited: GtmStrategy) => void;
  isApproving?: boolean;
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

const AGENT_META = {
  messaging: { label: "MESSAGING", color: "text-neon-cyan", border: "border-l-neon-cyan", Icon: MessageSquare },
  creative: { label: "CREATIVE ASSETS", color: "text-neon-purple", border: "border-l-neon-purple", Icon: Palette },
  outreach: { label: "OUTREACH", color: "text-neon-pink", border: "border-l-neon-pink", Icon: Users },
  growth: { label: "GROWTH EXPERIMENTS", color: "text-neon-green", border: "border-l-neon-green", Icon: FlaskConical },
} as const;

function WorkstreamCard({
  title,
  brief,
  detail,
  accentBorder,
  enabled,
  onToggle,
}: {
  title: string;
  brief: string;
  detail: string;
  accentBorder: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "terminal-card border-l-4 transition-opacity",
        accentBorder,
        !enabled && "opacity-40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h5 className="font-mono text-foreground text-sm font-bold tracking-wider leading-snug">
            {title.toUpperCase()}
          </h5>
          <p className="text-muted-foreground text-xs leading-relaxed mt-1">{brief}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title={enabled ? "Disable workstream" : "Enable workstream"}
          >
            {enabled ? (
              <ToggleRight className="h-5 w-5 text-neon-green" />
            ) : (
              <ToggleLeft className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-muted-foreground text-xs leading-relaxed">{detail}</p>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────

export function GtmPlanReview({ strategy, onApprove, isApproving }: GtmPlanReviewProps) {
  const [enabled, setEnabled] = useState<WorkstreamToggleState>({
    messaging: new Set((strategy.messagingWorkstreams ?? []).map((w) => w.id)),
    creative: new Set((strategy.creativeWorkstreams ?? []).map((w) => w.id)),
    outreach: new Set((strategy.outreachWorkstreams ?? []).map((w) => w.id)),
    growth: new Set((strategy.growthWorkstreams ?? []).map((w) => w.id)),
  });
  const [enableCreativeImageGeneration, setEnableCreativeImageGeneration] = useState(
    strategy.executionOptions?.enableCreativeImageGeneration ?? false,
  );

  function toggle(type: keyof WorkstreamToggleState, id: string) {
    setEnabled((prev) => {
      const next = new Set(prev[type]);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { ...prev, [type]: next };
    });
  }

  function buildEditedStrategy(): GtmStrategy {
    return {
      ...strategy,
      messagingWorkstreams: (strategy.messagingWorkstreams ?? []).filter((w) =>
        enabled.messaging.has(w.id),
      ),
      creativeWorkstreams: (strategy.creativeWorkstreams ?? []).filter((w) =>
        enabled.creative.has(w.id),
      ),
      outreachWorkstreams: (strategy.outreachWorkstreams ?? []).filter((w) =>
        enabled.outreach.has(w.id),
      ),
      growthWorkstreams: (strategy.growthWorkstreams ?? []).filter((w) =>
        enabled.growth.has(w.id),
      ),
      executionOptions: {
        ...strategy.executionOptions,
        enableCreativeImageGeneration: enableCreativeImageGeneration,
      },
    };
  }

  const totalEnabled =
    enabled.messaging.size +
    enabled.creative.size +
    enabled.outreach.size +
    enabled.growth.size;

  return (
    <div className="space-y-8">
      {/* Strategy summary */}
      <div className="terminal-card border-neon-amber/30">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-neon-amber" />
          <span className="font-mono text-neon-amber text-xs font-bold tracking-widest">
            STRATEGY SUMMARY
          </span>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">{strategy.summary}</p>
      </div>

      {/* Objectives */}
      {(strategy.objectives ?? []).length > 0 && (
        <div>
          <h4 className="font-mono text-neon-amber text-xs font-bold tracking-widest mb-3">
            OBJECTIVES ({strategy.objectives.length})
          </h4>
          <div className="space-y-2">
            {(strategy.objectives ?? []).map((obj, i) => (
              <div key={i} className="terminal-card border-l-4 border-l-neon-amber/60">
                <div className="flex items-start gap-2">
                  <span className="font-mono text-[10px] border border-neon-amber text-neon-amber px-1.5 py-0.5 shrink-0 mt-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-foreground text-sm font-mono font-bold leading-snug">
                      {obj.goal}
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">{obj.rationale}</p>
                    <p className="text-neon-amber text-[10px] font-mono mt-1">
                      METRIC: {obj.metric}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workstream sections */}
      {(
        [
          {
            key: "messaging" as const,
            workstreams: strategy.messagingWorkstreams ?? [],
            getDetail: (w: MessagingWorkstream) =>
              `Placements: ${w.placements.join(", ")}. Tone: ${w.toneShift}`,
          },
          {
            key: "creative" as const,
            workstreams: strategy.creativeWorkstreams ?? [],
            getDetail: (w: CreativeWorkstream) =>
              `Asset type: ${w.assetType}. Audience: ${w.targetAudience}. Key message: ${w.keyMessage}`,
          },
          {
            key: "outreach" as const,
            workstreams: strategy.outreachWorkstreams ?? [],
            getDetail: (w: OutreachWorkstream) =>
              `Target: ${w.targetType}. Channels: ${w.channels.join(", ")}`,
          },
          {
            key: "growth" as const,
            workstreams: strategy.growthWorkstreams ?? [],
            getDetail: (w: GrowthWorkstream) =>
              `${w.experimentType}: ${w.hypothesis}. Metric: ${w.metric}`,
          },
        ] as const
      ).map(({ key, workstreams, getDetail }) => {
        const meta = AGENT_META[key];
        const { Icon } = meta;
        if (workstreams.length === 0) return null;
        return (
          <div key={key}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className={cn("h-4 w-4", meta.color)} />
              <h4 className={cn("font-mono text-xs font-bold tracking-widest", meta.color)}>
                {meta.label} ({workstreams.length})
              </h4>
            </div>
            <div className="space-y-2">
              {key === "creative" && enabled.creative.size > 0 && (
                <div
                  className={cn(
                    "terminal-card border-l-4 flex items-center justify-between gap-3",
                    AGENT_META.creative.border,
                  )}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <ImageIcon className="h-4 w-4 text-neon-purple shrink-0" />
                    <div>
                      <p className="font-mono text-foreground text-sm font-bold tracking-wider">
                        IMAGE GENERATION
                      </p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Generate prototype images (posters, banners, etc.) for creative assets.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEnableCreativeImageGeneration((v) => !v)}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title={
                      enableCreativeImageGeneration ? "Disable image generation" : "Enable image generation"
                    }
                  >
                    {enableCreativeImageGeneration ? (
                      <ToggleRight className="h-5 w-5 text-neon-green" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </button>
                </div>
              )}
              {workstreams.map((w) => (
                <WorkstreamCard
                  key={w.id}
                  title={w.title}
                  brief={w.brief}
                  detail={getDetail(w as never)}
                  accentBorder={meta.border}
                  enabled={enabled[key].has(w.id)}
                  onToggle={() => toggle(key, w.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Approve button */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <p className="text-muted-foreground text-xs font-mono">
          {totalEnabled} workstream{totalEnabled !== 1 ? "s" : ""} selected
        </p>
        <button
          onClick={() => onApprove(buildEditedStrategy())}
          disabled={isApproving || totalEnabled === 0}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded font-mono text-sm font-bold tracking-wider transition-all",
            "bg-neon-amber/10 border border-neon-amber text-neon-amber",
            "hover:bg-neon-amber/20 hover:glow-amber",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          {isApproving ? "APPROVING..." : "APPROVE & EXECUTE PLAN"}
        </button>
      </div>
    </div>
  );
}
