"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  AlertTriangle,
  Clock,
  Eye,
  Users,
  Target,
  TrendingUp,
  UserCircle,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ScanlineOverlay from "@/components/scanline-overlay";
import AnimatedLogo from "@/components/animated-logo";
import NeonBadge from "@/components/neon-badge";
import type { FitCheckReport, PendingReportResponse } from "@/lib/types";

import { ReportHeader } from "@/components/report/report-header";
import { BrandPerceptionSection } from "@/components/report/brand-perception";
import { IcpAssessmentSection } from "@/components/report/icp-assessment";
import { ActionablesSection } from "@/components/report/actionables";
import { LeadSuggestionsSection } from "@/components/report/lead-suggestions";
import { IcpStudioSection } from "@/components/report/icp-studio";
import { FocusGroupSection } from "@/components/report/focus-group";
import { PaywallGate } from "@/components/paywall-gate";

type Tab = "brand" | "icp" | "actions" | "leads" | "studio" | "focus";

const TABS: { id: Tab; label: string; icon: React.ElementType; color: string }[] = [
  { id: "brand", label: "BRAND", icon: Eye, color: "text-neon-green" },
  { id: "icp", label: "ICP", icon: Users, color: "text-neon-cyan" },
  { id: "actions", label: "ACTIONS", icon: Target, color: "text-neon-amber" },
  { id: "leads", label: "LEADS", icon: TrendingUp, color: "text-neon-pink" },
  { id: "studio", label: "STUDIO", icon: UserCircle, color: "text-neon-purple" },
  { id: "focus", label: "FOCUS GROUP", icon: UsersRound, color: "text-neon-amber" },
];

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
        return false;
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

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-neon-green" />
          <p className="font-mono text-sm text-muted-foreground tracking-wider">LOADING REPORT...</p>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="text-center space-y-4 max-w-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-sm border-2 border-neon-pink mx-auto">
            <AlertTriangle className="h-6 w-6 text-neon-pink" />
          </div>
          <h2 className="font-mono text-foreground font-bold tracking-wider">SOMETHING WENT WRONG</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="border-2 border-neon-cyan text-neon-cyan font-mono font-bold px-4 py-2 rounded-sm text-xs tracking-wider hover:bg-neon-cyan hover:text-primary-foreground transition-all"
            >
              RETRY
            </button>
            <Link
              href="/"
              className="border-2 border-border text-muted-foreground font-mono font-bold px-4 py-2 rounded-sm text-xs tracking-wider hover:border-neon-green hover:text-neon-green transition-all"
            >
              HOME
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  if (pending || !report) {
    return (
      <Shell>
        <div className="text-center space-y-6 max-w-sm w-full">
          <div className="flex h-14 w-14 items-center justify-center rounded-sm border-2 border-neon-cyan mx-auto">
            <Clock className="h-7 w-7 text-neon-cyan animate-pulse" />
          </div>
          <div>
            <h2 className="font-mono text-foreground font-bold text-lg tracking-wider mb-1">
              ANALYSIS IN PROGRESS
            </h2>
            <p className="text-sm text-muted-foreground">
              Your FitCheck report is being generated. This usually takes 60–90 seconds.
            </p>
          </div>
          <div className="space-y-2">
            <div className="w-full bg-secondary rounded-sm h-2 overflow-hidden">
              <div
                className="bg-neon-green h-2 rounded-sm transition-all duration-700"
                style={{ width: `${Math.max(progress, 4)}%` }}
              />
            </div>
            <p className="font-mono text-[10px] text-muted-foreground tracking-widest">
              {progress}% COMPLETE · AUTO-REFRESHING...
            </p>
          </div>
          <Link
            href="/analyze"
            className="inline-block font-mono text-[10px] text-muted-foreground hover:text-neon-green transition-colors tracking-wider"
          >
            START NEW ANALYSIS
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <div className="min-h-screen relative">
      <ScanlineOverlay />

      {/* Sticky header + tabs */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <ReportHeader report={report} />

        {/* Tab nav */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex gap-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 font-mono text-xs font-bold whitespace-nowrap border-b-2 transition-all duration-150 tracking-wider",
                    isActive
                      ? `border-current ${tab.color}`
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section content */}
      <main className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 py-8">
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
            <PaywallGate
              featureName="ICP STUDIO"
              featureDesc="Chat individually with each AI persona to probe their objections, motivations, and buying triggers in depth."
              requiredTier="PRO"
            >
              <IcpStudioSection data={report.icpStudio} />
            </PaywallGate>
          )}
          {activeTab === "focus" && (
            <PaywallGate
              featureName="FOCUS GROUP MODE"
              featureDesc="Run a live 4–6 agent focus group session. Personas debate your product, surface friction, and vote on fit."
              requiredTier="PRO"
            >
              <FocusGroupSection
                personas={report.icpStudio.personas}
                jobId={report.jobId}
              />
            </PaywallGate>
          )}
        </div>
      </main>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col relative">
      <ScanlineOverlay />
      <nav className="relative z-40 border-b border-border px-6 py-3">
        <div className="mx-auto max-w-5xl flex items-center gap-2">
          <AnimatedLogo size={18} />
          <span className="font-mono text-neon-green font-bold text-sm tracking-wider">
            FITCHECK<span className="blink">_</span>
          </span>
        </div>
      </nav>
      <div className="relative z-20 flex flex-1 items-center justify-center px-6 py-12">
        {children}
      </div>
    </div>
  );
}
