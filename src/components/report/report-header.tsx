"use client";

import { useState } from "react";
import { ExternalLink, Download, Copy, Loader2 } from "lucide-react";
import AnimatedLogo from "@/components/animated-logo";
import type { FitCheckReport } from "@/lib/types";

interface ReportHeaderProps {
  report: FitCheckReport;
}

export function ReportHeader({ report }: ReportHeaderProps) {
  const [exporting, setExporting] = useState(false);

  const generatedDate = new Date(report.generatedAt).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  );

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/export/${report.jobId}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const slug = report.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      a.download = `fitcheck-${slug}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently ignore — user can retry
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <AnimatedLogo size={18} />
        <span className="font-mono text-neon-green font-bold text-sm tracking-wider">
          FITCHECK<span className="blink">_</span>
        </span>

        <div className="w-px h-5 bg-border flex-shrink-0" />

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-foreground font-mono font-bold text-sm truncate tracking-wider">
              {report.companyName.toUpperCase()}
            </h1>
            <a
              href={report.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-neon-green transition-colors flex-shrink-0"
              aria-label="Visit company website"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="text-muted-foreground font-mono text-[10px] tracking-widest">
            GENERATED {generatedDate.toUpperCase()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          className="flex items-center gap-1.5 h-8 px-3 border border-border rounded-sm hover:border-neon-green hover:text-neon-green transition-all font-mono text-[10px] tracking-widest text-muted-foreground"
          onClick={() => {
            navigator.clipboard.writeText(window.location.href).catch(() => {});
          }}
          title="Copy link"
        >
          <Copy className="h-3 w-3" />
          <span className="hidden sm:inline">SHARE</span>
        </button>

        <button
          className="flex items-center gap-1.5 h-8 px-3 bg-neon-green text-primary-foreground rounded-sm font-mono text-[10px] tracking-widest font-bold hover:glow-green transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleExport}
          disabled={exporting}
          title="Export report as PDF"
        >
          {exporting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Download className="h-3 w-3" />
          )}
          <span className="hidden sm:inline">{exporting ? "GENERATING..." : "EXPORT"}</span>
        </button>
      </div>
    </div>
  );
}
