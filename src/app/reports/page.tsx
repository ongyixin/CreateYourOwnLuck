"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, ExternalLink, AlertTriangle, Loader2, FileText } from "lucide-react";
import ScanlineOverlay from "@/components/scanline-overlay";

interface AnalysisSummary {
  jobId: string;
  company: string;
  url: string;
  status: string;
  createdAt: string;
}

interface ReportsResponse {
  analyses: AnalysisSummary[];
  total: number;
  tier: string;
}

const STATUS_COLOR: Record<string, string> = {
  complete: "text-neon-green border-neon-green/40",
  pending: "text-neon-amber border-neon-amber/40",
  running: "text-neon-cyan border-neon-cyan/40",
  failed: "text-red-400 border-red-400/40",
};

export default function ReportsPage() {
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load reports"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <ScanlineOverlay />

      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-10">
          <div className="text-[10px] text-neon-green tracking-[0.4em] uppercase mb-2">
            FITCHECK / REPORTS
          </div>
          <h1 className="text-2xl font-bold tracking-wider text-foreground">
            ANALYSIS HISTORY
          </h1>
          {data && (
            <p className="text-xs text-muted-foreground mt-1">
              {data.total} {data.total === 1 ? "analysis" : "analyses"} on{" "}
              <span className="text-neon-green">
                {data.tier === "FREE" ? "BOOTLOADER" : data.tier === "PRO" ? "SERIES A" : "SERIES B"}
              </span>
            </p>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            LOADING...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs border border-red-400/30 px-4 py-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && data?.analyses.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-xs tracking-wider">NO ANALYSES YET</p>
            <Link
              href="/analyze"
              className="mt-4 inline-block text-neon-green text-xs border border-neon-green/40 px-4 py-2 hover:glow-green transition-all"
            >
              RUN YOUR FIRST ANALYSIS →
            </Link>
          </div>
        )}

        {/* List */}
        {data && data.analyses.length > 0 && (
          <div className="space-y-3">
            {data.analyses.map((a) => (
              <div
                key={a.jobId}
                className="terminal-card border-border hover:border-neon-green/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-foreground tracking-wide truncate">
                      {a.company}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {a.url}
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(a.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span
                      className={`text-[9px] tracking-widest border px-2 py-0.5 uppercase ${STATUS_COLOR[a.status] ?? "text-muted-foreground border-border"}`}
                    >
                      {a.status}
                    </span>
                    {a.status === "complete" && (
                      <Link
                        href={`/report/${a.jobId}`}
                        className="flex items-center gap-1 text-[10px] text-neon-green hover:underline"
                      >
                        VIEW REPORT <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FREE tier upsell */}
        {data?.tier === "FREE" && (
          <div className="mt-8 border border-neon-green/20 px-4 py-4 text-xs text-muted-foreground">
            <span className="text-neon-amber tracking-widest text-[10px]">BOOTLOADER PLAN</span>
            <p className="mt-1">
              You&apos;re on the free plan (1 analysis). Upgrade to{" "}
              <Link href="/#pricing" className="text-neon-green hover:underline">
                Series A
              </Link>{" "}
              for unlimited analyses and report history.
            </p>
          </div>
        )}

        <div className="mt-8">
          <Link
            href="/"
            className="text-[10px] text-muted-foreground hover:text-neon-green transition-colors tracking-widest"
          >
            ← BACK TO HOME
          </Link>
        </div>
      </div>
    </div>
  );
}
