"use client";

import { ExternalLink, Share2, Download, Copy } from "lucide-react";
import AnimatedLogo from "@/components/animated-logo";
import type { FitCheckReport } from "@/lib/types";

interface ReportHeaderProps {
  report: FitCheckReport;
}

export function ReportHeader({ report }: ReportHeaderProps) {
  const generatedDate = new Date(report.generatedAt).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  );

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
          className="flex items-center gap-1.5 h-8 px-3 bg-neon-green text-primary-foreground rounded-sm font-mono text-[10px] tracking-widest font-bold hover:glow-green transition-all"
          onClick={() => window.print()}
          title="Export report"
        >
          <Download className="h-3 w-3" />
          <span className="hidden sm:inline">EXPORT</span>
        </button>
      </div>
    </div>
  );
}
