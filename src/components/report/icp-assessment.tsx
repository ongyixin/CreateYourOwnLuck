"use client";

import { Users, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import NeonBadge from "@/components/neon-badge";
import CountUp from "@/components/count-up";
import { EvidenceBlock } from "./evidence-block";
import type { IcpAssessment, IcpProfile } from "@/lib/types";

function scoreColor(score: number) {
  if (score >= 80) return "text-neon-green";
  if (score >= 60) return "text-neon-cyan";
  return "text-neon-amber";
}

function barBg(score: number): string {
  if (score >= 80) return "hsl(153 100% 50%)";
  if (score >= 60) return "hsl(185 100% 55%)";
  return "hsl(45 100% 55%)";
}

function ProfileCard({ profile, index }: { profile: IcpProfile; index: number }) {
  const borderColors = ["border-neon-green", "border-neon-cyan", "border-neon-pink"];
  const avatarColors = ["bg-neon-green", "bg-neon-cyan", "bg-neon-pink"];

  return (
    <div className={cn("terminal-card", borderColors[index % 3])}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-sm flex items-center justify-center font-mono font-bold text-sm text-primary-foreground", avatarColors[index % 3])}>
            {profile.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h4 className="font-mono text-foreground font-bold text-sm tracking-wider">{profile.name.toUpperCase()}</h4>
            <p className="text-muted-foreground text-xs">{profile.description}</p>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className={cn("font-mono text-2xl font-bold", scoreColor(profile.fitScore))}>
            <CountUp end={profile.fitScore} suffix="%" />
          </div>
          <div className="font-mono text-[10px] text-muted-foreground tracking-widest">FIT</div>
        </div>
      </div>

      {/* Score bar */}
      <div className="mb-4">
        <div className="flex-1 h-2 bg-secondary rounded-sm overflow-hidden">
          <div
            className="h-full rounded-sm transition-all duration-700"
            style={{ width: `${profile.fitScore}%`, background: barBg(profile.fitScore) }}
          />
        </div>
      </div>

      {/* Attributes */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <div className="font-mono text-[10px] text-neon-pink tracking-widest mb-2">PAIN POINTS</div>
          <div className="flex flex-wrap gap-1.5">
            {profile.painPoints.map((p, i) => (
              <NeonBadge key={i} variant="pink">{p}</NeonBadge>
            ))}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] text-neon-green tracking-widest mb-2">MOTIVATIONS</div>
          <div className="flex flex-wrap gap-1.5">
            {profile.motivations.map((m, i) => (
              <NeonBadge key={i} variant="green">{m}</NeonBadge>
            ))}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] text-neon-cyan tracking-widest mb-2 flex items-center gap-1">
            <Zap className="h-3 w-3" /> BUYING TRIGGERS
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.buyingTriggers.map((t, i) => (
              <NeonBadge key={i} variant="cyan">{t}</NeonBadge>
            ))}
          </div>
        </div>
      </div>

      <EvidenceBlock evidence={profile.evidence} />
    </div>
  );
}

interface IcpAssessmentSectionProps {
  data: IcpAssessment;
}

export function IcpAssessmentSection({ data }: IcpAssessmentSectionProps) {
  const sortedSegments = [...(data.audienceSegments ?? [])].sort(
    (a, b) => b.fitScore - a.fitScore
  );
  const sortedProfiles = [...(data.profiles ?? [])].sort(
    (a, b) => b.fitScore - a.fitScore
  );

  return (
    <div className="space-y-8">
      {/* Module header */}
      <div>
        <div className="module-header text-neon-cyan">Module 02</div>
        <h2 className="font-mono text-neon-cyan text-xl font-bold tracking-wider">ICP ASSESSMENT</h2>
      </div>

      {/* Summary */}
      <div className="terminal-card border-border">
        <p className="text-foreground text-sm leading-relaxed">{data.summary}</p>
      </div>

      {/* Audience segments */}
      {sortedSegments.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-neon-cyan" />
            <h3 className="font-mono text-neon-cyan text-sm font-bold tracking-wider">AUDIENCE SEGMENTS</h3>
            <span className="font-mono text-[10px] text-muted-foreground">RANKED BY FIT</span>
          </div>

          <div className="terminal-card border-border">
            <div className="divide-y divide-border">
              {sortedSegments.map((seg, i) => (
                <div key={i} className="py-4 first:pt-0 last:pb-0 flex items-start gap-4">
                  <span className="font-mono text-muted-foreground text-sm w-5 flex-shrink-0 mt-0.5">
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-foreground font-mono text-sm font-bold tracking-wider">
                        {seg.label.toUpperCase()}
                      </span>
                      <span className={cn("font-mono text-sm font-bold", scoreColor(seg.fitScore))}>
                        <CountUp end={seg.fitScore} suffix="%" />
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-sm h-1.5 mb-2">
                      <div
                        className="h-1.5 rounded-sm transition-all duration-700"
                        style={{ width: `${seg.fitScore}%`, background: barBg(seg.fitScore) }}
                      />
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {seg.rationale}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ICP profiles */}
      {sortedProfiles.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-neon-green" />
            <h3 className="font-mono text-neon-green text-sm font-bold tracking-wider">
              IDEAL CUSTOMER PROFILES
            </h3>
          </div>
          <div className="space-y-4">
            {sortedProfiles.map((profile, i) => (
              <ProfileCard key={i} profile={profile} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
