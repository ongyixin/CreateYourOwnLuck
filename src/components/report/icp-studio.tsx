"use client";

import { useState, useRef, useEffect } from "react";
import { Brain, Zap, AlertTriangle, MessageCircle, Send, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import NeonBadge from "@/components/neon-badge";
import CountUp from "@/components/count-up";
import { EvidenceBlock } from "./evidence-block";
import type { IcpStudio, Persona } from "@/lib/types";
import type { ChatMessage } from "@/app/api/persona-chat/route";

const AVATAR_COLORS = [
  "bg-neon-green",
  "bg-neon-pink",
  "bg-neon-cyan",
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const SENTIMENT: Record<
  Persona["fiveSecondReaction"]["sentiment"],
  { label: string; badgeVariant: "green" | "cyan" | "amber" | "pink"; borderClass: string }
> = {
  positive: {
    label: "POSITIVE",
    badgeVariant: "green",
    borderClass: "border-neon-green/30",
  },
  neutral: {
    label: "NEUTRAL",
    badgeVariant: "cyan",
    borderClass: "border-border",
  },
  confused: {
    label: "CONFUSED",
    badgeVariant: "amber",
    borderClass: "border-neon-amber/30",
  },
  negative: {
    label: "NEGATIVE",
    badgeVariant: "pink",
    borderClass: "border-neon-pink/30",
  },
};

function PersonaChatPanel({
  persona,
  avatarColor,
  onClose,
}: {
  persona: Persona;
  avatarColor: string;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [history, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setHistory((h) => [...h, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/persona-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona, message: text, history }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      setHistory((h) => [...h, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="border-t-2 border-border mt-2">
      <div className="px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-6 w-6 rounded-sm flex items-center justify-center text-primary-foreground font-mono text-[10px] font-bold flex-shrink-0",
              avatarColor
            )}
          >
            {getInitials(persona.name)}
          </div>
          <span className="font-mono text-sm text-foreground font-bold tracking-wider">
            CHAT WITH {persona.name.toUpperCase()}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-neon-pink transition-colors"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-5 mb-3 rounded-sm bg-secondary border border-border overflow-hidden">
        <div ref={scrollContainerRef} className="max-h-72 overflow-y-auto p-3 space-y-3">
          {history.length === 0 && (
            <p className="text-muted-foreground font-mono text-xs text-center py-4">
              Ask {persona.name} anything — about their workflow, frustrations,
              or what they look for in a solution.
            </p>
          )}

          {history.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-2",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div
                  className={cn(
                    "h-6 w-6 rounded-sm flex items-center justify-center text-primary-foreground font-mono text-[10px] font-bold flex-shrink-0 mt-0.5",
                    avatarColor
                  )}
                >
                  {getInitials(persona.name)}
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-sm px-3 py-2 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-neon-green/10 border border-neon-green/30 text-foreground"
                    : "border-2 border-neon-cyan/30 bg-card font-mono text-foreground"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2 justify-start">
              <div
                className={cn(
                  "h-6 w-6 rounded-sm flex items-center justify-center text-primary-foreground font-mono text-[10px] font-bold flex-shrink-0 mt-0.5",
                  avatarColor
                )}
              >
                {getInitials(persona.name)}
              </div>
              <div className="border-2 border-neon-cyan/30 bg-card rounded-sm px-3 py-2">
                <Loader2 className="h-4 w-4 text-neon-cyan animate-spin" />
              </div>
            </div>
          )}

          {error && (
            <p className="text-neon-pink font-mono text-xs text-center">{error}</p>
          )}
        </div>

        <div className="border-t border-border p-2 flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${persona.name} something...`}
            rows={1}
            className="flex-1 bg-transparent font-mono text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none leading-relaxed py-1 px-1 min-h-[32px] max-h-24"
            style={{ fieldSizing: "content" } as React.CSSProperties}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 h-8 w-8 rounded-sm bg-neon-green hover:glow-green disabled:bg-secondary disabled:text-muted-foreground text-primary-foreground flex items-center justify-center transition-all"
            aria-label="Send"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PersonaCard({
  persona,
  index,
}: {
  persona: Persona;
  index: number;
}) {
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const reaction = persona.fiveSecondReaction;
  const sentiment = SENTIMENT[reaction.sentiment];
  const [chatOpen, setChatOpen] = useState(false);

  const scoreColor = persona.fiveSecondReaction.sentiment === "positive"
    ? "text-neon-green" : persona.fiveSecondReaction.sentiment === "negative"
    ? "text-neon-pink" : "text-neon-amber";

  const borderHover = ["hover:glow-green", "hover:glow-pink", "hover:glow-cyan"];

  return (
    <div className={cn("terminal-card border-border", borderHover[index % 3])}>
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className={cn(
            "h-12 w-12 rounded-sm flex items-center justify-center text-primary-foreground font-mono text-base font-bold flex-shrink-0",
            avatarColor
          )}
          aria-hidden
        >
          {getInitials(persona.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-mono text-foreground font-bold tracking-wider">{persona.name.toUpperCase()}</h3>
          <p className="text-muted-foreground text-sm">{persona.title}</p>
          {persona.age && (
            <span className="font-mono text-[10px] text-muted-foreground tracking-widest">AGE {persona.age}</span>
          )}
        </div>
        <button
          onClick={() => setChatOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-mono text-[10px] font-bold border-2 transition-all flex-shrink-0 tracking-wider",
            chatOpen
              ? "bg-neon-cyan/10 border-neon-cyan/50 text-neon-cyan"
              : "border-border text-muted-foreground hover:border-neon-cyan hover:text-neon-cyan"
          )}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {chatOpen ? "CLOSE" : "CHAT"}
        </button>
      </div>

      {/* Psychographics */}
      {persona.psychographics.length > 0 && (
        <div className="mb-4">
          <div className="font-mono text-[10px] text-neon-purple tracking-widest mb-2 flex items-center gap-1">
            <Brain className="h-3 w-3" /> PSYCHOGRAPHICS
          </div>
          <div className="flex flex-wrap gap-1.5">
            {persona.psychographics.map((pg, i) => (
              <NeonBadge key={i} variant="purple">{pg}</NeonBadge>
            ))}
          </div>
        </div>
      )}

      {/* Pain points + buying triggers */}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        {persona.painPoints.length > 0 && (
          <div>
            <div className="font-mono text-[10px] text-neon-pink tracking-widest mb-2">PAIN POINTS</div>
            <ul className="space-y-1.5">
              {persona.painPoints.map((p, i) => (
                <li key={i} className="text-foreground text-sm flex items-start gap-2">
                  <span className="text-neon-pink mt-0.5">›</span> {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {persona.buyingTriggers.length > 0 && (
          <div>
            <div className="font-mono text-[10px] text-neon-green tracking-widest mb-2 flex items-center gap-1">
              <Zap className="h-3 w-3" /> BUYING TRIGGERS
            </div>
            <ul className="space-y-1.5">
              {persona.buyingTriggers.map((t, i) => (
                <li key={i} className="text-foreground text-sm flex items-start gap-2">
                  <span className="text-neon-green mt-0.5">›</span> {t}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 5-second reaction */}
      <div className={cn("rounded-sm border-2 overflow-hidden mb-4", sentiment.borderClass)}>
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] text-muted-foreground tracking-widest">
            5-SECOND REACTION
          </span>
          <NeonBadge variant={sentiment.badgeVariant}>{sentiment.label}</NeonBadge>
        </div>
        <div className="px-4 py-3 space-y-2">
          <p className="text-foreground text-sm italic leading-relaxed font-mono">
            &ldquo;{reaction.reaction}&rdquo;
          </p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              <span className="font-mono text-[10px] text-neon-cyan">FIRST SAW:</span>{" "}
              {reaction.firstImpression}
            </p>
            <p>
              <span className="font-mono text-[10px] text-neon-amber">WOULD:</span>{" "}
              <span className="text-neon-green">{reaction.likelyAction}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Messaging gaps */}
      {persona.painPointGaps.length > 0 && (
        <div className="mb-4">
          <div className="font-mono text-[10px] text-neon-amber tracking-widest mb-2 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> MESSAGING GAPS
          </div>
          <ul className="space-y-1.5">
            {persona.painPointGaps.map((gap, i) => (
              <li key={i} className="text-neon-amber/80 text-sm flex items-start gap-2">
                <span className="text-neon-pink mt-0.5">⚠</span> {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      <EvidenceBlock evidence={persona.evidence} />

      {chatOpen && (
        <PersonaChatPanel
          persona={persona}
          avatarColor={avatarColor}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}

interface IcpStudioSectionProps {
  data: IcpStudio;
}

export function IcpStudioSection({ data }: IcpStudioSectionProps) {
  const personas = data.personas ?? [];

  if (personas.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Brain className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p className="font-mono text-sm tracking-wider">NO PERSONAS GENERATED FOR THIS REPORT.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Module header */}
      <div>
        <div className="module-header text-neon-purple">Module 05</div>
        <h2 className="font-mono text-neon-purple text-xl font-bold tracking-wider">ICP STUDIO</h2>
      </div>

      {/* Explainer */}
      <div className="terminal-card border-border">
        <p className="text-muted-foreground text-sm leading-relaxed font-mono">
          AI-generated personas grounded in real web data about your market.
          Use them to simulate reactions and identify gaps. Click{" "}
          <span className="text-neon-cyan font-bold">CHAT</span> on any persona to ask them questions directly.
        </p>
      </div>

      {/* Persona cards */}
      <div className="space-y-6">
        {personas.map((persona, i) => (
          <PersonaCard key={persona.id} persona={persona} index={i} />
        ))}
      </div>
    </div>
  );
}
