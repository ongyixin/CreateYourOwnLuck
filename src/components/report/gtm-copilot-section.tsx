"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Rocket,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GtmPlanReview } from "./gtm-plan-review";
import { GtmAssetGallery } from "./gtm-asset-gallery";
import type {
  GtmStrategy,
  GtmAssetRecord,
  GtmPlanStatus,
  GtmPlanRecord,
  GtmSseEvent,
  GtmAgentType,
} from "@/lib/types";

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface GtmCopilotSectionProps {
  jobId: string;
}

type LocalState =
  | { phase: "idle" }
  | { phase: "generating_plan" }
  | { phase: "plan_ready"; planId: string; plan: GtmStrategy }
  | { phase: "approving"; planId: string; plan: GtmStrategy }
  | { phase: "executing"; planId: string; plan: GtmStrategy; assets: GtmAssetRecord[]; activeAgents: Set<GtmAgentType> }
  | { phase: "complete"; planId: string; plan: GtmStrategy; assets: GtmAssetRecord[] }
  | { phase: "error"; message: string };

// ──────────────────────────────────────────────────────────
// SSE reader helper
// ──────────────────────────────────────────────────────────

async function readSseStream(
  url: string,
  body: object,
  onEvent: (event: GtmSseEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(line.slice(6)) as GtmSseEvent;
        onEvent(event);
      } catch { /* ignore malformed */ }
    }
  }
}

// ──────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────

export function GtmCopilotSection({ jobId }: GtmCopilotSectionProps) {
  const [state, setState] = useState<LocalState>({ phase: "idle" });
  const [thinkingLog, setThinkingLog] = useState<string[]>([]);
  const [sectionOpen, setSectionOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // On mount: check if there's already a plan for this job
  useEffect(() => {
    let cancelled = false;

    async function fetchExistingPlan() {
      try {
        const res = await fetch(`/api/gtm/plan?jobId=${encodeURIComponent(jobId)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { plan: GtmPlanRecord | null };
        if (cancelled || !data.plan) return;

        const plan = data.plan;
        const strategy = (plan.editedJson ?? plan.planJson) as GtmStrategy | null;
        if (!strategy) return;

        const status = plan.status as GtmPlanStatus;

        if (status === "complete") {
          setState({
            phase: "complete",
            planId: plan.id,
            plan: strategy,
            assets: plan.assets,
          });
          setSectionOpen(true);
        } else if (status === "executing") {
          // Resume execution view
          setState({
            phase: "executing",
            planId: plan.id,
            plan: strategy,
            assets: plan.assets,
            activeAgents: new Set(),
          });
          setSectionOpen(true);
        } else if (status === "approved" || status === "ready") {
          setState({ phase: "plan_ready", planId: plan.id, plan: strategy });
          setSectionOpen(true);
        }
      } catch { /* ignore */ }
    }

    fetchExistingPlan();
    return () => { cancelled = true; };
  }, [jobId]);

  const handleGeneratePlan = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setState({ phase: "generating_plan" });
    setThinkingLog([]);
    setSectionOpen(true);

    try {
      let planId = "";
      let planStrategy: GtmStrategy | null = null;

      await readSseStream(
        "/api/gtm/plan",
        { jobId },
        (event) => {
          if (event.type === "plan_thinking") {
            setThinkingLog((prev) => [...prev, event.content ?? ""]);
          } else if (event.type === "plan_complete") {
            planId = event.planId ?? "";
            planStrategy = event.plan ?? null;
          } else if (event.type === "error") {
            throw new Error(event.error ?? "Unknown error");
          }
        },
        ac.signal,
      );

      if (planStrategy && planId) {
        setState({ phase: "plan_ready", planId, plan: planStrategy });
      } else {
        setState({ phase: "error", message: "Plan generation completed but returned no data." });
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState({ phase: "error", message: (err as Error).message });
    }
  }, [jobId]);

  const handleApprovePlan = useCallback(
    async (editedStrategy: GtmStrategy) => {
      if (state.phase !== "plan_ready") return;
      const { planId } = state;

      setState({ phase: "approving", planId, plan: editedStrategy });

      // Save edits
      try {
        const res = await fetch("/api/gtm/plan", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId, editedJson: editedStrategy }),
        });
        if (!res.ok) throw new Error("Failed to save plan");
      } catch (err) {
        setState({ phase: "error", message: (err as Error).message });
        return;
      }

      // Execute
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setState({
        phase: "executing",
        planId,
        plan: editedStrategy,
        assets: [],
        activeAgents: new Set(),
      });

      try {
        await readSseStream(
          "/api/gtm/execute",
          { planId },
          (event) => {
            if (event.type === "agent_start") {
              setState((prev) => {
                if (prev.phase !== "executing") return prev;
                const next = new Set(prev.activeAgents);
                if (event.agent) next.add(event.agent);
                return { ...prev, activeAgents: next };
              });
            } else if (event.type === "asset_complete") {
              setState((prev) => {
                if (prev.phase !== "executing") return prev;
                const next = new Set(prev.activeAgents);
                if (event.agent) next.delete(event.agent);
                return {
                  ...prev,
                  assets: [...prev.assets, event.asset!],
                  activeAgents: next,
                };
              });
            } else if (event.type === "execution_complete") {
              setState((prev) => {
                if (prev.phase !== "executing") return prev;
                return {
                  phase: "complete",
                  planId: prev.planId,
                  plan: prev.plan,
                  assets: prev.assets,
                };
              });
            } else if (event.type === "error") {
              // Non-fatal: log it but don't crash
              console.warn("[GTM]", event.error);
            }
          },
          ac.signal,
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState((prev) => {
          // If we already reached complete or have partial assets, stay there
          if (prev.phase === "complete") return prev;
          return { phase: "error", message: (err as Error).message };
        });
      }
    },
    [state],
  );

  // ── Rendering ──────────────────────────────────────────────────────────────

  return (
    <div className="mt-10 border-t border-border pt-10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="module-header text-neon-amber">Module 03b</div>
          <h2 className="font-mono text-neon-amber text-xl font-bold tracking-wider flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            BRAND COPILOT
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Turn your recommendations into a concrete GTM execution plan.
          </p>
        </div>
        {(state.phase === "complete" || state.phase === "plan_ready" || state.phase === "executing") && (
          <button
            onClick={() => setSectionOpen((v) => !v)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {sectionOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        )}
      </div>

      {/* State: idle — CTA */}
      {state.phase === "idle" && (
        <div className="terminal-card border-neon-amber/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-mono text-sm font-bold text-foreground tracking-wider">
              FROM DIAGNOSIS TO EXECUTION
            </p>
            <p className="text-muted-foreground text-xs mt-1 leading-relaxed max-w-lg">
              A team of strategy agents will analyze your recommendations and produce a concrete
              GTM plan — messaging rewrites, marketing assets, outreach templates, and A/B test
              specs — ready to execute this week.
            </p>
          </div>
          <button
            onClick={handleGeneratePlan}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded font-mono text-sm font-bold tracking-wider whitespace-nowrap transition-all",
              "bg-neon-amber/10 border border-neon-amber text-neon-amber",
              "hover:bg-neon-amber/20 hover:glow-amber",
              "shrink-0",
            )}
          >
            <Zap className="h-4 w-4" />
            GENERATE GTM PLAN
          </button>
        </div>
      )}

      {/* State: generating plan */}
      {state.phase === "generating_plan" && (
        <div className="space-y-4">
          <div className="terminal-card border-neon-amber/30">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="h-4 w-4 animate-spin text-neon-amber" />
              <span className="font-mono text-neon-amber text-sm font-bold tracking-wider">
                STRATEGIST AGENT RUNNING
              </span>
            </div>
            <div className="space-y-1">
              {thinkingLog.map((line, i) => (
                <p key={i} className="text-muted-foreground text-xs font-mono">
                  <span className="text-neon-amber mr-2">›</span>
                  {line}
                </p>
              ))}
              <div className="flex items-center gap-1 mt-2">
                <span className="text-neon-amber text-xs font-mono">›</span>
                <span className="inline-block w-2 h-3 bg-neon-amber animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* State: plan ready for review */}
      {state.phase === "plan_ready" && sectionOpen && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-neon-amber animate-pulse" />
            <p className="font-mono text-neon-amber text-xs tracking-widest">
              STRATEGY READY — REVIEW AND APPROVE TO GENERATE ASSETS
            </p>
          </div>
          <GtmPlanReview
            strategy={state.plan}
            onApprove={handleApprovePlan}
            isApproving={false}
          />
        </div>
      )}

      {/* State: approving (brief transition) */}
      {state.phase === "approving" && (
        <div className="terminal-card border-neon-amber/30 flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-neon-amber" />
          <span className="font-mono text-neon-amber text-sm tracking-wider">
            PLAN APPROVED — LAUNCHING EXECUTION AGENTS...
          </span>
        </div>
      )}

      {/* State: executing */}
      {state.phase === "executing" && sectionOpen && (
        <div className="space-y-6">
          {/* Agent status bar */}
          <div className="terminal-card border-neon-amber/30">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="h-4 w-4 animate-spin text-neon-amber" />
              <span className="font-mono text-neon-amber text-sm font-bold tracking-wider">
                EXECUTION AGENTS RUNNING
              </span>
              <span className="font-mono text-muted-foreground text-xs">
                ({state.assets.length} assets produced)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["messaging", "creative", "outreach", "growth"] as GtmAgentType[]).map((agent) => {
                const isActive = state.activeAgents.has(agent);
                const count = state.assets.filter((a) => a.agent === agent).length;
                return (
                  <div
                    key={agent}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded border font-mono text-[10px] tracking-wider",
                      isActive
                        ? "border-neon-amber text-neon-amber"
                        : count > 0
                        ? "border-neon-green text-neon-green"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {isActive && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                    {agent.toUpperCase()}
                    {count > 0 && <span>({count})</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live asset gallery */}
          {state.assets.length > 0 && (
            <GtmAssetGallery assets={state.assets} streamingAgents={state.activeAgents} />
          )}
        </div>
      )}

      {/* State: complete */}
      {state.phase === "complete" && sectionOpen && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-neon-green" />
              <p className="font-mono text-neon-green text-xs tracking-widest">
                {state.assets.length} ASSET{state.assets.length !== 1 ? "S" : ""} PRODUCED
              </p>
            </div>
            <button
              onClick={handleGeneratePlan}
              className="font-mono text-[10px] text-muted-foreground hover:text-neon-amber tracking-widest transition-colors"
            >
              REGENERATE PLAN ↺
            </button>
          </div>
          <GtmAssetGallery assets={state.assets} />
        </div>
      )}

      {/* State: error */}
      {state.phase === "error" && (
        <div className="terminal-card border-neon-pink/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-neon-pink mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-mono text-neon-pink text-sm font-bold tracking-wider">
                AGENT ERROR
              </p>
              <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                {state.message}
              </p>
            </div>
            <button
              onClick={handleGeneratePlan}
              className="font-mono text-[10px] text-neon-amber hover:underline tracking-wider shrink-0"
            >
              RETRY
            </button>
          </div>
        </div>
      )}

      {/* Collapsed state indicator for plan_ready / complete */}
      {!sectionOpen &&
        (state.phase === "plan_ready" ||
          state.phase === "complete" ||
          state.phase === "executing") && (
          <button
            onClick={() => setSectionOpen(true)}
            className="text-muted-foreground text-xs font-mono hover:text-neon-amber transition-colors"
          >
            Click to expand —{" "}
            {state.phase === "plan_ready" && "strategy ready for review"}
            {state.phase === "executing" && "execution in progress"}
            {state.phase === "complete" &&
              `${state.assets.length} asset${state.assets.length !== 1 ? "s" : ""} ready`}
          </button>
        )}
    </div>
  );
}
