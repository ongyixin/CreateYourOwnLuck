/**
 * FitCheck PDF Report — @react-pdf/renderer document
 *
 * Dark terminal theme matching the web UI.
 * All colours derived from globals.css dark mode variables.
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type {
  FitCheckReport,
  BrandPerception,
  BrandInsight,
  IcpAssessment,
  IcpProfile,
  Actionables,
  Actionable,
  LeadSuggestions,
  IcpStudio,
  Persona,
  Evidence,
} from "@/lib/types";

// ─── Colour palette (dark-mode neon theme) ───────────────────────────────────

const C = {
  bg: "#0a0a0a",
  card: "#111111",
  secondary: "#1a1a1a",
  border: "#292929",
  fg: "#ebebeb",
  muted: "#808080",
  green: "#00FF7F",
  cyan: "#00E5FF",
  amber: "#FFB800",
  pink: "#FF3399",
  purple: "#BF40FF",
  white: "#FFFFFF",
} as const;

// Use PDF built-in fonts — no network requests, no font loading failures.
// "Courier" is the monospace terminal font; "Helvetica" is the body font.
// Both are embedded in every PDF reader (standard 14 PDF core fonts).

// Disable automatic hyphenation so technical terms don't get split mid-word.
Font.registerHyphenationCallback((word) => [word]);

// Font name constants — match @react-pdf/renderer built-in names exactly
const MONO = "Courier";
const MONO_BOLD = "Courier-Bold";
const SANS = "Helvetica";
const SANS_BOLD = "Helvetica-Bold";

// ─── Shared styles ────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    backgroundColor: C.bg,
    fontFamily: SANS,
    fontSize: 9,
    color: C.fg,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
  },

  // Layout
  row: { flexDirection: "row" },
  col: { flexDirection: "column" },
  flex1: { flex: 1 },
  spaceBetween: { justifyContent: "space-between" },
  alignStart: { alignItems: "flex-start" },
  alignCenter: { alignItems: "center" },
  wrap: { flexWrap: "wrap" },

  // Spacing helpers
  mb2: { marginBottom: 2 },
  mb4: { marginBottom: 4 },
  mb6: { marginBottom: 6 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mb16: { marginBottom: 16 },
  mb20: { marginBottom: 20 },
  mb24: { marginBottom: 24 },
  mt4: { marginTop: 4 },
  mt6: { marginTop: 6 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },

  // Card
  card: {
    backgroundColor: C.card,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 10,
  },
  cardAccentGreen: { borderLeftWidth: 3, borderLeftColor: C.green },
  cardAccentAmber: { borderLeftWidth: 3, borderLeftColor: C.amber },
  cardAccentPink: { borderLeftWidth: 3, borderLeftColor: C.pink },
  cardAccentCyan: { borderLeftWidth: 3, borderLeftColor: C.cyan },
  cardAccentPurple: { borderLeftWidth: 3, borderLeftColor: C.purple },

  // Module header
  moduleLabel: {
    fontFamily: MONO,
    fontSize: 7,
    color: C.muted,
    letterSpacing: 2,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  moduleTitle: {
    fontFamily: MONO_BOLD,
    fontSize: 16,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 14,
  },

  // Text
  body: { fontSize: 9, color: C.fg, lineHeight: 1.6 },
  bodyMuted: { fontSize: 9, color: C.muted, lineHeight: 1.6 },
  bodySmall: { fontSize: 8, color: C.muted, lineHeight: 1.5 },
  mono: { fontFamily: MONO, fontSize: 8 },
  monoSmall: { fontFamily: MONO, fontSize: 7, letterSpacing: 1 },
  monoBold: { fontFamily: MONO_BOLD, fontSize: 8 },
  monoTitle: { fontFamily: MONO_BOLD, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" },
  label: {
    fontFamily: MONO,
    fontSize: 7,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },

  // Neon text colours
  green: { color: C.green },
  cyan: { color: C.cyan },
  amber: { color: C.amber },
  pink: { color: C.pink },
  purple: { color: C.purple },
  muted: { color: C.muted },

  // Badge
  badge: {
    borderRadius: 2,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginRight: 3,
    marginBottom: 3,
  },
  badgeText: {
    fontFamily: MONO_BOLD,
    fontSize: 6,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  // Score bar
  scoreBarTrack: { height: 4, backgroundColor: C.secondary, borderRadius: 2 },
  scoreBarFill: { height: 4, borderRadius: 2 },

  // Divider
  divider: { height: 1, backgroundColor: C.border, marginVertical: 10 },

  // Page footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontFamily: MONO,
    fontSize: 7,
    color: C.muted,
    letterSpacing: 0.5,
  },

  // Section header (used within pages)
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionHeadDot: {
    width: 6,
    height: 6,
    borderRadius: 1,
    marginRight: 6,
  },
  sectionHeadText: {
    fontFamily: MONO_BOLD,
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // Evidence
  evidence: {
    backgroundColor: C.secondary,
    borderRadius: 2,
    padding: 7,
    marginTop: 6,
  },
  evidenceLabel: {
    fontFamily: MONO,
    fontSize: 6,
    letterSpacing: 1,
    color: C.muted,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  evidenceItem: {
    fontSize: 7.5,
    color: C.muted,
    lineHeight: 1.5,
    marginBottom: 2,
  },

  // ICP score box
  scoreBox: {
    borderWidth: 1,
    borderColor: C.green,
    borderRadius: 2,
    padding: 10,
    alignItems: "center",
    minWidth: 72,
  },
  scoreNumber: {
    fontFamily: MONO_BOLD,
    fontSize: 28,
    lineHeight: 1,
  },

  // Copy suggestion
  copyBlock: {
    backgroundColor: C.secondary,
    borderRadius: 2,
    padding: 8,
    flex: 1,
  },

  // Avatar circle
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: MONO_BOLD,
    fontSize: 9,
    color: C.bg,
  },
});

// ─── Helper components ────────────────────────────────────────────────────────

function PageFooter({ company, page }: { company: string; page: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>FITCHECK — {company.toUpperCase()}</Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) =>
        `PAGE ${pageNumber} / ${totalPages}`
      } />
    </View>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

function Badge({
  children,
  color,
  bgAlpha = "22",
}: {
  children: string;
  color: string;
  bgAlpha?: string;
}) {
  return (
    <View style={[s.badge, { borderColor: color + "66", backgroundColor: color + bgAlpha }]}>
      <Text style={[s.badgeText, { color }]}>{children}</Text>
    </View>
  );
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={s.scoreBarTrack}>
      <View style={[s.scoreBarFill, { width: `${Math.min(value, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

function SectionHead({ label, color }: { label: string; color: string }) {
  return (
    <View style={s.sectionHead}>
      <View style={[s.sectionHeadDot, { backgroundColor: color }]} />
      <Text style={[s.sectionHeadText, { color }]}>{label}</Text>
    </View>
  );
}

function EvidenceList({ evidence }: { evidence?: Evidence[] }) {
  if (!evidence || evidence.length === 0) return null;
  return (
    <View style={s.evidence}>
      <Text style={s.evidenceLabel}>Evidence</Text>
      {evidence.slice(0, 3).map((e, i) => (
        <Text key={i} style={s.evidenceItem}>
          › {e.quote}{e.sourceLabel ? ` — ${e.sourceLabel}` : ""}
        </Text>
      ))}
    </View>
  );
}

function scoreColor(score: number): string {
  if (score >= 75) return C.green;
  if (score >= 50) return C.amber;
  return C.pink;
}

// ─── Cover Page ───────────────────────────────────────────────────────────────

function CoverPage({ report }: { report: FitCheckReport }) {
  const date = new Date(report.generatedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Page size="A4" style={[s.page, { justifyContent: "space-between" }]}>
      {/* Header bar */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 16, marginBottom: 0 }}>
        <Text style={[s.monoBold, s.green, { fontSize: 10, letterSpacing: 2 }]}>
          FITCHECK_
        </Text>
      </View>

      {/* Centre content */}
      <View style={{ flex: 1, justifyContent: "center", paddingVertical: 40 }}>
        <Text style={[s.monoSmall, s.muted, { marginBottom: 16 }]}>
          BRAND INTELLIGENCE REPORT
        </Text>

        <Text style={{
          fontFamily: MONO_BOLD,
          fontSize: 36,
          color: C.green,
          letterSpacing: 2,
          lineHeight: 1.1,
          marginBottom: 8,
        }}>
          {report.companyName.toUpperCase()}
        </Text>

        <Text style={[s.bodyMuted, { marginBottom: 32 }]}>
          {report.websiteUrl}
        </Text>

        {/* Module index */}
        <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 20, gap: 8 }}>
          {[
            { n: "01", label: "Brand Snapshot", color: C.green },
            { n: "02", label: "ICP Assessment", color: C.cyan },
            { n: "03", label: "Recommendations", color: C.amber },
            { n: "04", label: "Lead Suggestions", color: C.pink },
            { n: "05", label: "ICP Studio", color: C.purple },
          ].map((m) => (
            <View key={m.n} style={[s.row, s.alignCenter, { marginBottom: 6 }]}>
              <Text style={[s.monoSmall, s.muted, { width: 28 }]}>{m.n}</Text>
              <View style={{ width: 4, height: 4, borderRadius: 1, backgroundColor: m.color, marginRight: 10 }} />
              <Text style={[s.mono, { color: m.color }]}>{m.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14 }}>
        <View style={[s.row, s.spaceBetween]}>
          <Text style={[s.monoSmall, s.muted]}>GENERATED {date.toUpperCase()}</Text>
          <Text style={[s.monoSmall, s.muted]}>CONFIDENTIAL</Text>
        </View>
      </View>
    </Page>
  );
}

// ─── Brand Perception ─────────────────────────────────────────────────────────

function InsightCard({ insight, color }: { insight: BrandInsight; color: string }) {
  return (
    <View style={[s.card, { borderLeftWidth: 3, borderLeftColor: color }]}>
      <Text style={[s.monoBold, { color: C.fg, marginBottom: 4 }]}>
        {insight.title.toUpperCase()}
      </Text>
      <Text style={s.bodyMuted}>{insight.description}</Text>
      <EvidenceList evidence={insight.evidence} />
    </View>
  );
}

function BrandPage({ data, company }: { data: BrandPerception; company: string }) {
  const score = data.consistencyScore ?? 0;
  const barColor = scoreColor(score);
  const scoreLabel =
    score >= 75
      ? "Strong consistency across channels"
      : score >= 50
      ? "Some inconsistencies detected"
      : "Significant inconsistencies — needs attention";

  return (
    <Page size="A4" style={s.page}>
      <Text style={[s.moduleLabel, s.green]}>Module 01</Text>
      <Text style={[s.moduleTitle, s.green]}>Brand Snapshot</Text>

      {/* Summary + score */}
      <View style={[s.card, s.row, { gap: 16, marginBottom: 14 }]}>
        <View style={s.flex1}>
          <Text style={[s.body, { marginBottom: 10 }]}>{data.summary}</Text>

          {data.toneAndIdentity.length > 0 && (
            <View>
              <Text style={[s.label, s.cyan]}>Tone & Identity</Text>
              <View style={[s.row, s.wrap]}>
                {data.toneAndIdentity.map((t, i) => (
                  <Badge key={i} color={i % 3 === 0 ? C.cyan : i % 3 === 1 ? C.green : C.purple}>
                    {t}
                  </Badge>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={[s.scoreBox, { borderColor: barColor }]}>
          <Text style={[s.monoSmall, s.muted, { marginBottom: 4 }]}>BRAND CLARITY</Text>
          <Text style={[s.scoreNumber, { color: barColor }]}>{score}</Text>
          <Text style={[s.mono, s.muted]}>/100</Text>
        </View>
      </View>

      <View style={s.mb8}>
        <ScoreBar value={score} color={barColor} />
        <Text style={[s.monoSmall, s.muted, s.mt4]}>{scoreLabel.toUpperCase()}</Text>
      </View>

      <Divider />

      {/* Strengths */}
      {data.perceivedStrengths.length > 0 && (
        <View style={s.mb16}>
          <SectionHead label={`Perceived Strengths (${data.perceivedStrengths.length})`} color={C.green} />
          {data.perceivedStrengths.map((insight, i) => (
            <InsightCard key={i} insight={insight} color={C.green} />
          ))}
        </View>
      )}

      {/* Gaps */}
      {data.weakOrConfusingSignals.length > 0 && (
        <View>
          <SectionHead label={`Gaps Detected (${data.weakOrConfusingSignals.length})`} color={C.amber} />
          {data.weakOrConfusingSignals.map((insight, i) => (
            <InsightCard key={i} insight={insight} color={C.amber} />
          ))}
        </View>
      )}

      <PageFooter company={company} page="brand" />
    </Page>
  );
}

// ─── ICP Assessment ───────────────────────────────────────────────────────────

function ProfileCard({ profile, index }: { profile: IcpProfile; index: number }) {
  const colors = [C.green, C.cyan, C.pink];
  const color = colors[index % 3];
  const barColor = scoreColor(profile.fitScore);

  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={[s.card, { borderColor: color + "66" }]}>
      <View style={[s.row, s.spaceBetween, s.alignStart, { marginBottom: 8 }]}>
        <View style={[s.row, s.alignStart, s.flex1]}>
          <View style={[s.avatar, { backgroundColor: color }]}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={s.flex1}>
            <Text style={[s.monoBold, { color: C.fg }]}>{profile.name.toUpperCase()}</Text>
            <Text style={[s.bodySmall, { marginTop: 2 }]}>{profile.description}</Text>
          </View>
        </View>
        <View style={{ alignItems: "center", minWidth: 50 }}>
          <Text style={[s.monoBold, { color: barColor, fontSize: 16 }]}>
            {profile.fitScore}%
          </Text>
          <Text style={[s.monoSmall, s.muted]}>FIT</Text>
        </View>
      </View>

      <View style={s.mb8}>
        <ScoreBar value={profile.fitScore} color={barColor} />
      </View>

      <View style={[s.row, { gap: 10 }]}>
        {profile.painPoints.length > 0 && (
          <View style={s.flex1}>
            <Text style={[s.label, s.pink]}>Pain Points</Text>
            <View style={[s.row, s.wrap]}>
              {profile.painPoints.map((p, i) => (
                <Badge key={i} color={C.pink}>{p}</Badge>
              ))}
            </View>
          </View>
        )}
        {profile.motivations.length > 0 && (
          <View style={s.flex1}>
            <Text style={[s.label, s.green]}>Motivations</Text>
            <View style={[s.row, s.wrap]}>
              {profile.motivations.map((m, i) => (
                <Badge key={i} color={C.green}>{m}</Badge>
              ))}
            </View>
          </View>
        )}
        {profile.buyingTriggers.length > 0 && (
          <View style={s.flex1}>
            <Text style={[s.label, s.cyan]}>Buying Triggers</Text>
            <View style={[s.row, s.wrap]}>
              {profile.buyingTriggers.map((t, i) => (
                <Badge key={i} color={C.cyan}>{t}</Badge>
              ))}
            </View>
          </View>
        )}
      </View>

      <EvidenceList evidence={profile.evidence} />
    </View>
  );
}

function IcpPage({ data, company }: { data: IcpAssessment; company: string }) {
  const sortedSegments = [...(data.audienceSegments ?? [])].sort((a, b) => b.fitScore - a.fitScore);
  const sortedProfiles = [...(data.profiles ?? [])].sort((a, b) => b.fitScore - a.fitScore);

  return (
    <Page size="A4" style={s.page}>
      <Text style={[s.moduleLabel, s.cyan]}>Module 02</Text>
      <Text style={[s.moduleTitle, s.cyan]}>ICP Assessment</Text>

      <View style={[s.card, s.mb16]}>
        <Text style={s.body}>{data.summary}</Text>
      </View>

      {sortedSegments.length > 0 && (
        <View style={s.mb16}>
          <SectionHead label="Audience Segments — Ranked by Fit" color={C.cyan} />
          <View style={s.card}>
            {sortedSegments.map((seg, i) => (
              <View key={i} style={[
                i < sortedSegments.length - 1 ? { borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 10, marginBottom: 10 } : {},
              ]}>
                <View style={[s.row, s.spaceBetween, { marginBottom: 4 }]}>
                  <View style={[s.row, s.alignCenter]}>
                    <Text style={[s.monoSmall, s.muted, { marginRight: 8, width: 20 }]}>#{i + 1}</Text>
                    <Text style={[s.monoBold, { color: C.fg }]}>{seg.label.toUpperCase()}</Text>
                  </View>
                  <Text style={[s.monoBold, { color: scoreColor(seg.fitScore) }]}>{seg.fitScore}%</Text>
                </View>
                <View style={{ paddingLeft: 28, marginBottom: 6 }}>
                  <ScoreBar value={seg.fitScore} color={scoreColor(seg.fitScore)} />
                </View>
                {seg.rationale && (
                  <Text style={[s.bodySmall, { paddingLeft: 28 }]}>{seg.rationale}</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {sortedProfiles.length > 0 && (
        <View>
          <SectionHead label="Ideal Customer Profiles" color={C.green} />
          {sortedProfiles.map((profile, i) => (
            <ProfileCard key={i} profile={profile} index={i} />
          ))}
        </View>
      )}

      <PageFooter company={company} page="icp" />
    </Page>
  );
}

// ─── Actionables ──────────────────────────────────────────────────────────────

function priorityColor(p: Actionable["priority"]): string {
  if (p === "high") return C.pink;
  if (p === "medium") return C.amber;
  return C.cyan;
}

function ActionCard({ item, accent }: { item: Actionable; accent: string }) {
  return (
    <View style={[s.card, { borderLeftWidth: 3, borderLeftColor: accent }]}>
      <View style={[s.row, s.spaceBetween, s.alignStart, { marginBottom: 4 }]}>
        <Text style={[s.monoBold, { color: C.fg, flex: 1, marginRight: 8 }]}>
          {item.title.toUpperCase()}
        </Text>
        <Badge color={priorityColor(item.priority)}>{item.priority}</Badge>
      </View>
      <Text style={s.bodyMuted}>{item.description}</Text>
      <EvidenceList evidence={item.evidence} />
    </View>
  );
}

function ActionsPage({ data, company }: { data: Actionables; company: string }) {
  const order = { high: 0, medium: 1, low: 2 };
  const sorted = <T extends Actionable>(arr: T[]) =>
    [...arr].sort((a, b) => order[a.priority] - order[b.priority]);

  const improve = sorted(data.whatToImprove ?? []);
  const change = sorted(data.whatToChange ?? []);
  const lean = sorted(data.whatToLeanInto ?? []);
  const angles = data.messagingAngles ?? [];
  const copy = data.copySuggestions ?? [];

  return (
    <Page size="A4" style={s.page}>
      <Text style={[s.moduleLabel, s.amber]}>Module 03</Text>
      <Text style={[s.moduleTitle, s.amber]}>Recommendations</Text>

      {improve.length > 0 && (
        <View style={s.mb16}>
          <SectionHead label={`What to Improve (${improve.length})`} color={C.amber} />
          {improve.map((item, i) => <ActionCard key={i} item={item} accent={C.amber} />)}
        </View>
      )}

      {change.length > 0 && (
        <View style={s.mb16}>
          <SectionHead label={`What to Change (${change.length})`} color={C.pink} />
          {change.map((item, i) => <ActionCard key={i} item={item} accent={C.pink} />)}
        </View>
      )}

      {lean.length > 0 && (
        <View style={s.mb16}>
          <SectionHead label={`What to Lean Into (${lean.length})`} color={C.green} />
          {lean.map((item, i) => <ActionCard key={i} item={item} accent={C.green} />)}
        </View>
      )}

      {angles.length > 0 && (
        <View style={s.mb16}>
          <SectionHead label="Messaging Angles" color={C.purple} />
          {angles.map((angle, i) => (
            <View key={i} style={[s.card, { borderColor: C.purple + "44" }]}>
              <Text style={[s.monoBold, { color: C.purple, marginBottom: 4, fontSize: 9 }]}>
                "{angle.angle}"
              </Text>
              <Text style={s.bodyMuted}>{angle.rationale}</Text>
              {angle.exampleHeadline && (
                <View style={[{ backgroundColor: C.secondary, borderRadius: 2, padding: 7, marginTop: 6 }]}>
                  <Text style={[s.mono, { color: C.fg }]}>{angle.exampleHeadline}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {copy.length > 0 && (
        <View>
          <SectionHead label="Copy Suggestions" color={C.cyan} />
          {copy.map((item, i) => (
            <View key={i} style={[s.card, s.mb8]}>
              <Text style={[s.label, s.cyan, { marginBottom: 8 }]}>{item.placement.toUpperCase()}</Text>
              <View style={[s.row, { gap: 8, marginBottom: 8 }]}>
                <View style={[s.copyBlock, { borderWidth: 1, borderColor: C.pink + "44" }]}>
                  <Text style={[s.monoSmall, s.pink, { marginBottom: 4 }]}>x BEFORE</Text>
                  <Text style={[s.bodySmall, { color: C.muted }]}>{item.before}</Text>
                </View>
                <View style={[s.copyBlock, { borderWidth: 1, borderColor: C.green + "44" }]}>
                  <Text style={[s.monoSmall, s.green, { marginBottom: 4 }]}>+ AFTER</Text>
                  <Text style={s.bodySmall}>{item.after}</Text>
                </View>
              </View>
              <Text style={s.bodySmall}>{item.rationale}</Text>
            </View>
          ))}
        </View>
      )}

      <PageFooter company={company} page="actions" />
    </Page>
  );
}

// ─── Lead Suggestions ─────────────────────────────────────────────────────────

function LeadsPage({ data, company }: { data: LeadSuggestions; company: string }) {
  const customerTypes = data.customerTypes ?? [];
  const communities = data.communities ?? [];
  const companies = data.targetCompanyProfiles ?? [];
  const channels = data.creatorChannels ?? [];

  return (
    <Page size="A4" style={s.page}>
      <Text style={[s.moduleLabel, s.pink]}>Module 04</Text>
      <Text style={[s.moduleTitle, s.pink]}>Lead Suggestions</Text>

      {customerTypes.length > 0 && (
        <View style={s.mb16}>
          <SectionHead label="Target Customer Types" color={C.cyan} />
          {customerTypes.map((ct, i) => (
            <View key={i} style={[s.card, s.mb8]}>
              <Text style={[s.monoBold, { color: C.fg, marginBottom: 6 }]}>{ct.role.toUpperCase()}</Text>
              <View style={[s.row, s.wrap, { marginBottom: 6 }]}>
                {ct.companySizes.map((size, j) => (
                  <Badge key={j} color={C.green}>{size}</Badge>
                ))}
                {ct.industries.map((ind, j) => (
                  <Badge key={j} color={C.purple}>{ind}</Badge>
                ))}
              </View>
              <Text style={s.bodySmall}>{ct.rationale}</Text>
            </View>
          ))}
        </View>
      )}

      {communities.length > 0 && (
        <View style={s.mb16}>
          <SectionHead label="Communities to Reach" color={C.green} />
          {communities.map((c, i) => (
            <View key={i} style={[s.card, s.mb8]}>
              <View style={[s.row, s.spaceBetween, s.alignStart, { marginBottom: 4 }]}>
                <Text style={[s.monoBold, { color: C.fg, flex: 1, marginRight: 8 }]}>
                  {c.name.toUpperCase()}
                </Text>
                <Badge color={C.cyan}>{c.platform}</Badge>
              </View>
              <Text style={s.bodySmall}>{c.rationale}</Text>
              {c.url && (
                <Text style={[s.monoSmall, { color: C.green, marginTop: 4 }]}>{c.url}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {companies.length > 0 && (
        <View style={s.mb16}>
          <SectionHead label="Target Company Profiles" color={C.amber} />
          {companies.map((co, i) => (
            <View key={i} style={s.card}>
              <Text style={[s.body, { marginBottom: 6 }]}>{co.description}</Text>
              <View style={[s.row, s.wrap, { marginBottom: 4 }]}>
                {co.exampleTypes.map((type, j) => (
                  <Badge key={j} color={C.amber}>{type}</Badge>
                ))}
              </View>
              <Text style={s.bodySmall}>{co.rationale}</Text>
            </View>
          ))}
        </View>
      )}

      {channels.length > 0 && (
        <View>
          <SectionHead label="Creators & Channels" color={C.purple} />
          {channels.map((ch, i) => (
            <View key={i} style={[s.card, s.mb8]}>
              <Text style={[s.monoBold, { color: C.fg, marginBottom: 4 }]}>
                {ch.name.toUpperCase()}
                {"  "}
                <Text style={[s.monoSmall, s.muted]}>[{ch.type.toUpperCase()}]</Text>
              </Text>
              <Text style={s.bodySmall}>{ch.rationale}</Text>
              {ch.url && (
                <Text style={[s.monoSmall, { color: C.purple, marginTop: 4 }]}>{ch.url}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      <PageFooter company={company} page="leads" />
    </Page>
  );
}

// ─── ICP Studio ───────────────────────────────────────────────────────────────

const AVATAR_COLORS_PDF = [C.green, C.pink, C.cyan];

const SENTIMENT_COLORS: Record<string, string> = {
  positive: C.green,
  neutral: C.cyan,
  confused: C.amber,
  negative: C.pink,
};

function PersonaCard({ persona, index }: { persona: Persona; index: number }) {
  const avatarColor = AVATAR_COLORS_PDF[index % AVATAR_COLORS_PDF.length];
  const reaction = persona.fiveSecondReaction;
  const sentimentColor = SENTIMENT_COLORS[reaction.sentiment] ?? C.muted;

  const initials = persona.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={[s.card, { marginBottom: 12 }]}>
      {/* Header */}
      <View style={[s.row, s.alignStart, { marginBottom: 10 }]}>
        <View style={[s.avatar, { backgroundColor: avatarColor, width: 34, height: 34 }]}>
          <Text style={[s.avatarText, { fontSize: 11 }]}>{initials}</Text>
        </View>
        <View style={s.flex1}>
          <Text style={[s.monoBold, { color: C.fg, fontSize: 10 }]}>{persona.name.toUpperCase()}</Text>
          <Text style={s.bodySmall}>{persona.title}</Text>
          {persona.age && (
            <Text style={[s.monoSmall, s.muted]}>AGE {persona.age}</Text>
          )}
        </View>
      </View>

      {/* Psychographics */}
      {persona.psychographics.length > 0 && (
        <View style={s.mb8}>
          <Text style={[s.label, s.purple]}>Psychographics</Text>
          <View style={[s.row, s.wrap]}>
            {persona.psychographics.map((pg, i) => (
              <Badge key={i} color={C.purple}>{pg}</Badge>
            ))}
          </View>
        </View>
      )}

      {/* Pain points + buying triggers */}
      <View style={[s.row, { gap: 12, marginBottom: 10 }]}>
        {persona.painPoints.length > 0 && (
          <View style={s.flex1}>
            <Text style={[s.label, s.pink]}>Pain Points</Text>
            {persona.painPoints.map((p, i) => (
              <Text key={i} style={[s.bodySmall, { marginBottom: 2 }]}>
                <Text style={{ color: C.pink }}>› </Text>{p}
              </Text>
            ))}
          </View>
        )}
        {persona.buyingTriggers.length > 0 && (
          <View style={s.flex1}>
            <Text style={[s.label, s.green]}>Buying Triggers</Text>
            {persona.buyingTriggers.map((t, i) => (
              <Text key={i} style={[s.bodySmall, { marginBottom: 2 }]}>
                <Text style={{ color: C.green }}>› </Text>{t}
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* 5-second reaction */}
      <View style={[{
        borderWidth: 1,
        borderColor: sentimentColor + "66",
        borderRadius: 2,
        marginBottom: 8,
        overflow: "hidden",
      }]}>
        <View style={[s.row, s.spaceBetween, s.alignCenter, {
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          paddingHorizontal: 10,
          paddingVertical: 6,
        }]}>
          <Text style={[s.monoSmall, s.muted]}>5-SECOND REACTION</Text>
          <Badge color={sentimentColor}>{reaction.sentiment.toUpperCase()}</Badge>
        </View>
        <View style={{ padding: 10 }}>
          <Text style={[s.mono, { color: C.fg, marginBottom: 6, fontSize: 8.5 }]}>
            "{reaction.reaction}"
          </Text>
          <Text style={[s.bodySmall, s.mb2]}>
            <Text style={[s.monoSmall, s.cyan]}>FIRST SAW: </Text>
            {reaction.firstImpression}
          </Text>
          <Text style={s.bodySmall}>
            <Text style={[s.monoSmall, s.amber]}>WOULD: </Text>
            <Text style={{ color: C.green }}>{reaction.likelyAction}</Text>
          </Text>
        </View>
      </View>

      {/* Messaging gaps */}
      {persona.painPointGaps.length > 0 && (
        <View style={s.mb8}>
          <Text style={[s.label, s.amber]}>! MESSAGING GAPS</Text>
          {persona.painPointGaps.map((gap, i) => (
            <Text key={i} style={[s.bodySmall, { color: C.amber, marginBottom: 2 }]}>
              <Text style={{ color: C.pink }}>! </Text>{gap}
            </Text>
          ))}
        </View>
      )}

      <EvidenceList evidence={persona.evidence} />
    </View>
  );
}

function StudioPage({ data, company }: { data: IcpStudio; company: string }) {
  const personas = data.personas ?? [];

  return (
    <Page size="A4" style={s.page}>
      <Text style={[s.moduleLabel, s.purple]}>Module 05</Text>
      <Text style={[s.moduleTitle, s.purple]}>ICP Studio</Text>

      <View style={[s.card, s.mb16]}>
        <Text style={[s.mono, s.muted, { lineHeight: 1.6 }]}>
          AI-generated personas grounded in real web data about your market.
          Use them to simulate reactions and identify messaging gaps.
        </Text>
      </View>

      {personas.length === 0 ? (
        <Text style={s.bodyMuted}>No personas generated for this report.</Text>
      ) : (
        personas.map((persona, i) => (
          <PersonaCard key={persona.id} persona={persona} index={i} />
        ))
      )}

      <PageFooter company={company} page="studio" />
    </Page>
  );
}

// ─── Root document ────────────────────────────────────────────────────────────

export function ReportPDF({ report }: { report: FitCheckReport }) {
  return (
    <Document
      title={`FitCheck — ${report.companyName} Brand Intelligence Report`}
      author="FitCheck"
      subject="Brand Intelligence Report"
      creator="FitCheck"
      producer="FitCheck"
    >
      <CoverPage report={report} />
      <BrandPage data={report.brandPerception} company={report.companyName} />
      <IcpPage data={report.icpAssessment} company={report.companyName} />
      <ActionsPage data={report.actionables} company={report.companyName} />
      <LeadsPage data={report.leadSuggestions} company={report.companyName} />
      <StudioPage data={report.icpStudio} company={report.companyName} />
    </Document>
  );
}
