"use client";

/**
 * Sticky report header showing company name, URL, generated date,
 * and export/share CTAs.
 *
 * Owned by: report agent
 */

import { ExternalLink, Share2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      {/* Left: brand + company */}
      <div className="flex items-center gap-3 min-w-0">
        {/* FitCheck wordmark */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <span className="text-violet-400 font-bold text-base tracking-tight">
            Fit
          </span>
          <span className="text-white font-bold text-base tracking-tight">
            Check
          </span>
        </div>

        <div className="w-px h-5 bg-zinc-700/60 flex-shrink-0" />

        {/* Company info */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-white font-semibold text-sm truncate">
              {report.companyName}
            </h1>
            <a
              href={report.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-600 hover:text-violet-400 transition-colors flex-shrink-0"
              aria-label="Visit company website"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="text-zinc-600 text-xs">Generated {generatedDate}</p>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-zinc-500 hover:text-zinc-200 h-8 px-3"
          onClick={() => {
            navigator.clipboard.writeText(window.location.href).catch(() => {});
          }}
          title="Copy link"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs">Share</span>
        </Button>

        <Button
          size="sm"
          className="gap-1.5 h-8 px-3 text-xs"
          onClick={() => window.print()}
          title="Export report"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </div>
    </div>
  );
}
