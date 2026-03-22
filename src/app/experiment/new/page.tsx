"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  ArrowRight,
  Beaker,
  FileText,
  Loader2,
  Upload,
  X,
  Globe,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/form/step-indicator";
import ScanlineOverlay from "@/components/scanline-overlay";
import type {
  ExperimentDesignDocument,
  ExperimentGoal,
  ExperimentResultsReport,
  ExperimentSuccessMetric,
  ExperimentType,
  ExperimentLiveMetrics,
  FitCheckReport,
  MediaAttachment,
  PanelReaction,
  Persona,
} from "@/lib/types";

const STEPS = [
  { label: "Goals", description: "What you're testing" },
  { label: "Stimulus", description: "Materials to show" },
  { label: "Hypothesis", description: "Optional hunch" },
  { label: "Personas", description: "Who's in the pool" },
  { label: "Review", description: "Build plan" },
];

const GOALS: { value: ExperimentGoal; label: string }[] = [
  { value: "new_release", label: "New release" },
  { value: "pricing_test", label: "Pricing test" },
  { value: "positioning_test", label: "Positioning test" },
  { value: "lead_intent", label: "Lead intent" },
  { value: "messaging_test", label: "Messaging test" },
  { value: "competitive_displacement", label: "Competitive displacement" },
];

const EXP_TYPES: { value: ExperimentType; label: string }[] = [
  { value: "ab_test", label: "A/B test" },
  { value: "concept_test", label: "Concept test" },
  { value: "price_sensitivity", label: "Price sensitivity" },
  { value: "message_recall", label: "Message recall" },
  { value: "competitive_displacement", label: "Competitive displacement" },
];

const METRICS: { value: ExperimentSuccessMetric; label: string }[] = [
  { value: "conversion_likelihood", label: "Conversion likelihood" },
  { value: "objection_reduction", label: "Objection reduction" },
  { value: "recall_score", label: "Recall score" },
  { value: "willingness_to_pay", label: "Willingness to pay" },
  { value: "displacement_rate", label: "Displacement rate" },
];

async function processFile(file: File): Promise<MediaAttachment | null> {
  const type = file.type;
  if (type.startsWith("image/")) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({
          type: "image",
          name: file.name,
          dataUrl: reader.result as string,
          extractedText: null,
          mimeType: type,
        });
      reader.readAsDataURL(file);
    });
  }
  if (type === "application/pdf") {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/parse-pdf", { method: "POST", body: formData });
      if (!res.ok) return null;
      const { text } = (await res.json()) as { text: string };
      return { type: "pdf", name: file.name, dataUrl: null, extractedText: text, mimeType: type };
    } catch {
      return null;
    }
  }
  if (type.startsWith("video/")) {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;
      video.currentTime = 0.5;
      video.muted = true;
      video.onloadeddata = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        URL.revokeObjectURL(objectUrl);
        resolve({ type: "video", name: file.name, dataUrl, extractedText: null, mimeType: type });
      };
      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
    });
  }
  return null;
}

function cleanStream(raw: string): string {
  return raw.replace(/\s*\[(?:SENTIMENT|FOLLOW_UP)[^\]]*\]?\s*$/gi, "").trim();
}

type UiPhase = "wizard" | "design" | "running" | "complete";

function NewExperimentPageContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId") ?? "";
  const { status } = useSession();

  const [report, setReport] = useState<FitCheckReport | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<UiPhase>("wizard");

  const [goal, setGoal] = useState<ExperimentGoal>("messaging_test");
  const [experimentType, setExperimentType] = useState<ExperimentType>("concept_test");
  const [successMetric, setSuccessMetric] =
    useState<ExperimentSuccessMetric>("conversion_likelihood");

  const [stimulusText, setStimulusText] = useState("");
  const [stimulusTextB, setStimulusTextB] = useState("");
  const [media, setMedia] = useState<MediaAttachment | null>(null);
  const [mediaB, setMediaB] = useState<MediaAttachment | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlInputB, setUrlInputB] = useState("");
  const [fetchingUrl, setFetchingUrl] = useState(false);

  const [hypothesis, setHypothesis] = useState("");
  const [adjacentNote, setAdjacentNote] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [design, setDesign] = useState<ExperimentDesignDocument | null>(null);
  const [designLoading, setDesignLoading] = useState(false);
  const [designError, setDesignError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<ExperimentLiveMetrics | null>(null);
  const [feed, setFeed] = useState<
    { key: string; variant?: string | null; stepLabel: string; reaction: PanelReaction }[]
  >([]);
  const [streaming, setStreaming] = useState<Map<string, string>>(new Map());
  const [thinkingId, setThinkingId] = useState<string | null>(null);
  const [results, setResults] = useState<ExperimentResultsReport | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/report/${jobId}`);
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error ?? `Report ${res.status}`);
        }
        if (res.status === 202) {
          throw new Error("Report is still processing. Open it when complete, then return here.");
        }
        const data = (await res.json()) as FitCheckReport;
        if (cancelled) return;
        setReport(data);
        const ids = data.icpStudio.personas.map((p) => p.id);
        setSelectedIds(new Set(ids));
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load report");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const personas = report?.icpStudio.personas ?? [];
  const activePersonas = useMemo(
    () => personas.filter((p) => selectedIds.has(p.id)),
    [personas, selectedIds],
  );

  function togglePersona(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 2) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const stimulusSummary = useMemo(() => {
    const parts: string[] = [];
    if (stimulusText.trim()) parts.push(`Primary copy / notes:\n${stimulusText.trim()}`);
    if (media?.extractedText) parts.push(`[${media.name}]\n${media.extractedText.slice(0, 8000)}`);
    else if (media) parts.push(`[Media: ${media.name} type=${media.type}]`);
    if (experimentType === "ab_test") {
      if (stimulusTextB.trim()) parts.push(`Variant B copy:\n${stimulusTextB.trim()}`);
      if (mediaB?.extractedText) parts.push(`[B: ${mediaB.name}]\n${mediaB.extractedText.slice(0, 8000)}`);
      else if (mediaB) parts.push(`[Variant B media: ${mediaB.name}]`);
    }
    return parts.join("\n\n---\n\n") || "(stimulus to be supplied at runtime)";
  }, [stimulusText, stimulusTextB, media, mediaB, experimentType]);

  function validateStep(s: number): string | null {
    if (s === 1) {
      if (!stimulusText.trim() && !media) return "Add stimulus text, a URL/file, or both.";
      if (experimentType === "ab_test") {
        if (!stimulusTextB.trim() && !mediaB) return "A/B tests need variant B (text and/or media).";
      }
    }
    if (s === 3 && activePersonas.length < 2) return "Select at least two personas.";
    return null;
  }

  async function fetchUrl(target: "a" | "b") {
    const raw = target === "a" ? urlInput.trim() : urlInputB.trim();
    if (!raw || fetchingUrl) return;
    setFetchingUrl(true);
    try {
      const res = await fetch("/api/scrape-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: raw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "URL fetch failed");
      if (target === "a") {
        setMedia(data as MediaAttachment);
        setUrlInput("");
      } else {
        setMediaB(data as MediaAttachment);
        setUrlInputB("");
      }
    } catch (e) {
      setDesignError(e instanceof Error ? e.message : "URL error");
    } finally {
      setFetchingUrl(false);
    }
  }

  async function buildDesignDocument() {
    setDesignLoading(true);
    setDesignError(null);
    try {
      const res = await fetch("/api/experiment/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          experimentType,
          successMetric,
          hypothesis: hypothesis.trim() || undefined,
          stimulusSummary,
          hasAbVariants: experimentType === "ab_test",
          adjacentProfileNote: adjacentNote.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Design failed");
      setDesign(data as ExperimentDesignDocument);
      setPhase("design");
    } catch (e) {
      setDesignError(e instanceof Error ? e.message : "Design failed");
    } finally {
      setDesignLoading(false);
    }
  }

  const runSession = useCallback(async () => {
    if (!design || !report) return;
    setPhase("running");
    setRunError(null);
    setFeed([]);
    setStreaming(new Map());
    setResults(null);
    setMetrics(null);

    try {
      const res = await fetch("/api/experiment/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          companyName: report.companyName,
          goal,
          successMetric,
          design,
          personas: activePersonas,
          experimentType,
          stimulus: stimulusText.trim() || undefined,
          stimulusVariantB:
            experimentType === "ab_test" ? stimulusTextB.trim() || undefined : undefined,
          media: media ?? undefined,
          mediaVariantB: experimentType === "ab_test" ? mediaB ?? undefined : undefined,
          adjacentProfileNote: adjacentNote.trim() || undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const t = await res.text();
        throw new Error(t || "Run failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6)) as Record<string, unknown>;
            const t = ev.type as string;

            if (t === "persona_reaction_start") {
              setThinkingId(ev.personaId as string);
              setStreaming((prev) => new Map(prev).set(ev.personaId as string, ""));
            }
            if (t === "persona_reaction_chunk") {
              const pid = ev.personaId as string;
              const delta = ev.delta as string;
              setStreaming((prev) => {
                const next = new Map(prev);
                next.set(pid, (next.get(pid) ?? "") + delta);
                return next;
              });
            }
            if (t === "persona_reaction_complete") {
              const r = ev.reaction as PanelReaction;
              const stepLabel = (ev.stepLabel as string) ?? "";
              const variant = (ev.variant as string | null) ?? null;
              setThinkingId(null);
              setStreaming((prev) => {
                const next = new Map(prev);
                next.delete(r.personaId);
                return next;
              });
              setFeed((prev) => [
                ...prev,
                {
                  key: `${r.personaId}-${r.timestamp}`,
                  variant,
                  stepLabel,
                  reaction: r,
                },
              ]);
            }
            if (t === "metrics_update") {
              setMetrics(ev.metrics as ExperimentLiveMetrics);
            }
            if (t === "complete") {
              setResults(ev.results as ExperimentResultsReport);
              setPhase("complete");
            }
            if (t === "error") {
              throw new Error((ev.error as string) ?? "Session error");
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Session failed");
      setPhase("design");
    }
  }, [
    design,
    report,
    jobId,
    goal,
    successMetric,
    activePersonas,
    experimentType,
    stimulusText,
    stimulusTextB,
    media,
    mediaB,
    adjacentNote,
  ]);

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-sm text-muted-foreground">Sign in to use Experiment Mode.</p>
      </div>
    );
  }

  if (!jobId) {
    return (
      <div className="min-h-screen relative">
        <ScanlineOverlay />
        <div className="relative z-20 max-w-lg mx-auto py-24 px-6 space-y-4">
          <h1 className="font-mono text-xl text-neon-cyan font-bold tracking-wider">EXPERIMENT MODE</h1>
          <p className="text-sm text-muted-foreground">
            Open this page from a completed FitCheck report (Focus Group tab) with a job ID, or append{" "}
            <code className="text-neon-amber">?jobId=YOUR_JOB_ID</code> to the URL.
          </p>
          <Link href="/reports" className="inline-flex text-sm text-neon-green hover:underline font-mono">
            Go to reports →
          </Link>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen relative flex items-center justify-center px-6">
        <ScanlineOverlay />
        <div className="relative z-20 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-neon-pink mx-auto" />
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Link href={`/report/${jobId}`} className="text-neon-cyan text-sm font-mono hover:underline">
            Open report
          </Link>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <ScanlineOverlay />
      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 py-3 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href={`/report/${jobId}`}
            className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-neon-cyan"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="font-mono text-[10px] tracking-wider">REPORT</span>
          </Link>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <Beaker className="h-4 w-4 text-neon-cyan" />
            <span className="font-mono text-neon-cyan font-bold text-sm tracking-wider">
              EXPERIMENT<span className="blink">_</span>
            </span>
          </div>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground tracking-widest">
          {report.companyName}
        </span>
      </nav>

      <main className="relative z-20 px-6 py-8 max-w-6xl mx-auto">
        {phase === "wizard" && (
          <div className="max-w-2xl mx-auto space-y-8">
            <StepIndicator steps={STEPS} currentStep={step} />
            {step === 0 && (
              <div className="space-y-4 border border-border rounded-sm p-6 bg-card/30">
                <h2 className="font-mono text-xs text-neon-cyan tracking-widest">GOALS & TYPE</h2>
                <label className="block space-y-1">
                  <span className="font-mono text-[10px] text-muted-foreground">Experiment goal</span>
                  <select
                    value={goal}
                    onChange={(e) => setGoal(e.target.value as ExperimentGoal)}
                    className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm"
                  >
                    {GOALS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="font-mono text-[10px] text-muted-foreground">Experiment type</span>
                  <select
                    value={experimentType}
                    onChange={(e) => setExperimentType(e.target.value as ExperimentType)}
                    className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm"
                  >
                    {EXP_TYPES.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="font-mono text-[10px] text-muted-foreground">Success metric</span>
                  <select
                    value={successMetric}
                    onChange={(e) => setSuccessMetric(e.target.value as ExperimentSuccessMetric)}
                    className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm"
                  >
                    {METRICS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6 border border-border rounded-sm p-6 bg-card/30">
                <h2 className="font-mono text-xs text-neon-amber tracking-widest">STIMULUS</h2>
                <textarea
                  value={stimulusText}
                  onChange={(e) => setStimulusText(e.target.value)}
                  placeholder="Paste landing copy, positioning notes, or a one-pager…"
                  rows={5}
                  className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm"
                />
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), fetchUrl("a"))}
                    placeholder="https://…"
                    className="flex-1 min-w-[200px] bg-background border border-border rounded-sm px-3 py-2 font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={fetchingUrl}
                    onClick={() => fetchUrl("a")}
                    className="font-mono text-[10px]"
                  >
                    <Globe className="h-3 w-3 mr-1" />
                    FETCH URL
                  </Button>
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 border border-border rounded-sm font-mono text-[10px] hover:border-neon-cyan/50">
                      <Upload className="h-3 w-3" />
                      FILE
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf,video/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const m = await processFile(f);
                        if (m) setMedia(m);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                {media && (
                  <div className="flex items-center justify-between border border-border rounded-sm px-3 py-2">
                    <span className="font-mono text-xs truncate">{media.name}</span>
                    <button type="button" onClick={() => setMedia(null)} aria-label="Remove">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {experimentType === "ab_test" && (
                  <div className="pt-4 border-t border-border space-y-3">
                    <p className="font-mono text-[10px] text-neon-purple tracking-wider">VARIANT B</p>
                    <textarea
                      value={stimulusTextB}
                      onChange={(e) => setStimulusTextB(e.target.value)}
                      placeholder="Variant B copy (or rely on media only)"
                      rows={4}
                      className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm"
                    />
                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        value={urlInputB}
                        onChange={(e) => setUrlInputB(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), fetchUrl("b"))}
                        placeholder="URL for variant B"
                        className="flex-1 min-w-[200px] bg-background border border-border rounded-sm px-3 py-2 font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={fetchingUrl}
                        onClick={() => fetchUrl("b")}
                        className="font-mono text-[10px]"
                      >
                        FETCH B
                      </Button>
                      <label className="cursor-pointer">
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 border border-border rounded-sm font-mono text-[10px]">
                          <Upload className="h-3 w-3" />
                          FILE B
                        </span>
                        <input
                          type="file"
                          accept="image/*,application/pdf,video/*"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const m = await processFile(f);
                            if (m) setMediaB(m);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    {mediaB && (
                      <div className="flex items-center justify-between border border-border rounded-sm px-3 py-2">
                        <span className="font-mono text-xs truncate">{mediaB.name}</span>
                        <button type="button" onClick={() => setMediaB(null)} aria-label="Remove B">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="border border-border rounded-sm p-6 bg-card/30">
                <h2 className="font-mono text-xs text-neon-green tracking-widest mb-3">HYPOTHESIS</h2>
                <textarea
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  placeholder="Optional — what you believe will happen"
                  rows={4}
                  className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm"
                />
              </div>
            )}

            {step === 3 && (
              <div className="border border-border rounded-sm p-6 bg-card/30 space-y-4">
                <h2 className="font-mono text-xs text-neon-pink tracking-widest">PERSONA SCOPE</h2>
                <p className="text-xs text-muted-foreground font-mono">
                  Toggle who participates (minimum 2). Pool comes from this report&apos;s ICP Studio.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {personas.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePersona(p.id)}
                      className={cn(
                        "text-left border rounded-sm px-3 py-2 font-mono text-xs transition-colors",
                        selectedIds.has(p.id)
                          ? "border-neon-cyan/50 bg-neon-cyan/5"
                          : "border-border opacity-60",
                      )}
                    >
                      <div className="font-bold text-foreground">{p.name}</div>
                      <div className="text-muted-foreground truncate">{p.title}</div>
                    </button>
                  ))}
                </div>
                <div>
                  <label className="font-mono text-[10px] text-muted-foreground block mb-1">
                    Adjacent profile (optional)
                  </label>
                  <textarea
                    value={adjacentNote}
                    onChange={(e) => setAdjacentNote(e.target.value)}
                    placeholder="e.g. “Also consider a finance-adjacent buyer who cares about compliance…”"
                    rows={3}
                    className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm"
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="border border-border rounded-sm p-6 bg-card/30 space-y-3 text-sm">
                <h2 className="font-mono text-xs text-neon-amber tracking-widest">REVIEW</h2>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground font-mono text-xs">
                  <li>Goal: {GOALS.find((g) => g.value === goal)?.label}</li>
                  <li>Type: {EXP_TYPES.find((g) => g.value === experimentType)?.label}</li>
                  <li>Metric: {METRICS.find((g) => g.value === successMetric)?.label}</li>
                  <li>Personas: {activePersonas.length}</li>
                  <li>{experimentType === "ab_test" ? "A/B arms with split pool" : "Single stimulus path"}</li>
                </ul>
                {designError && (
                  <p className="text-neon-pink text-xs font-mono flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3" />
                    {designError}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => (step > 0 ? setStep((s) => s - 1) : null)}
                disabled={step === 0}
                className="font-mono text-[10px]"
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                BACK
              </Button>
              {step < STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={() => {
                    const err = validateStep(step);
                    if (err) {
                      setDesignError(err);
                      return;
                    }
                    setDesignError(null);
                    setStep((s) => s + 1);
                  }}
                  className="font-mono text-[10px] bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40"
                >
                  NEXT
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={designLoading}
                  onClick={() => {
                    const err = validateStep(3);
                    if (err) {
                      setDesignError(err);
                      return;
                    }
                    void buildDesignDocument();
                  }}
                  className="font-mono text-[10px] bg-neon-amber/20 text-neon-amber border border-neon-amber/40"
                >
                  {designLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      BUILDING PLAN…
                    </>
                  ) : (
                    <>
                      <FileText className="h-3 w-3 mr-1" />
                      GENERATE DESIGN DOC
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {phase === "design" && design && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h1 className="font-mono text-lg text-neon-amber font-bold tracking-wider">
                EXPERIMENT DESIGN DOCUMENT
              </h1>
              <Button
                type="button"
                variant="outline"
                className="font-mono text-[10px]"
                onClick={() => {
                  setPhase("wizard");
                  setStep(0);
                }}
              >
                Edit inputs
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4 border border-border rounded-sm p-6 bg-card/20 font-mono text-sm">
                <section>
                  <h3 className="text-[10px] text-neon-cyan tracking-widest mb-1">TESTABLE HYPOTHESIS</h3>
                  <p className="text-foreground leading-relaxed">{design.testableHypothesis}</p>
                </section>
                <section>
                  <h3 className="text-[10px] text-neon-cyan tracking-widest mb-1">METHODOLOGY</h3>
                  <p className="text-muted-foreground leading-relaxed">{design.methodology}</p>
                </section>
                <section>
                  <h3 className="text-[10px] text-neon-cyan tracking-widest mb-1">STIMULUS ORDER</h3>
                  <ol className="list-decimal pl-4 text-muted-foreground space-y-1">
                    {design.stimulusPresentationOrder.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </section>
                <section>
                  <h3 className="text-[10px] text-neon-cyan tracking-widest mb-1">PROBE QUESTIONS</h3>
                  <ul className="list-disc pl-4 text-muted-foreground space-y-1">
                    {design.probeQuestions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </section>
                <section className="grid sm:grid-cols-3 gap-3 text-xs">
                  <div className="border border-neon-green/30 rounded-sm p-3 bg-neon-green/5">
                    <div className="text-neon-green font-bold mb-1">Positive</div>
                    {design.positiveResult}
                  </div>
                  <div className="border border-border rounded-sm p-3">
                    <div className="text-muted-foreground font-bold mb-1">Neutral</div>
                    {design.neutralResult}
                  </div>
                  <div className="border border-neon-pink/30 rounded-sm p-3 bg-neon-pink/5">
                    <div className="text-neon-pink font-bold mb-1">Negative</div>
                    {design.negativeResult}
                  </div>
                </section>
              </div>

              <div className="border border-border rounded-sm p-4 h-fit lg:sticky lg:top-24 bg-card/30">
                <p className="font-mono text-[10px] text-muted-foreground tracking-wider mb-3">
                  ORCHESTRATION STEPS
                </p>
                <ol className="space-y-2 font-mono text-[10px] text-muted-foreground">
                  {design.steps.map((s, i) => (
                    <li key={i} className="border-l-2 border-neon-cyan/30 pl-2">
                      <span className="text-neon-amber">{s.type}</span>
                      {s.variant ? ` · ${s.variant}` : ""} — {s.label}
                    </li>
                  ))}
                </ol>
                <Button
                  type="button"
                  className="w-full mt-6 font-mono text-[10px] bg-neon-green/20 text-neon-green border border-neon-green/40"
                  onClick={() => void runSession()}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  CONFIRM & RUN SESSION
                </Button>
                {runError && <p className="text-neon-pink text-xs mt-2 font-mono">{runError}</p>}
              </div>
            </div>
          </div>
        )}

        {(phase === "running" || phase === "complete") && (
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="space-y-4">
              <h2 className="font-mono text-sm text-neon-cyan tracking-wider">
                {phase === "running" ? "LIVE SESSION" : "RESULTS"}
              </h2>
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {feed.map((item) => (
                  <div
                    key={item.key}
                    className={cn(
                      "border rounded-sm p-3 text-sm",
                      item.variant === "A"
                        ? "border-neon-cyan/40 bg-neon-cyan/5"
                        : item.variant === "B"
                          ? "border-neon-purple/40 bg-neon-purple/5"
                          : "border-border bg-card/40",
                    )}
                  >
                    <div className="font-mono text-[9px] text-muted-foreground mb-1">
                      {item.stepLabel}
                      {item.variant ? ` · VARIANT ${item.variant}` : ""}
                    </div>
                    <div className="font-bold text-xs">{item.reaction.personaName}</div>
                    <p className="text-foreground mt-1">{item.reaction.content}</p>
                  </div>
                ))}
                {thinkingId && (
                  <div className="border border-dashed border-border rounded-sm p-3 font-mono text-xs text-muted-foreground animate-pulse">
                    {streaming.get(thinkingId) ? cleanStream(streaming.get(thinkingId)!) : "Thinking…"}
                  </div>
                )}
              </div>

              {results && (
                <div className="border border-border rounded-sm p-6 space-y-4 font-mono text-sm mt-6">
                  <h3 className="text-neon-amber text-xs tracking-widest">EXPERIMENT RESULTS REPORT</h3>
                  <p>
                    <span className="text-muted-foreground">Hypothesis: </span>
                    <span className="text-foreground font-bold">{results.hypothesisStatus}</span>
                    <span className="text-muted-foreground ml-2">
                      (confidence: {results.confidenceLevel})
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Weighted PMF delta (A/B proxy): </span>
                    {results.weightedPmfDelta.toFixed(1)}
                  </p>
                  <div>
                    <div className="text-[10px] text-neon-cyan mb-1">Per-persona scores</div>
                    <ul className="text-xs space-y-1 text-muted-foreground max-h-40 overflow-y-auto">
                      {results.personaScoresByVariant.map((r) => (
                        <li key={`${r.personaId}-${r.variant}`}>
                          {r.personaName} ({r.variant}): {r.conversionScore}
                          {r.recallHit ? " · recall hit" : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[10px] text-neon-cyan mb-1">Top objections by variant</div>
                    <pre className="text-[10px] whitespace-pre-wrap text-muted-foreground bg-background/50 p-2 rounded-sm max-h-48 overflow-y-auto">
                      {JSON.stringify(results.topObjectionsByVariant, null, 2)}
                    </pre>
                  </div>
                  <p className="text-foreground leading-relaxed">{results.messageRecallComparison}</p>
                  <p className="text-foreground leading-relaxed border-t border-border pt-3">
                    {results.plainLanguageRecommendation}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{results.disclaimer}</p>
                  <Link
                    href={`/report/${jobId}`}
                    className="inline-block text-neon-cyan text-xs hover:underline"
                  >
                    ← Back to report
                  </Link>
                </div>
              )}
            </div>

            <aside className="border border-border rounded-sm p-4 h-fit lg:sticky lg:top-24 bg-card/40 space-y-4">
              <h3 className="font-mono text-[10px] text-neon-amber tracking-widest">LIVE METRICS</h3>
              {metrics ? (
                <dl className="space-y-3 font-mono text-xs">
                  <div>
                    <dt className="text-muted-foreground">Conversion delta (A−B)</dt>
                    <dd className="text-lg text-neon-cyan">
                      {metrics.conversionDeltaAB != null
                        ? metrics.conversionDeltaAB.toFixed(3)
                        : "— (single arm)"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Arm A score</dt>
                    <dd>{metrics.variantAScore.toFixed(3)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Arm B score</dt>
                    <dd>{metrics.variantBScore.toFixed(3)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Objection-class reactions</dt>
                    <dd>{metrics.objectionCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Recall hits</dt>
                    <dd>{metrics.recallHits}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Total reactions</dt>
                    <dd>{metrics.totalReactions}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-xs text-muted-foreground font-mono">
                  Metrics populate as personas respond.
                </p>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

export default function NewExperimentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-neon-cyan" />
        </div>
      }
    >
      <NewExperimentPageContent />
    </Suspense>
  );
}
