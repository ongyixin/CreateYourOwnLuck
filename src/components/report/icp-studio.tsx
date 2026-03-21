"use client";

/**
 * ICP Studio section — Section 5 of the FitCheck report.
 *
 * Displays 2–3 AI-generated personas grounded in real web evidence.
 * Each persona card shows:
 * - Initials avatar (colored by position)
 * - Name, title, age
 * - Psychographics (tags)
 * - Pain points + buying triggers
 * - Simulated 5-second reaction (sentiment-colored card)
 * - Messaging gaps / pain-point mismatches
 * - Evidence blocks
 * - Interactive Q&A chat panel
 *
 * Owned by: report agent
 */

import { useState, useRef, useEffect } from "react";
import { Brain, Zap, AlertTriangle, MessageCircle, Send, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { EvidenceBlock } from "./evidence-block";
import type { IcpStudio, Persona } from "@/lib/types";
import type { ChatMessage } from "@/app/api/persona-chat/route";

// ─── Avatar colors (cycle through for up to 3 personas) ───────────────────

const AVATAR_COLORS = [
  "bg-violet-600",
  "bg-emerald-600",
  "bg-blue-600",
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Sentiment config ──────────────────────────────────────────────────────

const SENTIMENT: Record<
  Persona["fiveSecondReaction"]["sentiment"],
  { label: string; badgeClass: string; cardClass: string }
> = {
  positive: {
    label: "😊 Positive",
    badgeClass: "bg-emerald-950/60 border-emerald-700/50 text-emerald-400",
    cardClass: "bg-emerald-950/20 border-emerald-900/30",
  },
  neutral: {
    label: "😐 Neutral",
    badgeClass: "bg-zinc-800 border-zinc-700 text-zinc-400",
    cardClass: "bg-zinc-800/30 border-zinc-700/40",
  },
  confused: {
    label: "😕 Confused",
    badgeClass: "bg-amber-950/60 border-amber-700/50 text-amber-400",
    cardClass: "bg-amber-950/20 border-amber-900/30",
  },
  negative: {
    label: "😟 Negative",
    badgeClass: "bg-red-950/60 border-red-700/50 text-red-400",
    cardClass: "bg-red-950/20 border-red-900/30",
  },
};

// ─── Chat panel ────────────────────────────────────────────────────────────

function PersonaChat({
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
    <div className="border-t border-zinc-800/60 mt-2">
      {/* Chat header */}
      <div className="px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0",
              avatarColor
            )}
          >
            {getInitials(persona.name)}
          </div>
          <span className="text-sm text-zinc-300 font-medium">
            Chat with {persona.name}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-600 hover:text-zinc-400 transition-colors"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Message log */}
      <div className="mx-5 mb-3 rounded-lg bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="max-h-72 overflow-y-auto p-3 space-y-3">
          {history.length === 0 && (
            <p className="text-zinc-600 text-xs text-center py-4">
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
                    "h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5",
                    avatarColor
                  )}
                >
                  {getInitials(persona.name)}
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-violet-600/30 border border-violet-500/30 text-violet-100"
                    : "bg-zinc-800 border border-zinc-700/50 text-zinc-200"
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
                  "h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5",
                  avatarColor
                )}
              >
                {getInitials(persona.name)}
              </div>
              <div className="bg-zinc-800 border border-zinc-700/50 rounded-lg px-3 py-2">
                <Loader2 className="h-4 w-4 text-zinc-500 animate-spin" />
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-zinc-800/60 p-2 flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${persona.name} something…`}
            rows={1}
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none leading-relaxed py-1 px-1 min-h-[32px] max-h-24"
            style={{ fieldSizing: "content" } as React.CSSProperties}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 h-8 w-8 rounded-md bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-600 text-white flex items-center justify-center transition-colors"
            aria-label="Send"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Persona card ──────────────────────────────────────────────────────────

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

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="px-5 py-5 border-b border-zinc-800/60 flex items-start gap-4">
        <div
          className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0",
            avatarColor
          )}
          aria-hidden
        >
          {getInitials(persona.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-white font-semibold">{persona.name}</h3>
          <p className="text-zinc-400 text-sm">{persona.title}</p>
          {persona.age && (
            <span className="text-zinc-600 text-xs">Age {persona.age}</span>
          )}
        </div>
        <button
          onClick={() => setChatOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors flex-shrink-0",
            chatOpen
              ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
              : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
          )}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {chatOpen ? "Close chat" : "Chat"}
        </button>
      </div>

      <CardContent className="pt-5 space-y-5">
        {/* Psychographics */}
        {persona.psychographics.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-600 font-medium mb-2 flex items-center gap-1">
              <Brain className="h-3 w-3" />
              Psychographics
            </p>
            <div className="flex flex-wrap gap-1.5">
              {persona.psychographics.map((pg, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded"
                >
                  {pg}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pain points + buying triggers */}
        <div className="grid sm:grid-cols-2 gap-4">
          {persona.painPoints.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-600 font-medium mb-2">
                Pain Points
              </p>
              <ul className="space-y-1.5">
                {persona.painPoints.map((p, i) => (
                  <li
                    key={i}
                    className="text-zinc-300 text-sm flex items-start gap-2"
                  >
                    <span className="text-red-400 mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {persona.buyingTriggers.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-600 font-medium mb-2 flex items-center gap-1">
                <Zap className="h-3 w-3 text-violet-400" />
                Buying Triggers
              </p>
              <ul className="space-y-1.5">
                {persona.buyingTriggers.map((t, i) => (
                  <li
                    key={i}
                    className="text-zinc-300 text-sm flex items-start gap-2"
                  >
                    <span className="text-violet-400 text-xs mt-0.5 flex-shrink-0">
                      ⚡
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 5-second reaction */}
        <div
          className={cn(
            "rounded-lg border overflow-hidden",
            sentiment.cardClass
          )}
        >
          <div className="px-4 py-2.5 border-b border-zinc-800/40 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              5-Second Reaction
            </span>
            <span
              className={cn(
                "px-2 py-0.5 text-xs border rounded font-medium",
                sentiment.badgeClass
              )}
            >
              {sentiment.label}
            </span>
          </div>
          <div className="px-4 py-3 space-y-2">
            <p className="text-zinc-200 text-sm italic leading-relaxed">
              &ldquo;{reaction.reaction}&rdquo;
            </p>
            <div className="space-y-1 text-xs text-zinc-500">
              <p>
                <span className="text-zinc-400 font-medium">First saw: </span>
                {reaction.firstImpression}
              </p>
              <p>
                <span className="text-zinc-400 font-medium">Would: </span>
                <span className="text-violet-300">{reaction.likelyAction}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Messaging gaps */}
        {persona.painPointGaps.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-600 font-medium mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-400" />
              Messaging Gaps
            </p>
            <ul className="space-y-1.5">
              {persona.painPointGaps.map((gap, i) => (
                <li
                  key={i}
                  className="text-amber-300/70 text-sm flex items-start gap-2"
                >
                  <span className="flex-shrink-0 text-amber-500/60 mt-0.5">
                    →
                  </span>
                  {gap}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Evidence */}
        <EvidenceBlock evidence={persona.evidence} />
      </CardContent>

      {/* Chat panel — renders outside CardContent to span full width */}
      {chatOpen && (
        <PersonaChat
          persona={persona}
          avatarColor={avatarColor}
          onClose={() => setChatOpen(false)}
        />
      )}
    </Card>
  );
}

// ─── Main section ──────────────────────────────────────────────────────────

interface IcpStudioSectionProps {
  data: IcpStudio;
}

export function IcpStudioSection({ data }: IcpStudioSectionProps) {
  const personas = data.personas ?? [];

  if (personas.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-600">
        <Brain className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No personas generated for this report.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Explainer */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-zinc-400 text-sm leading-relaxed">
            These are AI-generated personas grounded in real web data about your
            market. Use them to simulate how different customer types would react
            to your messaging, and to identify gaps between your current brand
            and what your customers actually care about. Click{" "}
            <span className="text-zinc-300 font-medium">Chat</span> on any
            persona to ask them questions directly.
          </p>
        </CardContent>
      </Card>

      {/* Persona cards */}
      <div className="space-y-6">
        {personas.map((persona, i) => (
          <PersonaCard key={persona.id} persona={persona} index={i} />
        ))}
      </div>
    </div>
  );
}
