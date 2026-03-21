/**
 * ICP Assessment section — Section 2 of the FitCheck report.
 *
 * Displays:
 * - Summary card
 * - Audience segments ranked by fit score (bar chart list)
 * - ICP profiles with pain points, motivations, buying triggers, and evidence
 *
 * Owned by: report agent
 */

import { Users, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EvidenceBlock } from "./evidence-block";
import type { IcpAssessment, IcpProfile } from "@/lib/types";

// ─── Fit score badge ───────────────────────────────────────────────────────

function FitBadge({ score }: { score: number }) {
  const variant =
    score >= 80 ? "success" : score >= 60 ? "info" : "secondary";
  return (
    <Badge variant={variant} className="text-sm font-bold px-3 py-1 tabular-nums">
      {score}% fit
    </Badge>
  );
}

// ─── Segment bar ───────────────────────────────────────────────────────────

function barColor(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-violet-500";
  return "bg-zinc-500";
}

// ─── ICP profile card ──────────────────────────────────────────────────────

function ProfileCard({ profile }: { profile: IcpProfile }) {
  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h4 className="text-white font-semibold">{profile.name}</h4>
            <p className="text-zinc-400 text-sm mt-0.5">{profile.description}</p>
          </div>
          <FitBadge score={profile.fitScore} />
        </div>

        {/* Attributes grid */}
        <div className="grid sm:grid-cols-3 gap-4">
          {/* Pain points */}
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-600 font-medium mb-2">
              Pain Points
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.painPoints.map((p, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-red-950/40 border border-red-900/40 text-red-300/80 text-xs rounded"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Motivations */}
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-600 font-medium mb-2">
              Motivations
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.motivations.map((m, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-900/40 text-emerald-300/80 text-xs rounded"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Buying triggers */}
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-600 font-medium mb-2 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Buying Triggers
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.buyingTriggers.map((t, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-violet-950/40 border border-violet-900/40 text-violet-300/80 text-xs rounded"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <EvidenceBlock evidence={profile.evidence} />
      </CardContent>
    </Card>
  );
}

// ─── Main section ──────────────────────────────────────────────────────────

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
      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-zinc-300 leading-relaxed">{data.summary}</p>
        </CardContent>
      </Card>

      {/* Audience segments */}
      {sortedSegments.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-violet-400" />
            <h3 className="text-white font-semibold text-sm">
              Audience Segments
            </h3>
            <span className="text-zinc-600 text-xs">ranked by fit</span>
          </div>

          <Card>
            <div className="divide-y divide-zinc-800/60">
              {sortedSegments.map((seg, i) => (
                <div key={i} className="px-5 py-4 flex items-start gap-4">
                  <span className="text-zinc-700 text-sm font-mono w-5 flex-shrink-0 mt-0.5">
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-zinc-100 text-sm font-medium">
                        {seg.label}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-bold tabular-nums flex-shrink-0",
                          seg.fitScore >= 80
                            ? "text-emerald-400"
                            : seg.fitScore >= 60
                              ? "text-violet-400"
                              : "text-zinc-500"
                        )}
                      >
                        {seg.fitScore}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-2">
                      <div
                        className={cn("h-1.5 rounded-full transition-all duration-700", barColor(seg.fitScore))}
                        style={{ width: `${seg.fitScore}%` }}
                      />
                    </div>
                    <p className="text-zinc-500 text-xs leading-relaxed">
                      {seg.rationale}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ICP profiles */}
      {sortedProfiles.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-violet-400" />
            <h3 className="text-white font-semibold text-sm">
              Ideal Customer Profiles
            </h3>
          </div>
          <div className="space-y-4">
            {sortedProfiles.map((profile, i) => (
              <ProfileCard key={i} profile={profile} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
