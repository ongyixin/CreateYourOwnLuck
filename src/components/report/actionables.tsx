"use client";

import {
  TrendingUp,
  RefreshCw,
  Rocket,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import NeonBadge from "@/components/neon-badge";
import { EvidenceBlock } from "./evidence-block";
import type { Actionables, Actionable } from "@/lib/types";

function PriorityBadge({ priority }: { priority: Actionable["priority"] }) {
  const variant = priority === "high" ? "pink" : priority === "medium" ? "amber" : "cyan";
  return <NeonBadge variant={variant}>{priority.toUpperCase()}</NeonBadge>;
}

function ActionableCard({
  item,
  accentClass,
}: {
  item: Actionable;
  accentClass: string;
}) {
  return (
    <div className={cn("terminal-card border-l-4", accentClass)}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-mono text-foreground text-sm font-bold leading-snug tracking-wider">
          {item.title.toUpperCase()}
        </h4>
        <PriorityBadge priority={item.priority} />
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
      <EvidenceBlock evidence={item.evidence} />
    </div>
  );
}

function SectionHead({
  icon,
  label,
  count,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h3 className={cn("font-mono text-sm font-bold tracking-wider", color)}>{label}</h3>
      <span className="font-mono text-[10px] text-muted-foreground">({count})</span>
    </div>
  );
}

interface ActionablesSectionProps {
  data: Actionables;
}

export function ActionablesSection({ data }: ActionablesSectionProps) {
  const order = { high: 0, medium: 1, low: 2 };
  const sorted = <T extends Actionable>(arr: T[]) =>
    [...arr].sort((a, b) => order[a.priority] - order[b.priority]);

  const improve = sorted(data.whatToImprove ?? []);
  const change = sorted(data.whatToChange ?? []);
  const lean = sorted(data.whatToLeanInto ?? []);
  const angles = data.messagingAngles ?? [];
  const copy = data.copySuggestions ?? [];

  return (
    <div className="space-y-10">
      {/* Module header */}
      <div>
        <div className="module-header text-neon-amber">Module 03</div>
        <h2 className="font-mono text-neon-amber text-xl font-bold tracking-wider">RECOMMENDATIONS</h2>
      </div>

      {/* What to Improve */}
      {improve.length > 0 && (
        <div>
          <SectionHead
            icon={<TrendingUp className="h-4 w-4 text-neon-amber" />}
            label="WHAT TO IMPROVE"
            count={improve.length}
            color="text-neon-amber"
          />
          <div className="space-y-3">
            {improve.map((item, i) => (
              <ActionableCard key={i} item={item} accentClass="border-l-neon-amber" />
            ))}
          </div>
        </div>
      )}

      {/* What to Change */}
      {change.length > 0 && (
        <div>
          <SectionHead
            icon={<RefreshCw className="h-4 w-4 text-neon-pink" />}
            label="WHAT TO CHANGE"
            count={change.length}
            color="text-neon-pink"
          />
          <div className="space-y-3">
            {change.map((item, i) => (
              <ActionableCard key={i} item={item} accentClass="border-l-neon-pink" />
            ))}
          </div>
        </div>
      )}

      {/* What to Lean Into */}
      {lean.length > 0 && (
        <div>
          <SectionHead
            icon={<Rocket className="h-4 w-4 text-neon-green" />}
            label="WHAT TO LEAN INTO"
            count={lean.length}
            color="text-neon-green"
          />
          <div className="space-y-3">
            {lean.map((item, i) => (
              <ActionableCard key={i} item={item} accentClass="border-l-neon-green" />
            ))}
          </div>
        </div>
      )}

      {/* Messaging Angles */}
      {angles.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-4 w-4 text-neon-purple" />
            <h3 className="font-mono text-neon-purple text-sm font-bold tracking-wider">
              MESSAGING ANGLES
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {angles.map((angle, i) => (
              <div key={i} className="terminal-card border-neon-purple/30 hover:glow-purple">
                <p className="text-neon-purple font-mono text-sm font-bold leading-snug mb-2">
                  &ldquo;{angle.angle}&rdquo;
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {angle.rationale}
                </p>
                {angle.exampleHeadline && (
                  <div className="mt-2 bg-secondary rounded-sm px-3 py-2">
                    <p className="text-foreground text-xs font-mono">
                      {angle.exampleHeadline}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Copy Suggestions */}
      {copy.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ArrowRight className="h-4 w-4 text-neon-cyan" />
            <h3 className="font-mono text-neon-cyan text-sm font-bold tracking-wider">COPY SUGGESTIONS</h3>
          </div>
          <div className="space-y-4">
            {copy.map((s, i) => (
              <div key={i} className="terminal-card border-border">
                <div className="font-mono text-[10px] text-neon-cyan tracking-widest mb-3">
                  {s.placement.toUpperCase()}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-secondary rounded-sm border border-neon-pink/20">
                    <div className="font-mono text-[10px] text-neon-pink tracking-widest mb-1">✕ BEFORE</div>
                    <p className="text-[12px] text-muted-foreground italic">{s.before}</p>
                  </div>
                  <div className="p-3 bg-secondary rounded-sm border border-neon-green/30">
                    <div className="font-mono text-[10px] text-neon-green tracking-widest mb-1">✓ AFTER</div>
                    <p className="text-[12px] text-foreground">{s.after}</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed mt-3">
                  {s.rationale}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
