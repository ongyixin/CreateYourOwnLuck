/**
 * Actionables section — Section 3 of the FitCheck report.
 *
 * Displays:
 * - What to Improve (amber)
 * - What to Change (red)
 * - What to Lean Into (emerald)
 * - Messaging Angles
 * - Copy Suggestions (before/after cards)
 *
 * Owned by: report agent
 */

import {
  TrendingUp,
  RefreshCw,
  Rocket,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EvidenceBlock } from "./evidence-block";
import type { Actionables, Actionable } from "@/lib/types";

// ─── Priority badge ────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: Actionable["priority"] }) {
  return (
    <Badge
      variant={
        priority === "high"
          ? "destructive"
          : priority === "medium"
            ? "warning"
            : "secondary"
      }
      className="flex-shrink-0"
    >
      {priority}
    </Badge>
  );
}

// ─── Actionable card ───────────────────────────────────────────────────────

function ActionableCard({
  item,
  accentClass,
}: {
  item: Actionable;
  accentClass: string;
}) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-lg p-4 border-l-2",
        accentClass
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="text-zinc-100 text-sm font-semibold leading-snug">
          {item.title}
        </h4>
        <PriorityBadge priority={item.priority} />
      </div>
      <p className="text-zinc-400 text-sm leading-relaxed">{item.description}</p>
      <EvidenceBlock evidence={item.evidence} />
    </div>
  );
}

// ─── Section group header ──────────────────────────────────────────────────

function SectionHead({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h3 className="text-white font-semibold text-sm">{label}</h3>
      <span className="text-zinc-600 text-xs">({count})</span>
    </div>
  );
}

// ─── Main section ──────────────────────────────────────────────────────────

interface ActionablesSectionProps {
  data: Actionables;
}

export function ActionablesSection({ data }: ActionablesSectionProps) {
  // Sort each group high → medium → low
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
      {/* What to Improve */}
      {improve.length > 0 && (
        <div>
          <SectionHead
            icon={<TrendingUp className="h-4 w-4 text-amber-400" />}
            label="What to Improve"
            count={improve.length}
          />
          <div className="space-y-3">
            {improve.map((item, i) => (
              <ActionableCard key={i} item={item} accentClass="border-l-amber-600" />
            ))}
          </div>
        </div>
      )}

      {/* What to Change */}
      {change.length > 0 && (
        <div>
          <SectionHead
            icon={<RefreshCw className="h-4 w-4 text-red-400" />}
            label="What to Change"
            count={change.length}
          />
          <div className="space-y-3">
            {change.map((item, i) => (
              <ActionableCard key={i} item={item} accentClass="border-l-red-600" />
            ))}
          </div>
        </div>
      )}

      {/* What to Lean Into */}
      {lean.length > 0 && (
        <div>
          <SectionHead
            icon={<Rocket className="h-4 w-4 text-emerald-400" />}
            label="What to Lean Into"
            count={lean.length}
          />
          <div className="space-y-3">
            {lean.map((item, i) => (
              <ActionableCard key={i} item={item} accentClass="border-l-emerald-600" />
            ))}
          </div>
        </div>
      )}

      {/* Messaging Angles */}
      {angles.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-4 w-4 text-violet-400" />
            <h3 className="text-white font-semibold text-sm">
              Recommended Messaging Angles
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {angles.map((angle, i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4 space-y-2">
                  <p className="text-violet-300 text-sm font-semibold leading-snug">
                    &ldquo;{angle.angle}&rdquo;
                  </p>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    {angle.rationale}
                  </p>
                  {angle.exampleHeadline && (
                    <div className="mt-2 bg-zinc-800/60 rounded px-3 py-2">
                      <p className="text-zinc-200 text-xs font-medium">
                        {angle.exampleHeadline}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Copy Suggestions */}
      {copy.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ArrowRight className="h-4 w-4 text-violet-400" />
            <h3 className="text-white font-semibold text-sm">Copy Suggestions</h3>
          </div>
          <div className="space-y-4">
            {copy.map((s, i) => (
              <Card key={i} className="overflow-hidden">
                {/* Placement label */}
                <div className="px-4 py-2 bg-zinc-800/40 border-b border-zinc-800/60">
                  <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wide">
                    {s.placement}
                  </span>
                </div>
                <CardContent className="pt-4 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {/* Before */}
                    <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-3">
                      <p className="text-red-400/60 text-xs uppercase tracking-wider mb-1.5 font-medium">
                        Before
                      </p>
                      <p className="text-zinc-300 text-sm leading-relaxed">
                        {s.before}
                      </p>
                    </div>
                    {/* After */}
                    <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-3">
                      <p className="text-emerald-400/60 text-xs uppercase tracking-wider mb-1.5 font-medium">
                        After
                      </p>
                      <p className="text-zinc-300 text-sm leading-relaxed">
                        {s.after}
                      </p>
                    </div>
                  </div>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    {s.rationale}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
