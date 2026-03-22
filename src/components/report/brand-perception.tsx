"use client";

import { CheckCircle2, AlertCircle, Target, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import NeonBadge from "@/components/neon-badge";
import CountUp from "@/components/count-up";
import { EvidenceBlock } from "./evidence-block";
import { ResonanceHotspot } from "./resonance-hotspot";
import type { BrandPerception, BrandInsight, BrandResonanceMap } from "@/lib/types";

function scoreColor(score: number): string {
  if (score >= 75) return "text-neon-green";
  if (score >= 50) return "text-neon-amber";
  return "text-neon-pink";
}

function scoreBarBg(score: number): string {
  if (score >= 75) return "bg-neon-green";
  if (score >= 50) return "bg-neon-amber";
  return "bg-neon-pink";
}

function scoreLabel(score: number): string {
  if (score >= 75) return "Strong consistency across channels";
  if (score >= 50) return "Some inconsistencies detected";
  return "Significant inconsistencies — needs attention";
}

function InsightCard({
  insight,
  accentBorder,
  bulletColor,
}: {
  insight: BrandInsight;
  accentBorder: string;
  bulletColor: string;
}) {
  return (
    <div
      className={cn(
        "terminal-card border-l-4",
        accentBorder
      )}
    >
      <h4 className="font-mono text-sm font-bold text-foreground mb-1.5 tracking-wider">
        {insight.title.toUpperCase()}
      </h4>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {insight.description}
      </p>
      <EvidenceBlock evidence={insight.evidence} />
    </div>
  );
}

interface BrandPerceptionSectionProps {
  data: BrandPerception;
  resonanceMap?: BrandResonanceMap;
}

export function BrandPerceptionSection({ data, resonanceMap }: BrandPerceptionSectionProps) {
  const score = data.consistencyScore ?? 0;

  return (
    <div className="space-y-8">
      {/* Module header */}
      <div>
        <div className="module-header text-neon-green">Module 01</div>
        <h2 className="font-mono text-neon-green text-xl font-bold tracking-wider">BRAND SNAPSHOT</h2>
      </div>

      {/* Summary card */}
      <div className="terminal-card border-border hover:glow-green">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex-1 space-y-4">
            <p className="text-foreground text-sm leading-relaxed">{data.summary}</p>

            {/* Tone badges */}
            <div>
              <div className="font-mono text-[10px] text-neon-cyan tracking-widest mb-2">TONE & IDENTITY</div>
              <div className="flex flex-wrap gap-2">
                {data.toneAndIdentity.map((tone, i) => (
                  <NeonBadge key={i} variant={i % 3 === 0 ? "cyan" : i % 3 === 1 ? "green" : "purple"}>
                    {tone}
                  </NeonBadge>
                ))}
                {data.toneAndIdentity.length === 0 && (
                  <span className="text-muted-foreground text-sm italic">
                    No tone signals identified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center justify-center min-w-[140px] p-4 border-2 border-neon-green/30 rounded-sm">
            <div className="font-mono text-[10px] text-muted-foreground mb-1 tracking-widest">BRAND CLARITY</div>
            <div className={cn("text-5xl font-mono font-bold count-glow", scoreColor(score))}>
              <CountUp end={score} />
            </div>
            <div className="font-mono text-xs text-muted-foreground">/100</div>
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-6">
          <div className="w-full bg-secondary rounded-sm h-2.5 overflow-hidden">
            <div
              className={cn("h-2.5 rounded-sm transition-all duration-1000", scoreBarBg(score))}
              style={{ width: `${score}%` }}
            />
          </div>
          <p className="font-mono text-[10px] text-muted-foreground mt-1.5 tracking-wider">{scoreLabel(score).toUpperCase()}</p>
        </div>
      </div>

      {/* Strengths + Weak signals */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-neon-green" />
            <h3 className="font-mono text-neon-green text-sm font-bold tracking-wider">
              PERCEIVED STRENGTHS
            </h3>
            <span className="font-mono text-[10px] text-muted-foreground">
              ({data.perceivedStrengths.length})
            </span>
          </div>
          <div className="space-y-3">
            {data.perceivedStrengths.map((insight, i) => (
              <InsightCard
                key={i}
                insight={insight}
                accentBorder="border-l-neon-green"
                bulletColor="text-neon-green"
              />
            ))}
            {data.perceivedStrengths.length === 0 && (
              <p className="text-muted-foreground text-sm italic font-mono">
                No strengths identified.
              </p>
            )}
          </div>
        </div>

        {/* Weak signals */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-neon-amber" />
            <h3 className="font-mono text-neon-amber text-sm font-bold tracking-wider">
              GAPS DETECTED
            </h3>
            <span className="font-mono text-[10px] text-muted-foreground">
              ({data.weakOrConfusingSignals.length})
            </span>
          </div>
          <div className="space-y-3">
            {data.weakOrConfusingSignals.map((insight, i) => (
              <InsightCard
                key={i}
                insight={insight}
                accentBorder="border-l-neon-amber"
                bulletColor="text-neon-amber"
              />
            ))}
            {data.weakOrConfusingSignals.length === 0 && (
              <p className="text-muted-foreground text-sm italic font-mono">
                No weak signals identified.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Resonance hotspot map */}
      {resonanceMap && resonanceMap.themes.length > 0 && (
        <ResonanceHotspot data={resonanceMap} />
      )}
    </div>
  );
}
