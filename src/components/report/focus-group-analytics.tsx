"use client";

import { PaywallGate } from "@/components/paywall-gate";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  ChevronRight,
} from "lucide-react";
import CountUp from "@/components/count-up";
import NeonBadge from "@/components/neon-badge";
import type { FocusGroupAnalytics, Persona } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS_HEX_DARK = [
  "#00ff80",   // neon-green
  "#ff4da6",   // neon-pink
  "#00e5ff",   // neon-cyan
  "#ffd740",   // neon-amber
  "#bf80ff",   // neon-purple
];

function pmfColor(score: number): string {
  if (score >= 70) return "text-neon-green";
  if (score >= 45) return "text-neon-amber";
  return "text-neon-pink";
}

function pmfLabel(score: number): string {
  if (score >= 70) return "STRONG SIGNAL";
  if (score >= 50) return "MODERATE SIGNAL";
  if (score >= 30) return "WEAK SIGNAL";
  return "LOW PMF";
}

function pmfBadgeVariant(score: number): "green" | "amber" | "pink" {
  if (score >= 70) return "green";
  if (score >= 45) return "amber";
  return "pink";
}

// ─── Custom tooltip for recharts ──────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-sm px-3 py-2 font-mono text-xs">
      <p className="text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-neon-cyan">
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── PMF Score Card ───────────────────────────────────────────────────────────

function PmfScoreCard({ score }: { score: number }) {
  const colorClass = pmfColor(score);
  const label = pmfLabel(score);
  const variant = pmfBadgeVariant(score);

  return (
    <div className="terminal-card border-border text-center">
      <div className="font-mono text-[10px] text-muted-foreground tracking-widest mb-2 flex items-center justify-center gap-1">
        <Target className="h-3 w-3" /> MARKET-WEIGHTED PMF SCORE
      </div>
      <div className={`font-mono text-6xl font-bold tabular-nums mb-1 ${colorClass}`}>
        <CountUp end={score} duration={1800} />
        <span className="text-3xl text-muted-foreground">/100</span>
      </div>
      <NeonBadge variant={variant}>{label}</NeonBadge>
      <p className="text-muted-foreground text-xs mt-3 font-mono leading-relaxed max-w-xs mx-auto">
        Conversion likelihood × market weight, summed across all personas. Treat as directional signal.
      </p>
    </div>
  );
}

// ─── Persona Conversion Table ─────────────────────────────────────────────────

function PersonaConversionTable({
  personaScores,
  personas,
}: {
  personaScores: FocusGroupAnalytics["personaScores"];
  personas: Persona[];
}) {
  const sorted = [...personaScores].sort((a, b) => b.weightedSignal - a.weightedSignal);

  return (
    <div className="terminal-card border-border">
      <div className="font-mono text-[10px] text-neon-cyan tracking-widest mb-4 flex items-center gap-1">
        <TrendingUp className="h-3 w-3" /> CONVERSION ESTIMATES BY SEGMENT
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-[10px] text-muted-foreground tracking-widest pb-2 pr-4">
                PERSONA
              </th>
              <th className="text-right text-[10px] text-muted-foreground tracking-widest pb-2 px-3">
                WEIGHT
              </th>
              <th className="text-right text-[10px] text-muted-foreground tracking-widest pb-2 px-3">
                LIKELIHOOD
              </th>
              <th className="text-right text-[10px] text-muted-foreground tracking-widest pb-2 pl-3">
                SIGNAL
              </th>
              <th className="pb-2 pl-4 w-32 hidden sm:table-cell" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((ps, i) => {
              const personaIdx = personas.findIndex((p) => p.id === ps.personaId);
              const barColor =
                AVATAR_COLORS_HEX_DARK[
                  Math.max(0, personaIdx) % AVATAR_COLORS_HEX_DARK.length
                ];
              const likelihoodColor =
                ps.conversionLikelihood >= 70
                  ? "text-neon-green"
                  : ps.conversionLikelihood >= 45
                  ? "text-neon-amber"
                  : "text-neon-pink";

              return (
                <tr key={ps.personaId} className="group">
                  <td className="py-2.5 pr-4">
                    <p className="text-foreground font-bold text-xs">{ps.personaName}</p>
                    <p className="text-muted-foreground text-[10px]">{ps.personaTitle}</p>
                  </td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground text-xs">
                    {ps.marketWeight}%
                  </td>
                  <td className={`py-2.5 px-3 text-right font-bold text-xs ${likelihoodColor}`}>
                    {ps.conversionLikelihood}/100
                  </td>
                  <td className="py-2.5 pl-3 text-right text-neon-green font-bold text-xs">
                    {ps.weightedSignal.toFixed(1)}
                  </td>
                  <td className="py-2.5 pl-4 hidden sm:table-cell">
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${ps.conversionLikelihood}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ICP Priority Ranking ─────────────────────────────────────────────────────

function IcpPriorityRanking({
  ranking,
}: {
  ranking: FocusGroupAnalytics["icpPriorityRanking"];
}) {
  return (
    <div className="terminal-card border-border">
      <div className="font-mono text-[10px] text-neon-purple tracking-widest mb-4 flex items-center gap-1">
        <Zap className="h-3 w-3" /> ICP PRIORITY RANKING
      </div>
      <div className="space-y-3">
        {ranking.map((seg, i) => (
          <div key={i} className="flex gap-3 items-start">
            <span className="font-mono text-neon-purple font-bold text-sm flex-shrink-0 w-5 text-right">
              {i + 1}.
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono text-foreground font-bold text-sm">{seg.personaName}</span>
                <span className="text-muted-foreground text-xs hidden sm:inline">— {seg.personaTitle}</span>
                <span className="font-mono text-neon-green text-xs ml-auto flex-shrink-0">
                  {seg.weightedSignal.toFixed(1)}
                </span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">{seg.rationale}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Objection Chart ──────────────────────────────────────────────────────────

function ObjectionChart({
  objections,
}: {
  objections: FocusGroupAnalytics["topObjections"];
}) {
  const data = objections.map((o) => ({
    name: o.objection.length > 28 ? o.objection.slice(0, 26) + "…" : o.objection,
    fullName: o.objection,
    tamPercent: o.tamPercent,
    raisedBy: o.raisedBy.join(", "),
  }));

  return (
    <div className="terminal-card border-border">
      <div className="font-mono text-[10px] text-neon-pink tracking-widest mb-4 flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" /> TOP OBJECTIONS (WEIGHTED BY TAM%)
      </div>

      <div className="h-40 w-full mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 9, fontFamily: "var(--font-mono)", fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 9, fontFamily: "var(--font-mono)", fill: "hsl(var(--foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={
                <CustomTooltip />
              }
            />
            <Bar dataKey="tamPercent" name="TAM %" radius={2} maxBarSize={14}>
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={
                    i === 0
                      ? "hsl(var(--neon-pink))"
                      : i === 1
                      ? "hsl(var(--neon-amber))"
                      : "hsl(var(--neon-cyan))"
                  }
                  opacity={1 - i * 0.12}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {objections.map((obj, i) => (
          <div key={i} className="flex items-start gap-2">
            <ChevronRight className="h-3 w-3 text-neon-pink flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-foreground text-xs font-mono">{obj.objection}</span>
              <span className="text-muted-foreground text-[10px] ml-2">
                {obj.raisedBy.join(" + ")} = {obj.tamPercent}% of TAM
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Consensus + Dead Weight ──────────────────────────────────────────────────

function SignalList({
  items,
  color,
  icon: Icon,
  label,
}: {
  items: string[];
  color: string;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="terminal-card border-border h-full">
      <div className={`font-mono text-[10px] ${color} tracking-widest mb-3 flex items-center gap-1`}>
        <Icon className="h-3 w-3" /> {label}
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className={`${color} mt-0.5 flex-shrink-0`}>›</span>
            <span className="text-foreground leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Recommended Actions ──────────────────────────────────────────────────────

function RecommendedActions({ actions }: { actions: string[] }) {
  return (
    <div className="terminal-card border-neon-amber/30">
      <div className="font-mono text-[10px] text-neon-amber tracking-widest mb-4 flex items-center gap-1">
        <Target className="h-3 w-3" /> RECOMMENDED ACTIONS
      </div>
      <ol className="space-y-3">
        {actions.map((action, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="font-mono text-neon-amber font-bold text-sm flex-shrink-0 w-5 text-right">
              {i + 1}.
            </span>
            <span className="text-foreground text-sm leading-relaxed">{action}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Adjacent Segment Signal ──────────────────────────────────────────────────

function AdjacentSegmentSignal({ signal }: { signal: string }) {
  return (
    <div className="terminal-card border-neon-purple/30">
      <div className="font-mono text-[10px] text-neon-purple tracking-widest mb-2 flex items-center gap-1">
        <TrendingUp className="h-3 w-3" /> ADJACENT SEGMENT SIGNAL
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">{signal}</p>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

interface FocusGroupAnalyticsDashboardProps {
  analytics: FocusGroupAnalytics;
  personas: Persona[];
}

export function FocusGroupAnalyticsDashboard({
  analytics,
  personas,
}: FocusGroupAnalyticsDashboardProps) {
  return (
    <div className="space-y-6 mt-2">
      {/* Report header */}
      <div className="border-t-2 border-neon-amber/40 pt-6">
        <div className="module-header text-neon-amber">Synthesis Report</div>
        <h3 className="font-mono text-neon-amber text-lg font-bold tracking-wider">
          FOCUS GROUP REPORT
        </h3>
      </div>

      {/* PMF Score */}
      <PmfScoreCard score={Math.round(analytics.pmfScore)} />

      {/* Persona conversion table */}
      <PersonaConversionTable
        personaScores={analytics.personaScores}
        personas={personas}
      />

      {/* ICP priority + Objections side by side */}
      <div className="grid md:grid-cols-2 gap-4">
        <IcpPriorityRanking ranking={analytics.icpPriorityRanking} />
        <ObjectionChart objections={analytics.topObjections} />
      </div>

      {/* Consensus + Dead Weight */}
      <div className="grid md:grid-cols-2 gap-4">
        <SignalList
          items={analytics.consensusSignals}
          color="text-neon-green"
          icon={CheckCircle}
          label="CONSENSUS SIGNALS"
        />
        <SignalList
          items={analytics.deadWeight}
          color="text-muted-foreground"
          icon={XCircle}
          label="DEAD WEIGHT"
        />
      </div>

      {/* Adjacent segment — AGENCY only */}
      {analytics.adjacentSegmentSignal && (
        <PaywallGate
          requiredTier="AGENCY"
          featureName="ADJACENT SEGMENT EXPANSION"
          featureDesc="Discover untapped adjacent markets identified during the focus group session."
        >
          <AdjacentSegmentSignal signal={analytics.adjacentSegmentSignal} />
        </PaywallGate>
      )}

      {/* Recommended actions */}
      <RecommendedActions actions={analytics.recommendedActions} />

      {/* Disclaimer */}
      <div className="flex items-start gap-2 text-[10px] text-muted-foreground font-mono border border-border rounded-sm p-3">
        <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5 text-neon-amber" />
        Market weights estimated from persona profiles and session evidence. Treat as directional signal, not primary research. Validate with real customer interviews before major spend decisions.
      </div>
    </div>
  );
}
