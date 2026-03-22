"use client";

import { useState, useRef } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrandResonanceMap, ThemeHotspot } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<ThemeHotspot["category"], string> = {
  leverage: "var(--neon-green)",
  fix: "var(--neon-pink)",
  develop: "var(--neon-cyan)",
  monitor: "hsl(var(--muted-foreground))",
};

const CATEGORY_LABEL: Record<ThemeHotspot["category"], string> = {
  leverage: "LEVERAGE",
  fix: "FIX NOW",
  develop: "DEVELOP",
  monitor: "MONITOR",
};

const CATEGORY_BORDER: Record<ThemeHotspot["category"], string> = {
  leverage: "border-l-neon-green",
  fix: "border-l-neon-pink",
  develop: "border-l-neon-cyan",
  monitor: "border-l-border",
};

const CATEGORY_TEXT: Record<ThemeHotspot["category"], string> = {
  leverage: "text-neon-green",
  fix: "text-neon-pink",
  develop: "text-neon-cyan",
  monitor: "text-muted-foreground",
};

const CATEGORY_BG: Record<ThemeHotspot["category"], string> = {
  leverage: "bg-neon-green/10 text-neon-green",
  fix: "bg-neon-pink/10 text-neon-pink",
  develop: "bg-neon-cyan/10 text-neon-cyan",
  monitor: "bg-muted text-muted-foreground",
};

const SOURCE_LABELS: Record<string, string> = {
  website: "SITE",
  reviews: "REVIEWS",
  social: "SOCIAL",
  search: "SEARCH",
  video: "VIDEO",
};

// ─── Bubble tooltip ───────────────────────────────────────────────────────────

function BubbleTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ThemeHotspot }[];
}) {
  if (!active || !payload?.length) return null;
  const theme = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-sm px-3 py-2.5 font-mono text-xs max-w-[240px] shadow-lg">
      <p className={cn("font-bold mb-1 uppercase tracking-wider", CATEGORY_TEXT[theme.category])}>
        {theme.theme}
      </p>
      <div className="space-y-0.5 text-muted-foreground mb-2">
        <p>Frequency: <span className="text-foreground">{theme.frequencyScore}/100</span></p>
        <p>Sentiment: <span className="text-foreground">{theme.sentimentScore > 0 ? "+" : ""}{theme.sentimentScore}</span></p>
        <p>ICP priority: <span className="text-foreground">{theme.icpImportance}/100</span></p>
      </div>
      <p className="text-muted-foreground leading-snug border-t border-border pt-2">
        {theme.summary}
      </p>
    </div>
  );
}

// ─── Quadrant label overlay ───────────────────────────────────────────────────

function QuadrantLabels() {
  return (
    <>
      <div className="absolute top-2 left-[52%] text-[9px] font-mono text-neon-cyan/50 tracking-widest pointer-events-none">
        DEVELOP
      </div>
      <div className="absolute top-2 right-2 text-[9px] font-mono text-neon-green/50 tracking-widest pointer-events-none">
        LEVERAGE
      </div>
      <div className="absolute bottom-2 left-[52%] text-[9px] font-mono text-muted-foreground/50 tracking-widest pointer-events-none">
        MONITOR
      </div>
      <div className="absolute bottom-2 right-2 text-[9px] font-mono text-neon-pink/50 tracking-widest pointer-events-none">
        FIX NOW
      </div>
    </>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
      {(["leverage", "fix", "develop", "monitor"] as const).map((cat) => (
        <div key={cat} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: CATEGORY_COLOR[cat] }}
          />
          <span className={cn("font-mono text-[10px] tracking-wider", CATEGORY_TEXT[cat])}>
            {CATEGORY_LABEL[cat]}
          </span>
        </div>
      ))}
      <div className="flex items-center gap-1.5 ml-2 border-l border-border pl-3">
        <div className="text-[9px] font-mono text-muted-foreground tracking-wider">
          BUBBLE SIZE = ICP IMPORTANCE
        </div>
      </div>
    </div>
  );
}

// ─── Source breakdown table ───────────────────────────────────────────────────

function sentimentDotColor(sentiment: number, present: boolean): string {
  if (!present) return "bg-muted";
  if (sentiment >= 30) return "bg-neon-green";
  if (sentiment >= -30) return "bg-neon-amber";
  return "bg-neon-pink";
}

function MiniBar({ value, max, colorClass }: { value: number; max: number; colorClass: string }) {
  const pct = Math.round(Math.abs(value / max) * 100);
  return (
    <div className="flex items-center gap-1">
      <div className="w-12 bg-secondary rounded-sm h-1 overflow-hidden">
        <div className={cn("h-1 rounded-sm", colorClass)} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[10px] text-muted-foreground tabular-nums w-6">
        {value > 0 ? "+" : ""}{value}
      </span>
    </div>
  );
}

function SourceBreakdownTable({
  themes,
  selectedId,
  onSelect,
}: {
  themes: ThemeHotspot[];
  selectedId: string | null;
  onSelect: (theme: string) => void;
}) {
  const sorted = [...themes].sort((a, b) => b.icpImportance - a.icpImportance);
  const sourceOrder = ["website", "reviews", "social", "search", "video"] as const;

  return (
    <div className="terminal-card mt-6 overflow-x-auto">
      <div className="flex items-center gap-2 mb-4">
        <span className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
          Source Signal Breakdown
        </span>
      </div>

      <table className="w-full text-xs font-mono min-w-[680px]">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-[10px] text-muted-foreground tracking-widest pb-2 pr-4 font-normal">
              THEME
            </th>
            {sourceOrder.map((src) => (
              <th
                key={src}
                className="text-center text-[10px] text-muted-foreground tracking-widest pb-2 px-2 font-normal"
              >
                {SOURCE_LABELS[src]}
              </th>
            ))}
            <th className="text-left text-[10px] text-muted-foreground tracking-widest pb-2 pl-4 font-normal">
              FREQ
            </th>
            <th className="text-left text-[10px] text-muted-foreground tracking-widest pb-2 pl-2 font-normal">
              SENTIMENT
            </th>
            <th className="text-left text-[10px] text-muted-foreground tracking-widest pb-2 pl-2 font-normal">
              ICP
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((theme) => {
            const isSelected = selectedId === theme.theme;
            return (
              <tr
                key={theme.theme}
                onClick={() => onSelect(theme.theme)}
                className={cn(
                  "border-b border-border/50 cursor-pointer transition-colors hover:bg-secondary/50",
                  isSelected && "bg-secondary"
                )}
              >
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] tracking-widest font-bold",
                        CATEGORY_BG[theme.category]
                      )}
                    >
                      {CATEGORY_LABEL[theme.category]}
                    </span>
                    <span className="text-foreground truncate max-w-[160px]" title={theme.theme}>
                      {theme.theme}
                    </span>
                  </div>
                </td>
                {sourceOrder.map((src) => {
                  const breakdown = theme.sources.find((s) => s.sourceType === src);
                  const present = breakdown?.present ?? false;
                  const sentiment = breakdown?.sentiment ?? 0;
                  return (
                    <td key={src} className="text-center py-2.5 px-2">
                      <div className="flex justify-center">
                        <div
                          title={present ? `Sentiment: ${sentiment}` : "Not mentioned"}
                          className={cn(
                            "w-2.5 h-2.5 rounded-full",
                            present
                              ? sentimentDotColor(sentiment, true)
                              : "bg-border opacity-30"
                          )}
                        />
                      </div>
                    </td>
                  );
                })}
                <td className="py-2.5 pl-4">
                  <MiniBar value={theme.frequencyScore} max={100} colorClass="bg-neon-cyan" />
                </td>
                <td className="py-2.5 pl-2">
                  <MiniBar
                    value={theme.sentimentScore}
                    max={100}
                    colorClass={
                      theme.sentimentScore >= 0 ? "bg-neon-green" : "bg-neon-pink"
                    }
                  />
                </td>
                <td className="py-2.5 pl-2">
                  <MiniBar value={theme.icpImportance} max={100} colorClass="bg-neon-amber" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-neon-green" />
          <span className="text-[10px] text-muted-foreground">Positive signal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-neon-amber" />
          <span className="text-[10px] text-muted-foreground">Neutral signal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-neon-pink" />
          <span className="text-[10px] text-muted-foreground">Negative signal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-border opacity-30" />
          <span className="text-[10px] text-muted-foreground">Not mentioned</span>
        </div>
      </div>
    </div>
  );
}

// ─── Detail card ──────────────────────────────────────────────────────────────

function ThemeDetailCard({ theme }: { theme: ThemeHotspot }) {
  return (
    <div
      className={cn(
        "terminal-card border-l-4 mt-6 animate-fade-in",
        CATEGORY_BORDER[theme.category]
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] tracking-widest font-mono font-bold",
                CATEGORY_BG[theme.category]
              )}
            >
              {CATEGORY_LABEL[theme.category]}
            </span>
          </div>
          <h4 className={cn("font-mono font-bold tracking-wider text-sm uppercase", CATEGORY_TEXT[theme.category])}>
            {theme.theme}
          </h4>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <div className="text-center">
            <div className="font-mono text-[10px] text-muted-foreground tracking-widest">FREQ</div>
            <div className="font-mono font-bold text-sm text-foreground">{theme.frequencyScore}</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-[10px] text-muted-foreground tracking-widest">SENT</div>
            <div className={cn("font-mono font-bold text-sm", theme.sentimentScore >= 0 ? "text-neon-green" : "text-neon-pink")}>
              {theme.sentimentScore > 0 ? "+" : ""}{theme.sentimentScore}
            </div>
          </div>
          <div className="text-center">
            <div className="font-mono text-[10px] text-muted-foreground tracking-widest">ICP</div>
            <div className="font-mono font-bold text-sm text-neon-amber">{theme.icpImportance}</div>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{theme.summary}</p>

      {theme.evidence.length > 0 && (
        <div className="space-y-2">
          <div className="font-mono text-[10px] text-muted-foreground tracking-widest">EVIDENCE</div>
          {theme.evidence.map((ev, i) => (
            <blockquote
              key={i}
              className="border-l-2 border-border pl-3 text-xs text-muted-foreground italic"
            >
              &ldquo;{ev.quote}&rdquo;
              {ev.sourceLabel && (
                <span className="not-italic ml-1 text-[10px] opacity-60">— {ev.sourceLabel}</span>
              )}
            </blockquote>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ResonanceHotspotProps {
  data: BrandResonanceMap;
}

export function ResonanceHotspot({ data }: ResonanceHotspotProps) {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const selected = data.themes.find((t) => t.theme === selectedTheme) ?? null;

  const handleBubbleClick = (data: unknown) => {
    const payload = data as { payload?: ThemeHotspot } | undefined;
    if (!payload?.payload) return;
    const theme = payload.payload.theme;
    setSelectedTheme((prev) => (prev === theme ? null : theme));
    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  };

  const handleTableSelect = (theme: string) => {
    setSelectedTheme((prev) => (prev === theme ? null : theme));
  };

  // Split themes by category for separate scatter series (needed for per-category colors)
  const byCategory = (cat: ThemeHotspot["category"]) =>
    data.themes.filter((t) => t.category === cat);

  return (
    <div className="space-y-0 mt-8">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-neon-green" />
        <h3 className="font-mono text-neon-green text-sm font-bold tracking-wider">
          BRAND RESONANCE HOTSPOT
        </h3>
      </div>

      {/* Strategic insight */}
      <div className="terminal-card border-border">
        <p className="text-sm text-foreground leading-relaxed">{data.insight}</p>
      </div>

      {/* Bubble chart card */}
      <div className="terminal-card mt-4">
        <div className="font-mono text-[10px] text-muted-foreground tracking-widest mb-1 uppercase">
          Theme Map — Frequency × Perception × ICP Importance
        </div>
        <p className="text-[11px] text-muted-foreground mb-4">
          Click a bubble to inspect details. Bubble size reflects ICP importance.
        </p>

        <div className="relative">
          {/* Quadrant labels overlay — positioned after the chart renders */}
          <div className="absolute inset-0 pointer-events-none z-10">
            <QuadrantLabels />
          </div>

          <ResponsiveContainer width="100%" height={380}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                strokeOpacity={0.4}
              />
              <XAxis
                type="number"
                dataKey="frequencyScore"
                domain={[0, 100]}
                tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                label={{
                  value: "MARKET FREQUENCY →",
                  position: "insideBottom",
                  offset: -10,
                  style: { fontFamily: "var(--font-mono)", fontSize: 9, fill: "hsl(var(--muted-foreground))", letterSpacing: "0.1em" },
                }}
              />
              <YAxis
                type="number"
                dataKey="sentimentScore"
                domain={[-100, 100]}
                tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                label={{
                  value: "← NEGATIVE  PERCEPTION  POSITIVE →",
                  angle: -90,
                  position: "insideLeft",
                  offset: 12,
                  style: { fontFamily: "var(--font-mono)", fontSize: 9, fill: "hsl(var(--muted-foreground))", letterSpacing: "0.08em" },
                }}
              />
              <ZAxis
                type="number"
                dataKey="icpImportance"
                range={[60, 600]}
              />
              <Tooltip
                content={<BubbleTooltip />}
                cursor={false}
              />
              {/* Reference lines at the quadrant boundaries */}
              <ReferenceLine
                x={50}
                stroke="hsl(var(--border))"
                strokeDasharray="6 3"
                strokeOpacity={0.7}
              />
              <ReferenceLine
                y={0}
                stroke="hsl(var(--border))"
                strokeDasharray="6 3"
                strokeOpacity={0.7}
              />

              {/* One Scatter per category to get distinct colors */}
              {(["leverage", "fix", "develop", "monitor"] as const).map((cat) => (
                <Scatter
                  key={cat}
                  data={byCategory(cat)}
                  fill={CATEGORY_COLOR[cat]}
                  fillOpacity={0.75}
                  stroke={CATEGORY_COLOR[cat]}
                  strokeWidth={1}
                  onClick={(data) => handleBubbleClick(data)}
                  style={{ cursor: "pointer" }}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <Legend />
      </div>

      {/* Detail card for selected theme */}
      {selected && <ThemeDetailCard theme={selected} />}

      {/* Source breakdown table */}
      <div ref={tableRef}>
        <SourceBreakdownTable
          themes={data.themes}
          selectedId={selectedTheme}
          onSelect={handleTableSelect}
        />
      </div>
    </div>
  );
}
