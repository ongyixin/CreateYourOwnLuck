/**
 * Brand Perception section — Section 1 of the FitCheck report.
 *
 * Displays:
 * - Summary card with tone badges and consistency score gauge
 * - Perceived strengths (two-column grid)
 * - Weak / confusing signals (two-column grid)
 * - Evidence blocks anchoring each insight to real web data
 *
 * Owned by: report agent
 */

import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EvidenceBlock } from "./evidence-block";
import type { BrandPerception, BrandInsight } from "@/lib/types";

// ─── Consistency score helpers ─────────────────────────────────────────────

function scoreLabel(score: number): string {
  if (score >= 75) return "Strong consistency across channels";
  if (score >= 50) return "Some inconsistencies detected";
  return "Significant inconsistencies — needs attention";
}

function scoreBarColor(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function scoreTextColor(score: number): string {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

// ─── Insight card ──────────────────────────────────────────────────────────

function InsightCard({
  insight,
  accentClass,
}: {
  insight: BrandInsight;
  accentClass: string;
}) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-lg p-4 border-l-2",
        accentClass
      )}
    >
      <h4 className="text-sm font-semibold text-zinc-100 mb-1.5">
        {insight.title}
      </h4>
      <p className="text-sm text-zinc-400 leading-relaxed">
        {insight.description}
      </p>
      <EvidenceBlock evidence={insight.evidence} />
    </div>
  );
}

// ─── Main section ──────────────────────────────────────────────────────────

interface BrandPerceptionSectionProps {
  data: BrandPerception;
}

export function BrandPerceptionSection({ data }: BrandPerceptionSectionProps) {
  const score = data.consistencyScore ?? 0;

  return (
    <div className="space-y-8">
      {/* Hero summary card */}
      <Card>
        <CardContent className="pt-6 space-y-5">
          {/* Summary */}
          <p className="text-zinc-300 leading-relaxed">{data.summary}</p>

          {/* Tone badges */}
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-600 mb-2 font-medium">
              Tone &amp; Identity
            </p>
            <div className="flex flex-wrap gap-2">
              {data.toneAndIdentity.map((tone, i) => (
                <Badge key={i} variant="secondary" className="rounded-full font-medium">
                  {tone}
                </Badge>
              ))}
              {data.toneAndIdentity.length === 0 && (
                <span className="text-zinc-600 text-sm italic">
                  No tone signals identified
                </span>
              )}
            </div>
          </div>

          {/* Consistency score */}
          <div>
            <div className="flex items-end justify-between mb-2">
              <p className="text-xs uppercase tracking-wider text-zinc-600 font-medium">
                Consistency Score
              </p>
              <span className={cn("text-3xl font-bold leading-none tabular-nums", scoreTextColor(score))}>
                {score}
                <span className="text-sm font-normal text-zinc-600 ml-0.5">
                  /100
                </span>
              </span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
              <div
                className={cn(
                  "h-2.5 rounded-full transition-all duration-1000",
                  scoreBarColor(score)
                )}
                style={{ width: `${score}%` }}
              />
            </div>
            <p className="text-zinc-600 text-xs mt-1.5">{scoreLabel(score)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Strengths + Weak signals */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <h3 className="text-white font-semibold text-sm">
              Perceived Strengths
            </h3>
            <span className="text-zinc-600 text-xs">
              ({data.perceivedStrengths.length})
            </span>
          </div>
          <div className="space-y-3">
            {data.perceivedStrengths.map((insight, i) => (
              <InsightCard
                key={i}
                insight={insight}
                accentClass="border-l-emerald-600"
              />
            ))}
            {data.perceivedStrengths.length === 0 && (
              <p className="text-zinc-600 text-sm italic">
                No strengths identified.
              </p>
            )}
          </div>
        </div>

        {/* Weak signals */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <h3 className="text-white font-semibold text-sm">
              Weak or Confusing Signals
            </h3>
            <span className="text-zinc-600 text-xs">
              ({data.weakOrConfusingSignals.length})
            </span>
          </div>
          <div className="space-y-3">
            {data.weakOrConfusingSignals.map((insight, i) => (
              <InsightCard
                key={i}
                insight={insight}
                accentClass="border-l-amber-600"
              />
            ))}
            {data.weakOrConfusingSignals.length === 0 && (
              <p className="text-zinc-600 text-sm italic">
                No weak signals identified.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
