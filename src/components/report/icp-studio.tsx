/**
 * ICP Studio section — Section 5 of the FitCheck report.
 *
 * Displays 2–3 AI-generated personas grounded in real web evidence.
 * Each persona card shows:
 * - Initials avatar (colored by position)
 * - Name, title, age
 * - Psychographics (tags)
 * - Pain points + buying triggers
 * - Simulated 5-second reaction (sentiment-colored card)
 * - Messaging gaps / pain-point mismatches
 * - Evidence blocks
 *
 * Owned by: report agent
 */

import { Brain, Zap, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { EvidenceBlock } from "./evidence-block";
import type { IcpStudio, Persona } from "@/lib/types";

// ─── Avatar colors (cycle through for up to 3 personas) ───────────────────

const AVATAR_COLORS = [
  "bg-violet-600",
  "bg-emerald-600",
  "bg-blue-600",
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Sentiment config ──────────────────────────────────────────────────────

const SENTIMENT: Record<
  Persona["fiveSecondReaction"]["sentiment"],
  { label: string; badgeClass: string; cardClass: string }
> = {
  positive: {
    label: "😊 Positive",
    badgeClass: "bg-emerald-950/60 border-emerald-700/50 text-emerald-400",
    cardClass: "bg-emerald-950/20 border-emerald-900/30",
  },
  neutral: {
    label: "😐 Neutral",
    badgeClass: "bg-zinc-800 border-zinc-700 text-zinc-400",
    cardClass: "bg-zinc-800/30 border-zinc-700/40",
  },
  confused: {
    label: "😕 Confused",
    badgeClass: "bg-amber-950/60 border-amber-700/50 text-amber-400",
    cardClass: "bg-amber-950/20 border-amber-900/30",
  },
  negative: {
    label: "😟 Negative",
    badgeClass: "bg-red-950/60 border-red-700/50 text-red-400",
    cardClass: "bg-red-950/20 border-red-900/30",
  },
};

// ─── Persona card ──────────────────────────────────────────────────────────

function PersonaCard({
  persona,
  index,
}: {
  persona: Persona;
  index: number;
}) {
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const reaction = persona.fiveSecondReaction;
  const sentiment = SENTIMENT[reaction.sentiment];

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="px-5 py-5 border-b border-zinc-800/60 flex items-start gap-4">
        <div
          className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0",
            avatarColor
          )}
          aria-hidden
        >
          {getInitials(persona.name)}
        </div>
        <div className="min-w-0">
          <h3 className="text-white font-semibold">{persona.name}</h3>
          <p className="text-zinc-400 text-sm">{persona.title}</p>
          {persona.age && (
            <span className="text-zinc-600 text-xs">Age {persona.age}</span>
          )}
        </div>
      </div>

      <CardContent className="pt-5 space-y-5">
        {/* Psychographics */}
        {persona.psychographics.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-600 font-medium mb-2 flex items-center gap-1">
              <Brain className="h-3 w-3" />
              Psychographics
            </p>
            <div className="flex flex-wrap gap-1.5">
              {persona.psychographics.map((pg, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded"
                >
                  {pg}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pain points + buying triggers */}
        <div className="grid sm:grid-cols-2 gap-4">
          {persona.painPoints.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-600 font-medium mb-2">
                Pain Points
              </p>
              <ul className="space-y-1.5">
                {persona.painPoints.map((p, i) => (
                  <li
                    key={i}
                    className="text-zinc-300 text-sm flex items-start gap-2"
                  >
                    <span className="text-red-400 mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {persona.buyingTriggers.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-600 font-medium mb-2 flex items-center gap-1">
                <Zap className="h-3 w-3 text-violet-400" />
                Buying Triggers
              </p>
              <ul className="space-y-1.5">
                {persona.buyingTriggers.map((t, i) => (
                  <li
                    key={i}
                    className="text-zinc-300 text-sm flex items-start gap-2"
                  >
                    <span className="text-violet-400 text-xs mt-0.5 flex-shrink-0">
                      ⚡
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 5-second reaction */}
        <div
          className={cn(
            "rounded-lg border overflow-hidden",
            sentiment.cardClass
          )}
        >
          <div className="px-4 py-2.5 border-b border-zinc-800/40 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              5-Second Reaction
            </span>
            <span
              className={cn(
                "px-2 py-0.5 text-xs border rounded font-medium",
                sentiment.badgeClass
              )}
            >
              {sentiment.label}
            </span>
          </div>
          <div className="px-4 py-3 space-y-2">
            <p className="text-zinc-200 text-sm italic leading-relaxed">
              &ldquo;{reaction.reaction}&rdquo;
            </p>
            <div className="space-y-1 text-xs text-zinc-500">
              <p>
                <span className="text-zinc-400 font-medium">First saw: </span>
                {reaction.firstImpression}
              </p>
              <p>
                <span className="text-zinc-400 font-medium">Would: </span>
                <span className="text-violet-300">{reaction.likelyAction}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Messaging gaps */}
        {persona.painPointGaps.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-600 font-medium mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-400" />
              Messaging Gaps
            </p>
            <ul className="space-y-1.5">
              {persona.painPointGaps.map((gap, i) => (
                <li
                  key={i}
                  className="text-amber-300/70 text-sm flex items-start gap-2"
                >
                  <span className="flex-shrink-0 text-amber-500/60 mt-0.5">
                    →
                  </span>
                  {gap}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Evidence */}
        <EvidenceBlock evidence={persona.evidence} />
      </CardContent>
    </Card>
  );
}

// ─── Main section ──────────────────────────────────────────────────────────

interface IcpStudioSectionProps {
  data: IcpStudio;
}

export function IcpStudioSection({ data }: IcpStudioSectionProps) {
  const personas = data.personas ?? [];

  if (personas.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-600">
        <Brain className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No personas generated for this report.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Explainer */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-zinc-400 text-sm leading-relaxed">
            These are AI-generated personas grounded in real web data about your
            market. Use them to simulate how different customer types would react
            to your messaging, and to identify gaps between your current brand
            and what your customers actually care about.
          </p>
        </CardContent>
      </Card>

      {/* Persona cards */}
      <div className="space-y-6">
        {personas.map((persona, i) => (
          <PersonaCard key={persona.id} persona={persona} index={i} />
        ))}
      </div>
    </div>
  );
}
