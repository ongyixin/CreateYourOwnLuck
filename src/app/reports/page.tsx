"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Clock, ExternalLink, AlertTriangle, Loader2, FileText, Trash2, ArrowLeft } from "lucide-react";
import ScanlineOverlay from "@/components/scanline-overlay";
import AnimatedLogo from "@/components/animated-logo";
import { ThemeToggle } from "@/components/theme-toggle";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ jobId: string; company: string } | null>(null);

  const fetchReports = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load reports"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  function requestDelete(jobId: string, company: string) {
    setDeleteConfirm({ jobId, company });
  }

  function cancelDelete() {
    setDeleteConfirm(null);
  }

  async function confirmDelete(jobId: string) {
    setDeletingId(jobId);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${jobId}`, {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Failed to delete");
        setDeleteConfirm(null);
        return;
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              analyses: prev.analyses.filter((a) => a.jobId !== jobId),
              total: prev.total - 1,
            }
          : null
      );
    } catch {
      setError("Failed to delete");
    } finally {
      setDeleteConfirm(null);
      setDeletingId(null);
    }
  }


  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <ScanlineOverlay />

      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 py-3 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-neon-green"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="font-mono text-[10px] tracking-wider">BACK TO HOME</span>
          </Link>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <AnimatedLogo size={18} />
            <span className="font-mono text-neon-green font-bold text-sm tracking-wider">
              FITCHECK<span className="blink">_</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
            REPORTS
          </span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Page header */}
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
                    <div className="flex items-center gap-2">
                      {a.status === "complete" && (
                        <Link
                          href={`/report/${a.jobId}`}
                          className="flex items-center gap-1 text-[10px] text-neon-green hover:underline"
                        >
                          VIEW REPORT <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => requestDelete(a.jobId, a.company)}
                        disabled={deletingId === a.jobId}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete report"
                      >
                        {deletingId === a.jobId ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        <span className="hidden sm:inline">DELETE</span>
                      </button>
                    </div>
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
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-background/80 backdrop-blur-sm">
          <div
            className="terminal-card border-red-400/60 max-w-md w-full py-6 px-6 shadow-xl"
            role="alertdialog"
            aria-labelledby="delete-title"
            aria-describedby="delete-desc"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border-2 border-red-400/60 bg-red-400/10">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="delete-title" className="font-mono text-sm font-bold tracking-wider text-foreground">
                  DELETE REPORT?
                </h2>
                <p id="delete-desc" className="mt-1 text-[10px] text-muted-foreground tracking-wider leading-relaxed">
                  <span className="font-semibold text-foreground">&quot;{deleteConfirm.company}&quot;</span> will be permanently removed. This cannot be undone.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={cancelDelete}
                    disabled={deletingId === deleteConfirm.jobId}
                    className="flex-1 border-2 border-border font-mono font-bold px-4 py-2 rounded-sm text-xs tracking-wider text-muted-foreground hover:border-neon-green hover:text-neon-green transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDelete(deleteConfirm.jobId)}
                    disabled={deletingId === deleteConfirm.jobId}
                    className="flex-1 border-2 border-red-400 font-mono font-bold px-4 py-2 rounded-sm text-xs tracking-wider text-red-400 hover:bg-red-400 hover:text-primary-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === deleteConfirm.jobId ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        DELETING...
                      </span>
                    ) : (
                      "DELETE"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
