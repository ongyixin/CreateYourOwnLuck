"use client";

/**
 * /report/[id] — FitCheck report page
 *
 * Fetches the report from GET /api/report/[id].
 * - If 202, polls every 3 s with a pending/progress state.
 * - If 200, renders the full 5-section tabbed report.
 * - Handles loading, error, and missing states gracefully.
 *
 * Demo: visit /report/demo to see the full UI with mock data.
 *
 * Owned by: report agent
 */

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  AlertTriangle,
  Clock,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { FitCheckReport, PendingReportResponse } from "@/lib/types";

import { ReportHeader } from "@/components/report/report-header";
import { BrandPerceptionSection } from "@/components/report/brand-perception";
import { IcpAssessmentSection } from "@/components/report/icp-assessment";
import { ActionablesSection } from "@/components/report/actionables";
import { LeadSuggestionsSection } from "@/components/report/lead-suggestions";
import { IcpStudioSection } from "@/components/report/icp-studio";

// ─── Tab definitions ──────────────────────────────────────────────────────────

type Tab = "brand" | "icp" | "actions" | "leads" | "studio";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "brand", label: "Brand", emoji: "🎯" },
  { id: "icp", label: "ICP", emoji: "👥" },
  { id: "actions", label: "Actions", emoji: "⚡" },
  { id: "leads", label: "Leads", emoji: "📡" },
  { id: "studio", label: "ICP Studio", emoji: "🧬" },
];

// ─── Page component ───────────────────────────────────────────────────────────

export default function ReportPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : (params.id?.[0] ?? "");

  const [report, setReport] = useState<FitCheckReport | null>(null);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("brand");

  const fetchReport = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`/api/report/${id}`);

      if (res.status === 404) {
        setError("Report not found. The job ID may be invalid or expired.");
        setLoading(false);
        return true;
      }

      if (res.status === 202) {
        const data = (await res.json()) as PendingReportResponse;
        setPending(true);
        setProgress(data.progress ?? 0);
        setLoading(false);
        return false; // keep polling
      }

      if (res.status >= 500) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Analysis failed. Please try again.");
        setLoading(false);
        return true;
      }

      if (!res.ok) {
        setError(`Unexpected error (${res.status}). Please refresh.`);
        setLoading(false);
        return true;
      }

      const data = (await res.json()) as FitCheckReport;
      setReport(data);
      setPending(false);
      setLoading(false);
      return true;
    } catch {
      setError("Network error — please check your connection and refresh.");
      setLoading(false);
      return true;
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      const done = await fetchReport();
      if (!done && !cancelled) {
        timer = setTimeout(poll, 3000);
      }
    };

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fetchReport, id]);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          <p className="text-sm text-zinc-500">Loading report…</p>
        </div>
      </Shell>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <Shell>
        <div className="text-center space-y-4 max-w-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 mx-auto">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <h2 className="text-white font-semibold">Something went wrong</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Pending / still processing ───────────────────────────────────────────

  if (pending || !report) {
    return (
      <Shell>
        <div className="text-center space-y-6 max-w-sm w-full">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/10 mx-auto">
            <Clock className="h-7 w-7 text-violet-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg mb-1">
              Analysis in progress
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Your FitCheck report is being generated. This usually takes 60–90 seconds.
            </p>
          </div>
          <div className="space-y-2">
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-violet-500 h-2 rounded-full transition-all duration-700"
                style={{ width: `${Math.max(progress, 4)}%` }}
              />
            </div>
            <p className="text-zinc-600 text-xs">{progress}% complete · auto-refreshing…</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/analyze">Start a new analysis</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  // ── Full report ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Sticky header + tabs */}
      <div className="sticky top-0 z-40 bg-[#09090b]/95 backdrop-blur-sm border-b border-zinc-800/60">
        <ReportHeader report={report} />

        {/* Tab nav */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex gap-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150",
                  activeTab === tab.id
                    ? "border-violet-500 text-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                )}
              >
                <span className="text-base leading-none">{tab.emoji}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Pipeline warnings */}
        {report.warnings.length > 0 && (
          <div className="mb-6 px-4 py-3 bg-amber-950/30 border border-amber-800/40 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-amber-300 text-sm font-medium mb-1">
                Partial data — some web scrapes failed
              </p>
              <ul className="space-y-0.5">
                {report.warnings.map((w, i) => (
                  <li key={i} className="text-amber-400/60 text-xs">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="animate-fade-in">
          {activeTab === "brand" && (
            <BrandPerceptionSection data={report.brandPerception} />
          )}
          {activeTab === "icp" && (
            <IcpAssessmentSection data={report.icpAssessment} />
          )}
          {activeTab === "actions" && (
            <ActionablesSection data={report.actionables} />
          )}
          {activeTab === "leads" && (
            <LeadSuggestionsSection data={report.leadSuggestions} />
          )}
          {activeTab === "studio" && (
            <IcpStudioSection data={report.icpStudio} />
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Shell (centered layout for non-report states) ────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col">
      <nav className="border-b border-zinc-800/50 px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-semibold text-zinc-200">FitCheck</span>
        </div>
      </nav>
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        {children}
      </div>
    </div>
  );
}
