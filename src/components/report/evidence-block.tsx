/**
 * Evidence block — renders a list of Evidence items with quote + source link.
 * Used across all 5 report sections to ground insights in real web data.
 *
 * Owned by: report agent
 */

import { ExternalLink, Quote } from "lucide-react";
import type { Evidence } from "@/lib/types";

interface EvidenceBlockProps {
  evidence: Evidence[];
}

export function EvidenceBlock({ evidence }: EvidenceBlockProps) {
  if (!evidence || evidence.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {evidence.map((e, i) => (
        <div
          key={i}
          className="bg-zinc-900/80 border border-zinc-800/40 rounded-md p-3"
        >
          <div className="flex items-start gap-2">
            <Quote className="h-3 w-3 text-zinc-600 mt-0.5 flex-shrink-0" />
            <p className="text-zinc-400 text-xs leading-relaxed italic">
              {e.quote}
            </p>
          </div>
          {e.sourceUrl ? (
            <a
              href={e.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 flex items-center gap-1 text-violet-400/60 hover:text-violet-400 text-xs transition-colors w-fit"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              {e.sourceLabel ?? e.sourceUrl}
            </a>
          ) : e.sourceLabel ? (
            <p className="mt-1.5 text-zinc-600 text-xs">{e.sourceLabel}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
