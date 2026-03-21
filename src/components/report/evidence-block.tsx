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
          className="bg-secondary/60 border border-border rounded-sm p-3"
        >
          <div className="flex items-start gap-2">
            <Quote className="h-3 w-3 text-neon-cyan mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground text-xs leading-relaxed italic">
              {e.quote}
            </p>
          </div>
          {e.sourceUrl ? (
            <a
              href={e.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 flex items-center gap-1 text-neon-green/60 hover:text-neon-green text-xs transition-colors w-fit font-mono"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              {e.sourceLabel ?? e.sourceUrl}
            </a>
          ) : e.sourceLabel ? (
            <p className="mt-1.5 text-muted-foreground text-xs font-mono">{e.sourceLabel}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
