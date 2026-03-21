"use client";

import { useState } from "react";
import { Plus, Trash2, Link2, Sparkles, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export interface CompetitorsData {
  competitorUrls: string[];
}

interface CompetitorsStepProps {
  data: CompetitorsData;
  errors: Partial<{ competitorUrls: string[] }>;
  onChange: (data: CompetitorsData) => void;
  companyName?: string;
  websiteUrl?: string;
}

const MAX_COMPETITORS = 3;

export function CompetitorsStep({
  data,
  errors,
  onChange,
  companyName,
  websiteUrl,
}: CompetitorsStepProps) {
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const urls = data.competitorUrls.length > 0 ? data.competitorUrls : [""];

  const setUrl = (index: number, value: string) => {
    const next = [...urls];
    next[index] = value;
    onChange({ competitorUrls: next.filter((u, i) => i < next.length) });
  };

  const addUrl = () => {
    if (urls.length < MAX_COMPETITORS) {
      onChange({ competitorUrls: [...urls, ""] });
    }
  };

  const removeUrl = (index: number) => {
    const next = urls.filter((_, i) => i !== index);
    onChange({ competitorUrls: next.length > 0 ? next : [""] });
  };

  const canAutoFind = !!(companyName?.trim() && websiteUrl?.trim());

  async function handleAutoFind() {
    if (!canAutoFind) return;
    setSearching(true);
    setSearchError(null);

    try {
      const res = await fetch("/api/find-competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, websiteUrl }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? `Request failed (${res.status})`);
      }

      const found: string[] = json.competitors ?? [];
      if (found.length === 0) {
        setSearchError("No competitors found. Try adding them manually.");
        return;
      }

      // Merge found URLs with any existing non-empty ones, cap at MAX_COMPETITORS
      const existing = urls.filter((u) => u.trim());
      const merged = [
        ...existing,
        ...found.filter((u) => !existing.includes(u)),
      ].slice(0, MAX_COMPETITORS);

      onChange({
        competitorUrls: merged.length > 0 ? merged : [""],
      });
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : "Auto-search failed. Try again."
      );
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-xl font-semibold">Competitor URLs</h2>
          <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
            Optional
          </span>
        </div>
        <p className="text-sm text-zinc-400">
          Add up to {MAX_COMPETITORS} competitor websites. FitCheck will factor
          their positioning into your analysis.
        </p>
      </div>

      {/* Auto-find banner */}
      <div className="flex items-center justify-between rounded-lg border border-zinc-700/60 bg-zinc-900/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400 shrink-0" />
          <span className="text-xs text-zinc-300">
            Let AI find your top competitors automatically
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAutoFind}
          disabled={searching || !canAutoFind}
          className="ml-4 shrink-0 gap-1.5 border border-violet-500/40 bg-violet-500/10 font-mono text-[10px] tracking-wider text-violet-300 hover:bg-violet-500/20 hover:text-violet-200 disabled:opacity-40"
          title={
            canAutoFind
              ? "Auto-search for competitors"
              : "Enter your company name and website first"
          }
        >
          {searching ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              SEARCHING...
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" />
              AUTO-FIND
            </>
          )}
        </Button>
      </div>

      {searchError && (
        <p className="rounded-sm border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
          {searchError}
        </p>
      )}

      <div className="space-y-3">
        {urls.map((url, i) => (
          <div key={i} className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Link2 className="h-3 w-3" />
              Competitor {i + 1}
            </Label>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder={`https://competitor${i + 1}.com`}
                value={url}
                onChange={(e) => setUrl(i, e.target.value)}
                className={
                  errors.competitorUrls?.[i] ? "border-destructive" : ""
                }
              />
              {urls.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeUrl(i)}
                  className="shrink-0 text-zinc-500 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            {errors.competitorUrls?.[i] && (
              <p className="text-xs text-red-400">
                {errors.competitorUrls[i]}
              </p>
            )}
          </div>
        ))}

        {urls.length < MAX_COMPETITORS && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addUrl}
            className="gap-1.5 text-zinc-400 hover:text-zinc-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Add another competitor
          </Button>
        )}
      </div>

      {urls.every((u) => !u.trim()) && (
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-500">
          Skipping is fine. The analysis will still surface insights about your
          brand without competitor comparison.
        </p>
      )}
    </div>
  );
}
