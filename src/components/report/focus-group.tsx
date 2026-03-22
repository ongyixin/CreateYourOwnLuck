"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Send,
  Loader2,
  ChevronRight,
  MessageSquare,
  BarChart3,
  AlertTriangle,
  ArrowRightLeft,
  LayoutGrid,
  AtSign,
  X,
  Beaker,
} from "lucide-react";
import { cn } from "@/lib/utils";
import NeonBadge from "@/components/neon-badge";
import type {
  FocusGroupAnalytics,
  FocusGroupMessage,
  FocusGroupMode,
  FocusGroupPhase,
  Persona,
} from "@/lib/types";
import { FocusGroupAnalyticsDashboard } from "./focus-group-analytics";
import { FocusGroupPanel } from "./focus-group-panel";
import { useUserTier } from "@/lib/auth/use-user-tier";

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-neon-green",
  "bg-neon-pink",
  "bg-neon-cyan",
  "bg-neon-amber",
  "bg-neon-purple",
];

const PHASE_CONFIG: Record<
  FocusGroupPhase,
  {
    label: string;
    shortLabel: string;
    description: string;
    badgeVariant: "green" | "cyan" | "amber" | "pink" | "purple";
    inputPlaceholder: string;
  }
> = {
  probe: {
    label: "PHASE 1 — YOU ASK",
    shortLabel: "YOU ASK",
    description:
      "Ask the room questions or paste a claim. Personas react, read each other's responses, and interact.",
    badgeVariant: "cyan",
    inputPlaceholder:
      "Paste a headline, pricing page, or claim — or ask the room a question...",
  },
  flip: {
    label: "PHASE 2 — THEY ASK",
    shortLabel: "THEY ASK",
    description:
      "The room interrogates you. Each persona has asked their most pressing question. Answer them.",
    badgeVariant: "pink",
    inputPlaceholder: "Answer the room's questions...",
  },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Persona Roster ───────────────────────────────────────────────────────────

function PersonaRoster({
  personas,
  thinkingPersonaId,
}: {
  personas: Persona[];
  thinkingPersonaId: string | null;
}) {
  return (
    <div className="border border-border rounded-sm p-3 space-y-2">
      <div className="font-mono text-[10px] text-muted-foreground tracking-widest flex items-center gap-1 mb-3">
        <Users className="h-3 w-3" /> THE ROOM
      </div>
      {personas.map((persona, i) => {
        const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
        const isThinking = thinkingPersonaId === persona.id;
        return (
          <div
            key={persona.id}
            className={cn(
              "flex items-center gap-2.5 p-2 rounded-sm transition-colors",
              isThinking
                ? "bg-neon-cyan/5 border border-neon-cyan/20"
                : "border border-transparent"
            )}
          >
            <div
              className={cn(
                "h-7 w-7 rounded-sm flex items-center justify-center text-primary-foreground font-mono text-[10px] font-bold flex-shrink-0",
                color
              )}
            >
              {getInitials(persona.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs text-foreground font-bold truncate">
                {persona.name}
              </p>
              <p className="text-muted-foreground text-[10px] truncate">
                {persona.title}
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              {persona.marketWeight !== undefined && (
                <span className="font-mono text-[10px] text-neon-green">
                  {persona.marketWeight}%
                </span>
              )}
              {isThinking && (
                <Loader2 className="h-3 w-3 text-neon-cyan animate-spin ml-1 inline-block" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Phase indicator + controls ───────────────────────────────────────────────

function PhasePanel({
  phase,
  canFlip,
  isFlipping,
  onFlip,
  isRunning,
}: {
  phase: FocusGroupPhase;
  canFlip: boolean;
  isFlipping: boolean;
  onFlip: () => void;
  isRunning: boolean;
}) {
  const cfg = PHASE_CONFIG[phase];
  return (
    <div className="border border-border rounded-sm p-3 space-y-3">
      <div className="flex items-center gap-2">
        <NeonBadge variant={cfg.badgeVariant}>{cfg.shortLabel}</NeonBadge>
      </div>
      <p className="text-muted-foreground text-[10px] leading-relaxed">
        {cfg.description}
      </p>
      {phase === "probe" && (
        <button
          onClick={onFlip}
          disabled={!canFlip || isRunning || isFlipping}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2 px-3 rounded-sm font-mono text-[10px] font-bold border-2 transition-all tracking-wider",
            canFlip && !isRunning
              ? "border-neon-pink text-neon-pink hover:bg-neon-pink/10"
              : "border-border text-muted-foreground opacity-50 cursor-not-allowed"
          )}
        >
          {isFlipping ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> FLIPPING...
            </>
          ) : (
            <>
              <ArrowRightLeft className="h-3 w-3" /> FLIP THE TABLE →
            </>
          )}
        </button>
      )}
      {phase === "flip" && (
        <div className="font-mono text-[10px] text-neon-pink/70 tracking-widest text-center">
          THE ROOM IS ASKING YOU
        </div>
      )}
    </div>
  );
}

// ─── Chat message bubble ──────────────────────────────────────────────────────

function MessageBubble({
  message,
  personaIndex,
  phase,
}: {
  message: FocusGroupMessage;
  personaIndex: number;
  phase: FocusGroupPhase;
}) {
  const color = AVATAR_COLORS[personaIndex % AVATAR_COLORS.length];

  if (message.role === "system") {
    const isFlipBanner = message.content.includes("PHASE 2");
    return (
      <div className="flex justify-center py-2">
        <span
          className={cn(
            "font-mono text-[10px] tracking-widest border px-4 py-1.5 rounded-sm",
            isFlipBanner
              ? "border-neon-pink/40 text-neon-pink bg-neon-pink/5"
              : "border-border text-muted-foreground"
          )}
        >
          {message.content}
        </span>
      </div>
    );
  }

  if (message.role === "user") {
    return (
      <div className="flex justify-end gap-2">
        <div className="max-w-[80%] rounded-sm px-3 py-2 text-sm leading-relaxed bg-neon-green/10 border border-neon-green/30 text-foreground">
          <p className="font-mono text-[10px] text-neon-green mb-1 font-bold">YOU</p>
          {message.content}
        </div>
      </div>
    );
  }

  // Persona messages in flip phase get a "question" badge
  const isQuestion =
    phase === "flip" &&
    (message.content.includes("?") || message.content.endsWith("?"));

  return (
    <div className="flex gap-2.5 items-start">
      <div
        className={cn(
          "h-7 w-7 rounded-sm flex items-center justify-center text-primary-foreground font-mono text-[10px] font-bold flex-shrink-0 mt-0.5",
          color
        )}
      >
        {getInitials(message.personaName ?? "?")}
      </div>
      <div
        className={cn(
          "max-w-[82%] rounded-sm px-3 py-2 border-2 bg-card text-sm leading-relaxed",
          isQuestion ? "border-neon-pink/30" : "border-neon-cyan/20"
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <p
            className={cn(
              "font-mono text-[10px] font-bold tracking-wider",
              isQuestion ? "text-neon-pink" : "text-neon-cyan"
            )}
          >
            {message.personaName?.toUpperCase()}
          </p>
          {isQuestion && (
            <span className="font-mono text-[9px] text-neon-pink/60 border border-neon-pink/30 px-1 rounded-sm">
              ASKING YOU
            </span>
          )}
        </div>
        <p className="text-foreground">{message.content}</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface FocusGroupSectionProps {
  personas: Persona[];
  jobId: string;
}

export function FocusGroupSection({ personas, jobId }: FocusGroupSectionProps) {
  const { tier, isAdmin } = useUserTier();
  const showPersonaPicker = isAdmin || tier === "PRO" || tier === "AGENCY";

  // Which personas are included — starts as all; localPersonas holds the full array
  // so market-weight SSE updates aren't lost when the user changes the selection.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(personas.map((p) => p.id))
  );

  const [mode, setMode] = useState<FocusGroupMode>("chat");
  const [messages, setMessages] = useState<FocusGroupMessage[]>([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<FocusGroupPhase>("probe");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [thinkingPersonaId, setThinkingPersonaId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<FocusGroupAnalytics | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [localPersonas, setLocalPersonas] = useState<Persona[]>(personas);

  // Preserve order from localPersonas; filter to only the selected set
  const activePersonas = localPersonas.filter((p) => selectedIds.has(p.id));

  function togglePersona(id: string) {
    if (sessionId) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 2) return prev; // enforce minimum 2
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ── @mention / targeting state ───────────────────────────────────────────────
  const [mentionQuery, setMentionQuery]                   = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex]         = useState<number>(-1);
  const [mentionSelectedIndex, setMentionSelectedIndex]   = useState<number>(0);

  const mentionFilteredPersonas = useMemo(() => {
    if (mentionQuery === null) return [];
    return activePersonas.filter((p) =>
      p.name.split(" ")[0].toLowerCase().startsWith(mentionQuery)
    );
  }, [mentionQuery, activePersonas]);

  const targetedPersonaFromInput = useMemo((): Persona | null => {
    const match = input.match(/@(\w+)/);
    if (!match) return null;
    const first = match[1].toLowerCase();
    return activePersonas.find((p) => p.name.split(" ")[0].toLowerCase() === first) ?? null;
  }, [input, activePersonas]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinkingPersonaId]);

  const personaIndexMap = useCallback(
    (personaId: string) => activePersonas.findIndex((p) => p.id === personaId),
    [activePersonas]
  );

  // ── Core SSE reader ──────────────────────────────────────────────────────────

  async function runRound(payload: Record<string, unknown>) {
    const res = await fetch("/api/focus-group/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? "Something went wrong");
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
          const event = JSON.parse(line.slice(6));

          if (event.type === "system_message" || event.type === "user_message") {
            setMessages((prev) => [...prev, event.message]);
            if (event.sessionId && !sessionId) setSessionId(event.sessionId);
          }

          if (event.type === "persona_start") {
            setThinkingPersonaId(event.personaId);
            setLocalPersonas((prev) =>
              prev.map((p) =>
                p.id === event.personaId && event.marketWeight !== undefined
                  ? { ...p, marketWeight: event.marketWeight }
                  : p
              )
            );
          }

          if (event.type === "persona_message") {
            setThinkingPersonaId(null);
            setMessages((prev) => [...prev, event.message]);
          }

          if (event.type === "round_complete") {
            setThinkingPersonaId(null);
            if (event.sessionId) setSessionId(event.sessionId);
          }

          if (event.type === "error") {
            throw new Error(event.error);
          }
        } catch (parseErr) {
          if (parseErr instanceof SyntaxError) continue;
          throw parseErr;
        }
      }
    }
  }

  // ── @mention helpers ─────────────────────────────────────────────────────────

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    const cursor = e.target.selectionStart ?? val.length;
    const textBefore = val.slice(0, cursor);
    const match = textBefore.match(/@(\w*)$/);

    if (match) {
      setMentionQuery(match[1].toLowerCase());
      setMentionStartIndex(cursor - match[0].length);
      setMentionSelectedIndex(0);
    } else {
      setMentionQuery(null);
      setMentionStartIndex(-1);
    }
  }, []);

  const selectMentionPersona = useCallback((persona: Persona) => {
    const firstName = persona.name.split(" ")[0];
    const before = input.slice(0, mentionStartIndex);
    const mentionEnd = mentionStartIndex + 1 + (mentionQuery?.length ?? 0);
    const after = input.slice(mentionEnd);
    const newInput = `${before}@${firstName} ${after.startsWith(" ") ? after.slice(1) : after}`;
    setInput(newInput);
    setMentionQuery(null);
    setMentionStartIndex(-1);
    setMentionSelectedIndex(0);

    requestAnimationFrame(() => {
      if (inputRef.current) {
        const pos = before.length + firstName.length + 2;
        inputRef.current.setSelectionRange(pos, pos);
        inputRef.current.focus();
      }
    });
  }, [input, mentionStartIndex, mentionQuery]);

  // ── Send a probe/flip follow-up message ───────────────────────────────────

  async function sendMessage() {
    const text = input.trim();
    if (!text || isRunning) return;

    // Extract @mention target BEFORE clearing the input
    const mentionMatch = text.match(/@(\w+)/);
    let targetedId: string | undefined;
    if (mentionMatch) {
      const first = mentionMatch[1].toLowerCase();
      const found = activePersonas.find((p) => p.name.split(" ")[0].toLowerCase() === first);
      targetedId = found?.id;
    }

    setInput("");
    setMentionQuery(null);
    setMentionStartIndex(-1);
    setError(null);
    setIsRunning(true);

    try {
      await runRound({
        sessionId,
        jobId,
        personas: activePersonas,
        stimulus: text,
        phase,
        targetedPersonaId: targetedId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error — please try again");
    } finally {
      setThinkingPersonaId(null);
      setIsRunning(false);
      inputRef.current?.focus();
    }
  }

  // ── Flip the table: personas ask questions ───────────────────────────────

  async function flipPhase() {
    if (!sessionId || isRunning || isFlipping) return;

    setIsFlipping(true);
    setError(null);

    try {
      await runRound({
        sessionId,
        jobId,
        personas: activePersonas,
        isFlipInitiation: true,
      });
      setPhase("flip");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error — please try again");
    } finally {
      setThinkingPersonaId(null);
      setIsFlipping(false);
      inputRef.current?.focus();
    }
  }

  // ── Generate analytics report ────────────────────────────────────────────

  async function runAnalysis() {
    if (!sessionId || analyzing) return;
    setAnalyzing(true);
    setError(null);

    try {
      const res = await fetch("/api/focus-group/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Analysis failed");
        return;
      }
      setAnalytics(data as FocusGroupAnalytics);
    } catch {
      setError("Network error during analysis");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery !== null && mentionFilteredPersonas.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionSelectedIndex((i) => (i + 1) % mentionFilteredPersonas.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionSelectedIndex((i) => (i - 1 + mentionFilteredPersonas.length) % mentionFilteredPersonas.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = mentionFilteredPersonas[mentionSelectedIndex];
        if (selected) selectMentionPersona(selected);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        setMentionStartIndex(-1);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const hasMessages = messages.length > 0;
  const personaTurns = messages.filter((m) => m.role === "persona").length;
  // Flip needs at least 1 full probe round; generate report needs at least a flip round too
  const canFlip = phase === "probe" && personaTurns >= activePersonas.length && !!sessionId;
  const canAnalyze =
    personaTurns >= activePersonas.length * 2 && !analyzing && !isRunning && !isFlipping;

  const phaseConfig = PHASE_CONFIG[phase];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="module-header text-neon-amber">Focus Group Mode</div>
          <h2 className="font-mono text-neon-amber text-xl font-bold tracking-wider">
            FOCUS GROUP
          </h2>
          {(isAdmin || tier === "PRO" || tier === "AGENCY") && (
            <Link
              href={`/experiment/new?jobId=${encodeURIComponent(jobId)}`}
              className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] text-neon-cyan/80 hover:text-neon-cyan tracking-wider transition-colors"
            >
              <Beaker className="h-3 w-3" />
              EXPERIMENT MODE
            </Link>
          )}
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 border border-border rounded-sm p-1 self-start">
          <button
            onClick={() => setMode("chat")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-mono text-[10px] font-bold tracking-wider transition-all",
              mode === "chat"
                ? "bg-neon-amber/15 text-neon-amber border border-neon-amber/40"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            )}
          >
            <MessageSquare className="h-3 w-3" />
            CHAT
          </button>
          <button
            onClick={() => setMode("panel")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-mono text-[10px] font-bold tracking-wider transition-all",
              mode === "panel"
                ? "bg-neon-purple/15 text-neon-purple border border-neon-purple/40"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            )}
          >
            <LayoutGrid className="h-3 w-3" />
            PANEL
          </button>
        </div>
      </div>

      {/* Persona picker — PRO / AGENCY only, locked once session starts */}
      {showPersonaPicker && personas.length > 2 && (
        <div className="border border-border rounded-sm p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono text-[10px] text-muted-foreground tracking-widest">
                PARTICIPANTS
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-neon-amber">
                {selectedIds.size}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                / {localPersonas.length}
              </span>
              {!sessionId && selectedIds.size < localPersonas.length && (
                <button
                  onClick={() => setSelectedIds(new Set(localPersonas.map((p) => p.id)))}
                  className="font-mono text-[9px] text-muted-foreground/60 hover:text-foreground tracking-widest transition-colors underline underline-offset-2 ml-1"
                >
                  ALL
                </button>
              )}
              {!!sessionId && (
                <span className="font-mono text-[9px] text-muted-foreground/50 tracking-widest border border-border rounded-sm px-1.5 py-0.5">
                  LOCKED
                </span>
              )}
            </div>
          </div>

          {/* Persona chips */}
          <div className="flex flex-wrap gap-2">
            {localPersonas.map((persona, i) => {
              const isSelected = selectedIds.has(persona.id);
              const isLast = isSelected && selectedIds.size <= 2;
              const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
              return (
                <button
                  key={persona.id}
                  onClick={() => togglePersona(persona.id)}
                  disabled={!!sessionId || isLast}
                  title={
                    isLast
                      ? "Need at least 2 participants"
                      : isSelected
                      ? `Remove ${persona.name}`
                      : `Add ${persona.name}`
                  }
                  className={cn(
                    "group flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-sm border transition-all",
                    isSelected
                      ? "border-neon-amber/40 bg-neon-amber/5 text-foreground hover:border-neon-amber/70 hover:bg-neon-amber/10"
                      : "border-border text-muted-foreground hover:border-border hover:bg-secondary/40",
                    (!!sessionId || isLast) && "cursor-not-allowed opacity-60",
                    !sessionId && !isLast && "cursor-pointer"
                  )}
                >
                  <div
                    className={cn(
                      "h-6 w-6 rounded-[3px] flex items-center justify-center text-primary-foreground font-mono text-[9px] font-bold flex-shrink-0 transition-opacity",
                      color,
                      !isSelected && "opacity-40"
                    )}
                  >
                    {getInitials(persona.name)}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-mono text-[11px] font-bold leading-tight truncate max-w-[100px]">
                      {persona.name}
                    </p>
                    <p className="font-mono text-[9px] text-muted-foreground leading-tight truncate max-w-[120px] hidden sm:block">
                      {persona.title}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Panel mode */}
      {mode === "panel" && (
        <FocusGroupPanel personas={activePersonas} jobId={jobId} sessionId={sessionId} />
      )}

      {/* Chat mode */}
      {mode === "chat" && (<>

      {/* Explainer */}
      <div className="terminal-card border-border">
        <p className="text-muted-foreground text-sm leading-relaxed font-mono">
          Run a two-phase focus group with your ICP personas. In{" "}
          <span className="text-neon-cyan font-bold">Phase 1</span>, you ask — drop a
          headline, pricing claim, or question and watch them react and debate each other.
          In{" "}
          <span className="text-neon-pink font-bold">Phase 2</span>, the table flips —
          each persona asks you the question that&apos;s blocking their decision. Full context
          transfers between phases.
        </p>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-4">
        {/* Sidebar */}
        <div className="space-y-3">
          <PersonaRoster
            personas={activePersonas}
            thinkingPersonaId={thinkingPersonaId}
          />

          <PhasePanel
            phase={phase}
            canFlip={canFlip}
            isFlipping={isFlipping}
            onFlip={flipPhase}
            isRunning={isRunning}
          />

          {/* Generate report button */}
          {hasMessages && (
            <button
              onClick={runAnalysis}
              disabled={!canAnalyze}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-sm font-mono text-[11px] font-bold border-2 transition-all tracking-wider",
                canAnalyze
                  ? "border-neon-amber text-neon-amber hover:bg-neon-amber/10"
                  : "border-border text-muted-foreground cursor-not-allowed opacity-50"
              )}
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> ANALYZING...
                </>
              ) : (
                <>
                  <BarChart3 className="h-3.5 w-3.5" /> GENERATE REPORT
                </>
              )}
            </button>
          )}
        </div>

        {/* Chat area */}
        <div className="flex flex-col border border-border rounded-sm overflow-hidden min-h-[480px]">
          {/* Phase header bar */}
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-2 bg-secondary/30">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <NeonBadge variant={phaseConfig.badgeVariant}>
                {phaseConfig.label}
              </NeonBadge>
            </div>
            {sessionId && (
              <span className="font-mono text-[9px] text-muted-foreground tracking-widest hidden sm:block">
                SESSION ACTIVE
              </span>
            )}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {!hasMessages && (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-sm border-2 border-neon-amber/30 mb-4">
                  <Users className="h-6 w-6 text-neon-amber/60" />
                </div>
                <p className="font-mono text-sm text-muted-foreground tracking-wider mb-2">
                  THE ROOM IS READY
                </p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Drop a stimulus below to start Phase 1. Try your homepage headline,
                  pricing page, or a positioning claim.
                </p>
                <div className="mt-4 flex items-center gap-1 text-muted-foreground/50">
                  <ChevronRight className="h-3 w-3" />
                  <span className="font-mono text-[10px] tracking-widest">
                    {activePersonas.length} PARTICIPANTS READY
                  </span>
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              const idx = msg.personaId ? personaIndexMap(msg.personaId) : -1;
              return (
                <MessageBubble
                  key={msg.id ?? i}
                  message={msg}
                  personaIndex={idx}
                  phase={phase}
                />
              );
            })}

            {(isRunning || isFlipping) && thinkingPersonaId && (
              <div className="flex gap-2.5 items-start">
                <div
                  className={cn(
                    "h-7 w-7 rounded-sm flex items-center justify-center text-primary-foreground font-mono text-[10px] font-bold flex-shrink-0 mt-0.5",
                    AVATAR_COLORS[
                      personaIndexMap(thinkingPersonaId) % AVATAR_COLORS.length
                    ]
                  )}
                >
                  {getInitials(
                    activePersonas.find((p) => p.id === thinkingPersonaId)?.name ?? "?"
                  )}
                </div>
                <div className="border-2 border-neon-cyan/20 bg-card rounded-sm px-4 py-3">
                  <Loader2 className="h-4 w-4 text-neon-cyan animate-spin" />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 text-neon-pink font-mono text-xs border border-neon-pink/30 bg-neon-pink/5 rounded-sm p-3">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>

          {/* @mention dropdown — inline to avoid overflow-hidden clipping */}
          {mentionQuery !== null && mentionFilteredPersonas.length > 0 && (
            <div className="border-t border-border">
              <div className="px-3 py-1 bg-secondary/20 border-b border-border">
                <span className="font-mono text-[9px] text-muted-foreground/60 tracking-widest">DIRECT TO PERSONA — type more to filter</span>
              </div>
              {mentionFilteredPersonas.map((p, idx) => {
                const pIdx = activePersonas.indexOf(p);
                const color = AVATAR_COLORS[pIdx % AVATAR_COLORS.length];
                return (
                  <button
                    key={p.id}
                    onMouseDown={(e) => { e.preventDefault(); selectMentionPersona(p); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                      idx === mentionSelectedIndex ? "bg-secondary/60" : "hover:bg-secondary/30",
                    )}
                  >
                    <div className={cn(
                      "h-6 w-6 rounded-sm flex items-center justify-center text-primary-foreground font-mono text-[9px] font-bold flex-shrink-0",
                      color,
                    )}>
                      {getInitials(p.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-xs font-bold text-foreground">{p.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground ml-2 truncate">{p.title}</span>
                    </div>
                    {idx === mentionSelectedIndex && (
                      <span className="font-mono text-[9px] text-muted-foreground/50 flex-shrink-0">↵</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Targeting indicator */}
          {targetedPersonaFromInput && (
            <div className="border-t border-neon-cyan/20 bg-neon-cyan/5 px-3 py-1.5 flex items-center gap-2">
              <AtSign className="h-3 w-3 text-neon-cyan flex-shrink-0" />
              <span className="font-mono text-[10px] text-neon-cyan tracking-wider">
                DIRECTING TO{" "}
                <span className="font-bold">{targetedPersonaFromInput.name}</span>
                {" — "}others will listen but not respond
              </span>
              <button
                onClick={() => setInput((v) => v.replace(/@\w+\s?/, "").trim())}
                className="ml-auto h-4 w-4 flex items-center justify-center text-neon-cyan/60 hover:text-neon-cyan transition-colors"
                aria-label="Remove target"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Input — hidden during flip initiation */}
          <div className="border-t border-border p-3 flex gap-2 items-end bg-secondary/10">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                targetedPersonaFromInput
                  ? `Ask ${targetedPersonaFromInput.name.split(" ")[0]} directly...`
                  : phaseConfig.inputPlaceholder
              }
              rows={1}
              className="flex-1 bg-transparent font-mono text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none leading-relaxed py-1 px-1 min-h-[32px] max-h-28"
              style={{ fieldSizing: "content" } as React.CSSProperties}
              disabled={isRunning || isFlipping}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isRunning || isFlipping}
              className={cn(
                "flex-shrink-0 h-9 w-9 rounded-sm disabled:bg-secondary disabled:text-muted-foreground text-primary-foreground flex items-center justify-center transition-all",
                phase === "flip"
                  ? "bg-neon-pink hover:glow-pink"
                  : "bg-neon-amber hover:glow-amber"
              )}
              aria-label="Send"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Analytics dashboard */}
      {analytics && (
        <FocusGroupAnalyticsDashboard analytics={analytics} personas={activePersonas} />
      )}

      </>)}
    </div>
  );
}
