import { Globe, Search, Star, Twitter, TrendingUp } from "lucide-react";
import type { ScraperSource } from "@/lib/types";

export interface SourcesData {
  selectedSources: ScraperSource[];
}

interface SourcesStepProps {
  data: SourcesData;
  onChange: (data: SourcesData) => void;
}

interface SourceOption {
  id: ScraperSource;
  label: string;
  description: string;
  examples: string;
  icon: React.ReactNode;
}

const SOURCE_OPTIONS: SourceOption[] = [
  {
    id: "google_search",
    label: "Google Search",
    description: "Public mentions from across the web",
    examples: "Reddit, Hacker News, news articles, press",
    icon: <Search className="h-4 w-4" />,
  },
  {
    id: "reviews",
    label: "Review Sites",
    description: "Structured customer reviews",
    examples: "G2, Trustpilot",
    icon: <Star className="h-4 w-4" />,
  },
  {
    id: "twitter",
    label: "Twitter / X",
    description: "Public tweets mentioning your brand",
    examples: "Mentions, replies, commentary",
    icon: <Twitter className="h-4 w-4" />,
  },
  {
    id: "enrichment",
    label: "Enrichment Data",
    description: "Signals about company direction and reach",
    examples: "LinkedIn jobs, YouTube, Product Hunt, autocomplete",
    icon: <TrendingUp className="h-4 w-4" />,
  },
];

export function SourcesStep({ data, onChange }: SourcesStepProps) {
  function toggle(source: ScraperSource) {
    const current = data.selectedSources;
    const next = current.includes(source)
      ? current.filter((s) => s !== source)
      : [...current, source];
    onChange({ selectedSources: next });
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-xl font-semibold">Data sources</h2>
          <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
            Optional
          </span>
        </div>
        <p className="text-sm text-zinc-400">
          Choose which sources FitCheck scrapes. More sources = richer analysis,
          but takes slightly longer. Company website is always included.
        </p>
      </div>

      {/* Always-on source */}
      <div className="flex items-start gap-3 rounded-lg border border-zinc-700/50 bg-zinc-800/40 px-4 py-3 opacity-60">
        <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-violet-500 bg-violet-500">
          <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 8">
            <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 shrink-0 text-zinc-400">
            <Globe className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-zinc-300">Company Website</p>
            <p className="text-xs text-zinc-500">Always included — required for analysis</p>
          </div>
        </div>
      </div>

      {/* Selectable sources */}
      <div className="space-y-2">
        {SOURCE_OPTIONS.map((opt) => {
          const checked = data.selectedSources.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                checked
                  ? "border-violet-500/40 bg-violet-500/5"
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
              }`}
            >
              {/* Checkbox */}
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  checked
                    ? "border-violet-500 bg-violet-500"
                    : "border-zinc-600 bg-transparent"
                }`}
              >
                {checked && (
                  <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 8">
                    <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Icon */}
              <span className={`mt-0.5 shrink-0 ${checked ? "text-violet-400" : "text-zinc-500"}`}>
                {opt.icon}
              </span>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${checked ? "text-zinc-200" : "text-zinc-400"}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-zinc-500">
                  {opt.description} &mdash;{" "}
                  <span className="text-zinc-600">{opt.examples}</span>
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-zinc-600">
        {data.selectedSources.length === 0
          ? "No external sources selected — analysis will use company website only."
          : `${data.selectedSources.length} of ${SOURCE_OPTIONS.length} external sources selected.`}
      </p>
    </div>
  );
}
