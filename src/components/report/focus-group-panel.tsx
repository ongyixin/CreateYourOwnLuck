"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Mic,
  MicOff,
  Send,
  Upload,
  X,
  Loader2,
  Volume2,
  VolumeX,
  FileText,
  ImageIcon,
  Video,
  AlertTriangle,
  Users,
  BarChart3,
  Link,
  Globe,
  Radio,
  MessageSquarePlus,
  Repeat2,
  Square,
  AtSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FocusGroupAnalytics, MediaAttachment, PanelReaction, Persona } from "@/lib/types";
import { FocusGroupAnalyticsDashboard } from "./focus-group-analytics";
import { useVoiceInput } from "@/hooks/use-voice-input";

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-neon-green",
  "bg-neon-pink",
  "bg-neon-cyan",
  "bg-neon-amber",
  "bg-neon-purple",
];

const TTS_VOICES = ["alloy", "echo", "fable", "nova", "onyx", "shimmer"] as const;

/**
 * Max autoplay continuation rounds (after the initial user-triggered round).
 * Scales inversely with persona count so the total response volume stays
 * manageable regardless of panel size:
 *   2 personas → 6 continuation rounds  (14 total responses)
 *   3 personas → 4 rounds               (15 total)
 *   4 personas → 3 rounds               (16 total)
 *   5–6 personas → 3 rounds             (20–24 total)
 */
function getAutoplayMaxRounds(personaCount: number): number {
  return Math.max(3, Math.ceil(12 / personaCount));
}

const AUTOPLAY_TOOLTIP =
  "Autoplay: after you submit, personas keep discussing amongst themselves — reacting to each other, pushing back, and building on ideas — until the conversation naturally winds down.";

const SENTIMENT_STYLES: Record<PanelReaction["sentiment"], string> = {
  positive: "border-neon-green/40 bg-neon-green/5",
  neutral:  "border-border bg-card",
  skeptical:"border-neon-amber/40 bg-neon-amber/5",
  negative: "border-neon-pink/40 bg-neon-pink/5",
};

const SENTIMENT_LABEL_STYLES: Record<PanelReaction["sentiment"], string> = {
  positive: "text-neon-green",
  neutral:  "text-muted-foreground",
  skeptical:"text-neon-amber",
  negative: "text-neon-pink",
};

const SENTIMENT_DOTS: Record<PanelReaction["sentiment"], string> = {
  positive: "bg-neon-green",
  neutral:  "bg-muted-foreground",
  skeptical:"bg-neon-amber",
  negative: "bg-neon-pink",
};

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

/** Strip trailing partial or complete AI control tags from streamed text for display. */
function cleanStreamingText(raw: string): string {
  return raw
    .replace(/\s*\[(?:SENTIMENT|FOLLOW_UP)[^\]]*\]?\s*$/gi, "")
    .trim();
}

// ─── Media Preview ─────────────────────────────────────────────────────────────

function MediaPreview({ media, onRemove }: { media: MediaAttachment; onRemove: () => void }) {
  return (
    <div className="relative border border-border rounded-sm overflow-hidden bg-secondary/20 group">
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 z-10 h-6 w-6 rounded-sm bg-background/80 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:border-neon-pink/40 hover:text-neon-pink"
        aria-label="Remove media"
      >
        <X className="h-3 w-3" />
      </button>

      {media.type === "image" && media.dataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.dataUrl} alt={media.name} className="w-full max-h-48 object-contain" />
      )}

      {media.type === "video" && media.dataUrl && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={media.dataUrl} alt={`${media.name} (first frame)`} className="w-full max-h-48 object-contain" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 rounded-full bg-background/70 border border-border flex items-center justify-center">
              <Video className="h-4 w-4 text-neon-purple" />
            </div>
          </div>
        </div>
      )}

      {media.type === "pdf" && (
        <div className="flex items-center gap-3 p-4">
          <div className="h-10 w-10 rounded-sm bg-neon-amber/10 border border-neon-amber/30 flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-neon-amber" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs font-bold text-foreground truncate">{media.name}</p>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
              PDF — {media.extractedText ? `${Math.round(media.extractedText.length / 4)} words extracted` : "No text extracted"}
            </p>
          </div>
        </div>
      )}

      {media.type === "url" && (
        <div className="flex items-center gap-3 p-4">
          <div className="h-10 w-10 rounded-sm bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center flex-shrink-0">
            <Globe className="h-5 w-5 text-neon-cyan" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs font-bold text-foreground truncate">{media.name}</p>
            {media.sourceUrl && (
              <p className="font-mono text-[10px] text-muted-foreground mt-0.5 truncate">{media.sourceUrl}</p>
            )}
            <p className="font-mono text-[10px] text-neon-cyan/70 mt-0.5">
              {media.extractedText ? `${Math.round(media.extractedText.length / 4)} words scraped` : "No content extracted"}
            </p>
          </div>
        </div>
      )}

      {(media.type === "image" || media.type === "video") && (
        <div className="px-3 pb-2">
          <p className="font-mono text-[9px] text-muted-foreground/60 truncate">{media.name}</p>
        </div>
      )}
    </div>
  );
}

// ─── Persona Reaction Card ─────────────────────────────────────────────────────

function PersonaReactionCard({
  persona,
  personaIndex,
  reaction,
  followUp,
  isThinking,
  isSpeaking,
  isFollowingUp,
  isListening,
  isQueued,
  audioUrl,
  onReplayRequest,
  streamingText,
}: {
  persona: Persona;
  personaIndex: number;
  reaction: PanelReaction | null;
  followUp: PanelReaction | null;
  isThinking: boolean;
  isSpeaking: boolean;
  isFollowingUp: boolean;
  /** True when another persona is being directly addressed this round — this persona hears but doesn't respond. */
  isListening: boolean;
  /** True when a round is running and this persona is queued to speak (hasn't started yet). */
  isQueued: boolean;
  audioUrl: string | null;
  onReplayRequest: (personaId: string) => void;
  /** Partial token text while the reaction is still streaming. Cleared when reaction is finalized. */
  streamingText: string | null;
}) {
  const color = AVATAR_COLORS[personaIndex % AVATAR_COLORS.length];
  // Sentiment is driven by the latest available reaction
  const latest = followUp ?? reaction;
  const sentimentStyle  = latest ? SENTIMENT_STYLES[latest.sentiment]       : "border-border bg-card";
  const sentimentLabel  = latest ? SENTIMENT_LABEL_STYLES[latest.sentiment] : "text-muted-foreground";
  const sentimentDot    = latest ? SENTIMENT_DOTS[latest.sentiment]         : "bg-muted-foreground";
  // Active = currently thinking or streaming tokens
  const isActive = isThinking || !!streamingText;

  return (
    <div
      className={cn(
        "rounded-sm border-2 p-4 flex flex-col gap-3 transition-all duration-300",
        sentimentStyle,
        isSpeaking && "ring-2 ring-neon-cyan/40 ring-offset-1 ring-offset-background",
        isActive && "ring-1 ring-foreground/15 ring-offset-1 ring-offset-background",
        isListening && !reaction && "opacity-50",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className={cn(
          "h-8 w-8 rounded-sm flex items-center justify-center text-primary-foreground font-mono text-[10px] font-bold flex-shrink-0",
          color,
          isSpeaking && "animate-pulse"
        )}>
          {getInitials(persona.name)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs font-bold text-foreground truncate">{persona.name}</p>
          <p className="text-muted-foreground text-[10px] truncate">{persona.title}</p>
        </div>

        {/* Status / sentiment */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {(isSpeaking || isFollowingUp) && (
            <div className="flex items-center gap-1">
              <Radio className="h-3 w-3 text-neon-cyan animate-pulse" />
              <span className="font-mono text-[9px] text-neon-cyan tracking-widest">
                {isFollowingUp && !isSpeaking ? "FOLLOWING UP..." : "SPEAKING"}
              </span>
            </div>
          )}
          {!isSpeaking && !isFollowingUp && latest && (
            <div className="flex items-center gap-1">
              <span className={cn("h-2 w-2 rounded-full inline-block", sentimentDot)} />
              <span className={cn("font-mono text-[9px] uppercase tracking-widest", sentimentLabel)}>
                {latest.sentiment}
              </span>
            </div>
          )}
          {/* Replay button — shown once TTS audio is available and persona is not speaking */}
          {audioUrl && !isSpeaking && (
            <button
              onClick={() => onReplayRequest(persona.id)}
              className="h-5 w-5 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ml-1"
              aria-label={`Replay ${persona.name}`}
              title="Replay voice"
            >
              <Volume2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Reaction content */}
      <div className="min-h-[60px] flex flex-col gap-2">
        {/* Waiting for first token — show spinner */}
        {isThinking && !streamingText && !reaction && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
            <span className="font-mono text-[10px] tracking-wider">THINKING...</span>
          </div>
        )}
        {/* Tokens are arriving — render progressively with a blinking cursor */}
        {streamingText && !reaction && (
          <p className="text-sm text-foreground leading-relaxed">
            {cleanStreamingText(streamingText)}
            <span className="inline-block w-[2px] h-[0.85em] bg-foreground/60 animate-pulse ml-[2px] align-middle translate-y-[-1px]" />
          </p>
        )}
        {/* Final reaction — shown once streaming is complete */}
        {reaction && (
          <p className="text-sm text-foreground leading-relaxed">{reaction.content}</p>
        )}
        {!isThinking && !streamingText && !reaction && !isListening && isQueued && (
          <div className="flex items-center gap-2 text-muted-foreground/70 self-center">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan/50 animate-bounce [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan/50 animate-bounce [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan/50 animate-bounce [animation-delay:300ms]" />
            <span className="font-mono text-[10px] tracking-wider text-muted-foreground/80">PREPARING...</span>
          </div>
        )}
        {!isThinking && !streamingText && !reaction && !isListening && !isQueued && (
          <p className="font-mono text-[10px] text-muted-foreground/50 tracking-wider self-center w-full text-center">
            AWAITING STIMULUS
          </p>
        )}
        {!isThinking && !streamingText && !reaction && isListening && (
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground/50">
            <Users className="h-3 w-3" />
            <span className="font-mono text-[10px] tracking-wider">LISTENING IN</span>
          </div>
        )}

        {/* Follow-up content */}
        {isFollowingUp && !followUp && (
          <div className="flex items-center gap-2 text-neon-cyan/70 pt-1 border-t border-border">
            <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
            <span className="font-mono text-[10px] tracking-wider">ADDING FOLLOW-UP...</span>
          </div>
        )}
        {followUp && (
          <div className="pt-2 border-t border-border/60 space-y-1">
            <span className="font-mono text-[9px] text-muted-foreground/50 tracking-widest">↩ FOLLOW-UP</span>
            <p className="text-sm text-foreground leading-relaxed">{followUp.content}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Upload helper ─────────────────────────────────────────────────────────────

async function processFile(file: File): Promise<MediaAttachment | null> {
  const type = file.type;

  if (type.startsWith("image/")) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({ type: "image", name: file.name, dataUrl: reader.result as string, extractedText: null, mimeType: type });
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
    } catch { return null; }
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
        if (!ctx) { URL.revokeObjectURL(objectUrl); resolve(null); return; }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        URL.revokeObjectURL(objectUrl);
        resolve({ type: "video", name: file.name, dataUrl, extractedText: null, mimeType: type });
      };
      video.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(null); };
    });
  }

  return null;
}

// ─── Main panel component ─────────────────────────────────────────────────────

interface FocusGroupPanelProps {
  personas: Persona[];
  jobId: string;
  sessionId: string | null;
}

export function FocusGroupPanel({ personas, jobId, sessionId: initialSessionId }: FocusGroupPanelProps) {
  // ── Core state ──────────────────────────────────────────────────────────────
  const [reactions, setReactions]               = useState<Map<string, PanelReaction>>(new Map());
  const [thinkingPersonaId, setThinkingPersonaId] = useState<string | null>(null);
  const [media, setMedia]                       = useState<MediaAttachment | null>(null);
  const [input, setInput]                       = useState("");
  const [urlInput, setUrlInput]                 = useState("");
  const [isFetchingUrl, setIsFetchingUrl]       = useState(false);
  const [sessionId, setSessionId]               = useState<string | null>(initialSessionId);
  const [isRunning, setIsRunning]               = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [roundCount, setRoundCount]             = useState(0);
  const [analytics, setAnalytics]               = useState<FocusGroupAnalytics | null>(null);
  const [analyzing, setAnalyzing]               = useState(false);
  /** Brief preview of last submitted input — shown while personas respond to confirm receipt */
  const [lastSubmittedPreview, setLastSubmittedPreview] = useState<string | null>(null);

  // ── Autoplay state ───────────────────────────────────────────────────────────
  const [isAutoplay, setIsAutoplay]             = useState(false);
  // State mirror of autoplayActiveRef for re-render-driven UI updates
  const [isAutoplayRunning, setIsAutoplayRunning] = useState(false);
  // Current continuation round index (1-based) while autoplay is active
  const [autoplayContinuationRound, setAutoplayContinuationRound] = useState(0);
  // Tracks all rounds' reactions for autoplay continuation context
  const allRoundsHistoryRef                     = useRef<PanelReaction[][]>([]);
  // Tracks whether autoplay is currently looping (separate from isRunning to
  // allow the UI to show a "stop autoplay" affordance mid-loop)
  const autoplayActiveRef                       = useRef(false);
  // Ref copy of sessionId so autoplay loop can read the latest value
  const sessionIdRef                            = useRef<string | null>(initialSessionId);

  // ── Follow-up state ──────────────────────────────────────────────────────────
  // personaId → hint text for personas that have something to add
  const [pendingFollowUps, setPendingFollowUps] = useState<Map<string, string>>(new Map());
  // personaId → completed follow-up reaction
  const [followUps, setFollowUps]               = useState<Map<string, PanelReaction>>(new Map());
  // personaId of the follow-up currently being generated
  const [followUpLoadingId, setFollowUpLoadingId] = useState<string | null>(null);

  // ── Streaming text state ─────────────────────────────────────────────────────
  // personaId → accumulated token text while a reaction is being streamed
  const [streamingText, setStreamingText] = useState<Map<string, string>>(new Map());

  // ── Audio queue state ────────────────────────────────────────────────────────
  // Stored audio URLs per persona (for replay)
  const [audioUrls, setAudioUrls]               = useState<Map<string, string>>(new Map());
  // Which persona is currently playing audio
  const [currentSpeakerId, setCurrentSpeakerId] = useState<string | null>(null);
  // Global mute
  const [isMuted, setIsMuted]                   = useState(false);

  // Audio queue and single shared <audio> element
  const audioRef      = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<Array<{ personaId: string; url: string }>>([]);
  // Track whether the queue processor is running so we don't start it twice
  const processingRef = useRef(false);
  // Count of in-flight TTS fetch+enqueue operations so waitForAudioDrained
  // doesn't resolve before audio has been queued from the current round.
  const pendingTTSCountRef = useRef(0);

  // ── Sentence-level TTS prefetch refs ─────────────────────────────────────────
  // personaId → text accumulated during streaming (for sentence boundary detection)
  const ttsStreamBufferRef = useRef<Map<string, string>>(new Map());
  // personaId → in-flight TTS fetch for the first detected sentence
  type TtsPrefetch = { sentence: string; promise: Promise<string | null>; voice: string };
  const ttsPrefetchRef = useRef<Map<string, TtsPrefetch>>(new Map());

  // ── @mention / targeting state ───────────────────────────────────────────────
  // Non-null while user is typing an @word: the partial name after @
  const [mentionQuery, setMentionQuery]           = useState<string | null>(null);
  // Char index of the @ character in the input string
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  // Keyboard-navigated row index in the mention dropdown
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState<number>(0);
  // Persona ID that the *last sent* or *currently running* round was directed at
  const [activeRoundTargetId, setActiveRoundTargetId]   = useState<string | null>(null);

  // Personas matching the current @mention query (filtered by first name prefix)
  const mentionFilteredPersonas = useMemo(() => {
    if (mentionQuery === null) return [];
    return personas.filter((p) =>
      p.name.split(" ")[0].toLowerCase().startsWith(mentionQuery)
    );
  }, [mentionQuery, personas]);

  // Persona currently referenced by @Name in the input (if valid)
  const targetedPersonaFromInput = useMemo((): Persona | null => {
    const match = input.match(/@(\w+)/);
    if (!match) return null;
    const first = match[1].toLowerCase();
    return personas.find((p) => p.name.split(" ")[0].toLowerCase() === first) ?? null;
  }, [input, personas]);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const fileInputRef= useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const isMutedRef  = useRef(isMuted);

  // Keep isMutedRef in sync
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Keep sessionIdRef in sync
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  // ── Voice input ──────────────────────────────────────────────────────────────
  const { isListening, isSupported: voiceSupported, transcript, start: startListening, stop: stopListening } =
    useVoiceInput({ onResult: (text) => setInput(text) });

  useEffect(() => { if (transcript) setInput(transcript); }, [transcript]);

  // ── Audio queue processor ────────────────────────────────────────────────────

  const playNext = useCallback(() => {
    const next = audioQueueRef.current.shift();
    if (!next) {
      setCurrentSpeakerId(null);
      processingRef.current = false;
      return;
    }
    setCurrentSpeakerId(next.personaId);

    if (!audioRef.current) { playNext(); return; }

    audioRef.current.muted  = isMutedRef.current;
    audioRef.current.src    = next.url;
    audioRef.current.play().catch(() => playNext());
  }, []);

  const enqueueAudio = useCallback((personaId: string, url: string) => {
    audioQueueRef.current.push({ personaId, url });
    if (!processingRef.current) {
      processingRef.current = true;
      playNext();
    }
  }, [playNext]);

  /**
   * Resolves once the audio queue is empty, nothing is playing, AND all
   * in-flight TTS fetches have completed — OR as soon as autoplay is stopped.
   * Checking pendingTTSCountRef prevents the autoplay loop from advancing
   * before Round N's audio has even been enqueued.
   */
  const waitForAudioDrained = useCallback((): Promise<void> => {
    return new Promise<void>((resolve) => {
      const check = () => {
        if ((!processingRef.current && pendingTTSCountRef.current === 0) || !autoplayActiveRef.current) {
          resolve();
        } else {
          setTimeout(check, 200);
        }
      };
      check();
    });
  }, []);

  // Mute/unmute the currently playing audio without stopping it
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      audioUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── TTS fetch and enqueue ────────────────────────────────────────────────────

  /** Fetches TTS for any text and returns a blob URL, or null on failure. */
  const fetchTTSSegment = useCallback(async (text: string, voice: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
      });
      if (!res.ok) return null;
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }, []);

  const fetchAndEnqueueTTS = useCallback(async (reaction: PanelReaction, ttsVoice: string) => {
    pendingTTSCountRef.current += 1;
    try {
      const url = await fetchTTSSegment(reaction.content, ttsVoice);
      if (!url) return;
      setAudioUrls((prev) => new Map(prev).set(reaction.personaId, url));
      enqueueAudio(reaction.personaId, url);
    } finally {
      pendingTTSCountRef.current -= 1;
    }
  }, [fetchTTSSegment, enqueueAudio]);

  // ── Replay a persona's audio ─────────────────────────────────────────────────

  const handleReplayRequest = useCallback((personaId: string) => {
    const url = audioUrls.get(personaId);
    if (!url) return;
    // Interrupt current playback, push this one to the front
    audioQueueRef.current.unshift({ personaId, url });
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    processingRef.current = true;
    playNext();
  }, [audioUrls, playNext]);

  // ── Media file handling ──────────────────────────────────────────────────────

  const handleFileSelect = useCallback(async (file: File) => {
    setIsProcessingMedia(true);
    setError(null);
    try {
      const result = await processFile(file);
      if (result) {
        setMedia(result);
      } else {
        setError("Unsupported file type. Try PNG, JPG, PDF, or MP4.");
      }
    } finally {
      setIsProcessingMedia(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    if (item) {
      const file = item.getAsFile();
      if (file) { e.preventDefault(); handleFileSelect(file); }
    }
  }, [handleFileSelect]);

  // ── @mention helpers ─────────────────────────────────────────────────────────

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    // Detect @<word> directly before the cursor position
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
    // Insert @FirstName with a trailing space
    const newInput = `${before}@${firstName} ${after.startsWith(" ") ? after.slice(1) : after}`;
    setInput(newInput);
    setMentionQuery(null);
    setMentionStartIndex(-1);
    setMentionSelectedIndex(0);

    // Move cursor to just after the inserted mention
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const pos = before.length + firstName.length + 2; // "@" + name + space
        inputRef.current.setSelectionRange(pos, pos);
        inputRef.current.focus();
      }
    });
  }, [input, mentionStartIndex, mentionQuery]);

  // ── URL fetch ────────────────────────────────────────────────────────────────

  async function fetchUrl() {
    const url = urlInput.trim();
    if (!url || isFetchingUrl) return;
    setIsFetchingUrl(true);
    setError(null);
    try {
      const res  = await fetch("/api/scrape-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) { setError((data as { error?: string }).error ?? "Could not fetch URL"); return; }
      setMedia(data as MediaAttachment);
      setUrlInput("");
    } catch {
      setError("Network error — could not fetch URL");
    } finally {
      setIsFetchingUrl(false);
      inputRef.current?.focus();
    }
  }

  function handleUrlKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); fetchUrl(); }
  }

  // ── Panel run ────────────────────────────────────────────────────────────────

  /**
   * Executes one panel round via SSE. Returns the reactions that came back from
   * this round so the autoplay loop can accumulate history, or null on failure.
   */
  const runPanelRound = useCallback(async (
    text: string,
    currentMedia: MediaAttachment | null,
    conversationHistory: PanelReaction[][] | undefined,
    targetedPersonaId: string | null,
  ): Promise<PanelReaction[] | null> => {
    setError(null);
    setIsRunning(true); // Ensures banner shows for autoplay rounds; runPanel also sets it for first round
    setThinkingPersonaId(null);
    setCurrentSpeakerId(null);
    audioQueueRef.current = [];
    processingRef.current = false;
    pendingTTSCountRef.current = 0;
    setAudioUrls(new Map());
    setPendingFollowUps(new Map());
    setFollowUps(new Map());
    setFollowUpLoadingId(null);

    // Reset streaming state and cancel any in-flight TTS prefetches
    ttsStreamBufferRef.current.clear();
    for (const prefetch of Array.from(ttsPrefetchRef.current.values())) {
      prefetch.promise.then((url: string | null) => { if (url) URL.revokeObjectURL(url); });
    }
    ttsPrefetchRef.current.clear();

    if (targetedPersonaId) {
      // Keep existing reactions for non-targeted personas — they're "listening in"
      setReactions((prev) => {
        const next = new Map(prev);
        next.delete(targetedPersonaId);
        return next;
      });
      setStreamingText((prev) => {
        const next = new Map(prev);
        next.delete(targetedPersonaId);
        return next;
      });
    } else {
      setReactions(new Map());
      setStreamingText(new Map());
    }

    const roundReactions: PanelReaction[] = [];

    try {
      const res = await fetch("/api/focus-group/panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          jobId,
          personas,
          stimulus: text || undefined,
          media: currentMedia || undefined,
          conversationHistory: conversationHistory?.length ? conversationHistory : undefined,
          targetedPersonaId: targetedPersonaId || undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Panel request failed");
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer      = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === "session_id") {
              setSessionId(event.sessionId);
            }

            if (event.type === "persona_reaction_start") {
              setThinkingPersonaId(event.personaId);
              // Prime the streaming text entry so the card transitions from
              // spinner to streaming text as soon as the first token arrives.
              setStreamingText((prev) => new Map(prev).set(event.personaId, ""));
              ttsStreamBufferRef.current.set(event.personaId, "");
            }

            if (event.type === "persona_reaction_chunk") {
              const { personaId, delta } = event as { type: string; personaId: string; delta: string };
              setStreamingText((prev) => {
                const next = new Map(prev);
                next.set(personaId, (next.get(personaId) ?? "") + delta);
                return next;
              });

              // Sentence-level TTS prefetch: as soon as the first complete sentence
              // is detected in the stream, fire a TTS request in the background so
              // audio is ready to play sooner once the reaction is finalized.
              const buf = (ttsStreamBufferRef.current.get(personaId) ?? "") + delta;
              ttsStreamBufferRef.current.set(personaId, buf);
              if (!ttsPrefetchRef.current.has(personaId)) {
                const sentenceMatch = buf.match(/^([\s\S]+?[.!?])(?:\s|$)/);
                if (sentenceMatch) {
                  const sentence = sentenceMatch[1];
                  const personaIndex = personas.findIndex((p) => p.id === personaId);
                  const ttsVoice = TTS_VOICES[personaIndex % TTS_VOICES.length];
                  ttsPrefetchRef.current.set(personaId, {
                    sentence,
                    promise: fetchTTSSegment(sentence, ttsVoice),
                    voice: ttsVoice,
                  });
                }
              }
            }

            if (event.type === "persona_reaction_complete") {
              const reaction = event.reaction as PanelReaction;

              // Clear streaming state for this persona
              setStreamingText((prev) => {
                const next = new Map(prev);
                next.delete(reaction.personaId);
                return next;
              });
              ttsStreamBufferRef.current.delete(reaction.personaId);

              setThinkingPersonaId(null);
              setReactions((prev) => new Map(prev).set(reaction.personaId, reaction));
              roundReactions.push(reaction);

              if (reaction.followUpHint) {
                setPendingFollowUps((prev) => new Map(prev).set(reaction.personaId, reaction.followUpHint!));
              }

              const personaIndex = personas.findIndex((p) => p.id === reaction.personaId);
              const ttsVoice     = TTS_VOICES[personaIndex % TTS_VOICES.length];

              // If a first-sentence TTS was prefetched during streaming, use it
              // for early audio playback then queue the remaining text.
              const prefetch = ttsPrefetchRef.current.get(reaction.personaId);
              ttsPrefetchRef.current.delete(reaction.personaId);

              if (prefetch && reaction.content.startsWith(prefetch.sentence)) {
                // Increment BEFORE .then() to bridge the gap between reaction_complete
                // and the microtask running — prevents waitForAudioDrained from
                // resolving before this round's audio has been enqueued.
                pendingTTSCountRef.current += 1;
                prefetch.promise.then(async (firstUrl) => {
                  try {
                    if (!firstUrl) {
                      await fetchAndEnqueueTTS(reaction, ttsVoice);
                      return;
                    }
                    enqueueAudio(reaction.personaId, firstUrl);

                    const remaining = reaction.content.slice(prefetch.sentence.length).trim();
                    if (remaining) {
                      pendingTTSCountRef.current += 1;
                      try {
                        const remainingUrl = await fetchTTSSegment(remaining, ttsVoice);
                        if (remainingUrl) enqueueAudio(reaction.personaId, remainingUrl);
                      } finally {
                        pendingTTSCountRef.current -= 1;
                      }
                    }

                    // Fetch the full reaction text for the replay button in the background.
                    // Not tracked — this is optional and shouldn't block the next round.
                    fetchTTSSegment(reaction.content, ttsVoice).then((replayUrl) => {
                      if (replayUrl) setAudioUrls((prev) => new Map(prev).set(reaction.personaId, replayUrl));
                    });
                  } finally {
                    pendingTTSCountRef.current -= 1;
                  }
                });
              } else {
                // Discard stale prefetch if sentence didn't match clean content
                if (prefetch) {
                  prefetch.promise.then((url) => { if (url) URL.revokeObjectURL(url); });
                }
                fetchAndEnqueueTTS(reaction, ttsVoice);
              }
            }

            if (event.type === "round_complete") {
              setRoundCount((c) => c + 1);
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

      return roundReactions;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error — please try again");
      return null;
    } finally {
      setThinkingPersonaId(null);
      setIsRunning(false);
      setLastSubmittedPreview(null);
    }
  }, [jobId, personas, fetchAndEnqueueTTS, fetchTTSSegment, enqueueAudio]);

  async function runPanel() {
    const text = input.trim();
    if ((!text && !media) || isRunning) return;

    // Extract @mention target BEFORE clearing the input
    const mentionMatch = text.match(/@(\w+)/);
    let targetedId: string | null = null;
    if (mentionMatch) {
      const firstName = mentionMatch[1].toLowerCase();
      const found = personas.find((p) => p.name.split(" ")[0].toLowerCase() === firstName);
      targetedId = found?.id ?? null;
    }

    // Store preview for "input received" feedback (truncate to ~60 chars)
    const preview = text
      ? (text.length > 60 ? `${text.slice(0, 60).trim()}…` : text)
      : media
        ? `Shared ${media.type}${media.name ? `: ${media.name}` : ""}`
        : null;
    setLastSubmittedPreview(preview);
    setIsRunning(true); // Show "input received" banner immediately, before fetch

    setInput("");
    setMentionQuery(null);
    setMentionStartIndex(-1);
    setActiveRoundTargetId(targetedId);

    // Reset history for a fresh discussion
    allRoundsHistoryRef.current = [];
    setAutoplayContinuationRound(0);

    const firstRoundReactions = await runPanelRound(text, media, undefined, targetedId);
    // After the first round, clear the active target (autoplay rounds are open to all)
    setActiveRoundTargetId(null);

    if (!firstRoundReactions) {
      inputRef.current?.focus();
      return;
    }

    allRoundsHistoryRef.current = [firstRoundReactions];

    if (!isAutoplay) {
      inputRef.current?.focus();
      return;
    }

    // ── Autoplay loop ─────────────────────────────────────────────────────────
    const maxContinuations = getAutoplayMaxRounds(personas.length);
    autoplayActiveRef.current = true;
    setIsAutoplayRunning(true);

    for (let continuation = 0; continuation < maxContinuations; continuation++) {
      if (!autoplayActiveRef.current) break;

      // Wait for all TTS audio from the previous round to finish before the
      // next round's text and audio load in (prevents cut-offs)
      await waitForAudioDrained();
      if (!autoplayActiveRef.current) break;

      // Brief UI-settle pause after audio drains
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
      if (!autoplayActiveRef.current) break;

      setAutoplayContinuationRound(continuation + 1);
      // Autoplay continuation rounds are always open (no targeting)
      const roundReactions = await runPanelRound(text, media, allRoundsHistoryRef.current, null);
      if (!roundReactions || !autoplayActiveRef.current) break;

      allRoundsHistoryRef.current = [...allRoundsHistoryRef.current, roundReactions];
    }

    autoplayActiveRef.current = false;
    setIsAutoplayRunning(false);
    setAutoplayContinuationRound(0);
    inputRef.current?.focus();
  }

  function stopAutoplay() {
    autoplayActiveRef.current = false;
    setIsAutoplayRunning(false);
    setAutoplayContinuationRound(0);
    // Immediately silence any queued or playing audio
    audioQueueRef.current = [];
    processingRef.current = false;
    pendingTTSCountRef.current = 0;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentSpeakerId(null);
    // Clear any in-progress streaming state and TTS prefetches
    setStreamingText(new Map());
    ttsStreamBufferRef.current.clear();
    for (const prefetch of Array.from(ttsPrefetchRef.current.values())) {
      prefetch.promise.then((url: string | null) => { if (url) URL.revokeObjectURL(url); });
    }
    ttsPrefetchRef.current.clear();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // ── Mention dropdown navigation ──────────────────────────────────────────
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

    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runPanel(); }
  }

  // ── Analytics ────────────────────────────────────────────────────────────────

  async function runAnalysis() {
    if (!sessionId || analyzing) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res  = await fetch("/api/focus-group/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) { setError((data as { error?: string }).error ?? "Analysis failed"); return; }
      setAnalytics(data as FocusGroupAnalytics);
    } catch {
      setError("Network error during analysis");
    } finally {
      setAnalyzing(false);
    }
  }

  // ── Follow-up trigger ────────────────────────────────────────────────────────

  async function triggerFollowUp(personaId: string) {
    const hint = pendingFollowUps.get(personaId);
    if (!hint || followUpLoadingId !== null) return;

    // Remove from pending immediately so the chip disappears
    setPendingFollowUps((prev) => {
      const next = new Map(prev);
      next.delete(personaId);
      return next;
    });

    setFollowUpLoadingId(personaId);
    setError(null);

    try {
      const allReactions = [...Array.from(reactions.values()), ...Array.from(followUps.values())];
      const res = await fetch("/api/focus-group/panel/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          jobId,
          personaId,
          personas,
          stimulus: input.trim() || undefined,
          media: media || undefined,
          allReactions,
          hint,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? "Follow-up failed");
      }

      const followUp = data as PanelReaction;
      setFollowUps((prev) => new Map(prev).set(personaId, followUp));

      // Enqueue TTS for the follow-up
      const personaIndex = personas.findIndex((p) => p.id === personaId);
      const ttsVoice     = TTS_VOICES[personaIndex % TTS_VOICES.length];
      await fetchAndEnqueueTTS(followUp, ttsVoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Follow-up failed");
    } finally {
      setFollowUpLoadingId(null);
    }
  }

  const hasReactions = reactions.size > 0;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Hidden shared audio element */}
      <audio
        ref={audioRef}
        onEnded={playNext}
        onPause={() => { if (audioRef.current?.ended) setCurrentSpeakerId(null); }}
        className="hidden"
      />

      {/* Explainer */}
      <div className="terminal-card border-border">
        <p className="text-muted-foreground text-sm leading-relaxed font-mono">
          Paste a{" "}
          <span className="text-neon-cyan font-bold">URL</span>
          {", upload a "}
          <span className="text-neon-purple font-bold">landing page, ad, deck, or video</span>
          {" — personas react one at a time, hear each other, and respond like they're on a group call together."}
        </p>
      </div>

      {/* Controls row: speaking indicator + autoplay toggle + mute toggle */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Speaking indicator */}
        <div className="flex items-center gap-2 h-6 min-w-0">
          {currentSpeakerId && (
            <div className="flex items-center gap-1.5 text-neon-cyan">
              <Radio className="h-3 w-3 animate-pulse" />
              <span className="font-mono text-[10px] tracking-widest truncate">
                {personas.find((p) => p.id === currentSpeakerId)?.name?.toUpperCase() ?? "SOMEONE"} IS SPEAKING
              </span>
            </div>
          )}
          {/* Autoplay round progress */}
          {isAutoplayRunning && autoplayContinuationRound > 0 && (
            <div className="flex items-center gap-1.5 text-neon-purple/80">
              <Repeat2 className="h-3 w-3 animate-pulse" />
              <span className="font-mono text-[10px] tracking-widest">
                ROUND {autoplayContinuationRound + 1} / {getAutoplayMaxRounds(personas.length) + 1}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Autoplay toggle */}
          <div className="relative group">
            <button
              onClick={() => {
                if (isAutoplayRunning) {
                  stopAutoplay();
                } else {
                  setIsAutoplay((v) => !v);
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-sm border font-mono text-[10px] font-bold tracking-wider transition-all",
                isAutoplayRunning
                  ? "border-neon-purple/60 text-neon-purple bg-neon-purple/10 animate-pulse"
                  : isAutoplay
                  ? "border-neon-purple/40 text-neon-purple bg-neon-purple/5"
                  : "border-border text-muted-foreground hover:border-neon-purple/30 hover:text-foreground"
              )}
              aria-label={isAutoplayRunning ? "Stop autoplay" : isAutoplay ? "Disable autoplay" : "Enable autoplay"}
            >
              {isAutoplayRunning ? (
                <Square className="h-3 w-3" />
              ) : (
                <Repeat2 className="h-3 w-3" />
              )}
              {isAutoplayRunning ? "STOP" : isAutoplay ? "AUTOPLAY ON" : "AUTOPLAY"}
            </button>
            {/* Hover tooltip */}
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 hidden w-64 rounded-sm border border-border bg-popover px-3 py-2 shadow-md group-hover:block">
              <p className="font-mono text-[10px] text-popover-foreground leading-relaxed">
                {AUTOPLAY_TOOLTIP}
              </p>
              <p className="font-mono text-[9px] text-muted-foreground/80 mt-1.5">
                Up to {getAutoplayMaxRounds(personas.length) + 1} rounds · ~{(getAutoplayMaxRounds(personas.length) + 1) * personas.length} responses max
              </p>
            </div>
          </div>

          {/* Mute toggle */}
          <button
            onClick={() => setIsMuted((m) => !m)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-sm border font-mono text-[10px] font-bold tracking-wider transition-all",
              isMuted
                ? "border-neon-pink/40 text-neon-pink bg-neon-pink/5"
                : "border-border text-muted-foreground hover:border-border hover:text-foreground"
            )}
            aria-label={isMuted ? "Unmute" : "Mute all"}
          >
            {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            {isMuted ? "MUTED" : "VOICES ON"}
          </button>
        </div>
      </div>

      {/* Persona grid */}
      <div className={cn(
        "grid gap-3",
        personas.length <= 2   ? "grid-cols-1 sm:grid-cols-2" :
        personas.length === 3  ? "grid-cols-1 sm:grid-cols-3" :
                                 "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      )}>
        {personas.map((persona, i) => (
          <PersonaReactionCard
            key={persona.id}
            persona={persona}
            personaIndex={i}
            reaction={reactions.get(persona.id) ?? null}
            followUp={followUps.get(persona.id) ?? null}
            isThinking={thinkingPersonaId === persona.id}
            isSpeaking={currentSpeakerId === persona.id}
            isFollowingUp={followUpLoadingId === persona.id}
            isListening={!!activeRoundTargetId && persona.id !== activeRoundTargetId}
            isQueued={
              isRunning &&
              !reactions.has(persona.id) &&
              thinkingPersonaId !== persona.id &&
              !(!!activeRoundTargetId && persona.id !== activeRoundTargetId)
            }
            audioUrl={audioUrls.get(persona.id) ?? null}
            onReplayRequest={handleReplayRequest}
            streamingText={streamingText.get(persona.id) ?? null}
          />
        ))}
      </div>

      {/* Follow-up chips — shown after the round completes if any persona has more to say */}
      {pendingFollowUps.size > 0 && !isRunning && (
        <div className="space-y-2">
          <p className="font-mono text-[9px] text-muted-foreground/50 tracking-widest uppercase">
            Wants to respond
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from(pendingFollowUps.entries()).map(([pid, hint]) => {
              const pIdx    = personas.findIndex((p) => p.id === pid);
              const persona = personas[pIdx];
              if (!persona) return null;
              const color   = AVATAR_COLORS[pIdx % AVATAR_COLORS.length];
              const loading = followUpLoadingId === pid;
              return (
                <button
                  key={pid}
                  onClick={() => triggerFollowUp(pid)}
                  disabled={followUpLoadingId !== null}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-sm border font-mono text-xs transition-all",
                    followUpLoadingId !== null
                      ? "border-border text-muted-foreground opacity-50 cursor-not-allowed"
                      : "border-neon-cyan/30 text-foreground hover:border-neon-cyan/60 hover:bg-neon-cyan/5 cursor-pointer"
                  )}
                >
                  {loading ? (
                    <Loader2 className="h-3 w-3 animate-spin text-neon-cyan flex-shrink-0" />
                  ) : (
                    <div className={cn(
                      "h-4 w-4 rounded-[2px] flex items-center justify-center text-primary-foreground font-mono text-[8px] font-bold flex-shrink-0",
                      color,
                    )}>
                      {getInitials(persona.name)}
                    </div>
                  )}
                  <span className="font-bold">{persona.name}</span>
                  <MessageSquarePlus className="h-3 w-3 text-neon-cyan flex-shrink-0" />
                  <span className="text-muted-foreground truncate max-w-[180px]">{hint}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input received + personas thinking banner — right above input so it's visible after send */}
      {isRunning && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-sm border-2 border-neon-cyan/40 bg-neon-cyan/10">
          <Loader2 className="h-4 w-4 animate-spin text-neon-cyan flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs font-bold text-neon-cyan tracking-wider">
              INPUT RECEIVED — Personas are preparing their responses
            </p>
            {lastSubmittedPreview && (
              <p className="font-mono text-[10px] text-muted-foreground truncate mt-0.5">
                "{lastSubmittedPreview}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border border-border rounded-sm overflow-hidden">
        {/* Media preview */}
        {media && (
          <div className="p-3 border-b border-border">
            <MediaPreview media={media} onRemove={() => setMedia(null)} />
          </div>
        )}

        {/* URL input row — visible when no media attached */}
        {!media && (
          <div className="p-3 border-b border-border bg-secondary/5 flex gap-2 items-center">
            <Link className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <input
              ref={urlInputRef}
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={handleUrlKeyDown}
              placeholder="Paste a URL — website, landing page, or YouTube video..."
              disabled={isFetchingUrl || isRunning}
              className="flex-1 bg-transparent font-mono text-xs text-foreground placeholder-muted-foreground/60 focus:outline-none"
            />
            <button
              onClick={fetchUrl}
              disabled={!urlInput.trim() || isFetchingUrl || isRunning}
              className={cn(
                "flex-shrink-0 h-7 px-2.5 rounded-sm font-mono text-[10px] font-bold tracking-wider border transition-all",
                urlInput.trim() && !isFetchingUrl && !isRunning
                  ? "border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10"
                  : "border-border text-muted-foreground opacity-50 cursor-not-allowed"
              )}
              aria-label="Fetch URL"
            >
              {isFetchingUrl ? <Loader2 className="h-3 w-3 animate-spin" /> : "FETCH"}
            </button>
          </div>
        )}

        {/* Drop zone hint */}
        {!media && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="px-3 py-2 border-b border-border border-dashed bg-secondary/10 text-center transition-colors hover:bg-secondary/20"
          >
            {isProcessingMedia ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-mono text-[10px] tracking-wider">PROCESSING FILE...</span>
              </div>
            ) : (
              <p className="font-mono text-[10px] text-muted-foreground/60 tracking-wider">
                DROP IMAGE, PDF, OR VIDEO HERE — or paste a screenshot
              </p>
            )}
          </div>
        )}

        {/* Targeting indicator — shown when @Name in input resolves to a persona */}
        {targetedPersonaFromInput && (
          <div className="px-3 py-1.5 border-b border-neon-cyan/20 bg-neon-cyan/5 flex items-center gap-2">
            <AtSign className="h-3 w-3 text-neon-cyan flex-shrink-0" />
            <span className="font-mono text-[10px] text-neon-cyan tracking-wider">
              DIRECTING TO{" "}
              <span className="font-bold">{targetedPersonaFromInput.name}</span>
              {" — "}others will listen but not respond
            </span>
            <button
              onClick={() => {
                // Strip the @mention from the input
                setInput((v) => v.replace(/@\w+\s?/, "").trim());
              }}
              className="ml-auto h-4 w-4 flex items-center justify-center text-neon-cyan/60 hover:text-neon-cyan transition-colors"
              aria-label="Remove target"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* @mention dropdown — inline section, avoids overflow-hidden clipping */}
        {mentionQuery !== null && mentionFilteredPersonas.length > 0 && (
          <div className="border-b border-border">
            <div className="px-3 py-1 bg-secondary/20 border-b border-border">
              <span className="font-mono text-[9px] text-muted-foreground/60 tracking-widest">DIRECT TO PERSONA — type more to filter</span>
            </div>
            {mentionFilteredPersonas.map((p, idx) => {
              const pIdx = personas.indexOf(p);
              const color = AVATAR_COLORS[pIdx % AVATAR_COLORS.length];
              return (
                <button
                  key={p.id}
                  onMouseDown={(e) => { e.preventDefault(); selectMentionPersona(p); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                    idx === mentionSelectedIndex
                      ? "bg-secondary/60"
                      : "hover:bg-secondary/30",
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

        {/* Text input row */}
        <div className="p-3 flex gap-2 items-end bg-secondary/10">
          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isRunning || isProcessingMedia}
            className={cn(
              "flex-shrink-0 h-9 w-9 rounded-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-neon-purple/40 transition-all",
              (isRunning || isProcessingMedia) && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Upload file"
          >
            {isProcessingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
              e.target.value = "";
            }}
          />

          {/* Mic button */}
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={!voiceSupported || isRunning}
            title={!voiceSupported ? "Voice input not supported in this browser" : undefined}
            className={cn(
              "flex-shrink-0 h-9 w-9 rounded-sm border flex items-center justify-center transition-all",
              isListening
                ? "border-neon-pink/60 text-neon-pink bg-neon-pink/10 animate-pulse"
                : voiceSupported
                ? "border-border text-muted-foreground hover:text-foreground hover:border-neon-pink/40"
                : "border-border text-muted-foreground/30 cursor-not-allowed opacity-50"
            )}
            aria-label={isListening ? "Stop recording" : "Start voice input"}
          >
            {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          </button>

          {/* Text input */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              isListening
                ? "Listening... speak your question"
                : media
                ? "Add context about this material, or just hit send..."
                : "Ask a question or type @ to direct it at someone..."
            }
            rows={1}
            className="flex-1 bg-transparent font-mono text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none leading-relaxed py-1 px-1 min-h-[32px] max-h-28"
            style={{ fieldSizing: "content" } as React.CSSProperties}
            disabled={isRunning}
          />

          {/* Send button */}
          <button
            onClick={runPanel}
            disabled={(!input.trim() && !media) || isRunning}
            className="flex-shrink-0 h-9 w-9 rounded-sm disabled:bg-secondary disabled:text-muted-foreground text-primary-foreground flex items-center justify-center transition-all bg-neon-purple hover:opacity-90"
            aria-label="Send to panel"
          >
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-neon-pink font-mono text-xs border border-neon-pink/30 bg-neon-pink/5 rounded-sm p-3">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Status + generate report row */}
      {(hasReactions || roundCount > 0) && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-muted-foreground/50">
            <Users className="h-3 w-3" />
            <span className="font-mono text-[9px] tracking-widest">
              {roundCount} PANEL {roundCount === 1 ? "ROUND" : "ROUNDS"} COMPLETE
              {sessionId ? " · SESSION ACTIVE" : ""}
            </span>
          </div>

          {sessionId && roundCount >= 1 && (
            <button
              onClick={runAnalysis}
              disabled={analyzing || isRunning}
              className={cn(
                "flex items-center gap-2 py-2 px-3 rounded-sm font-mono text-[10px] font-bold border-2 transition-all tracking-wider",
                !analyzing && !isRunning
                  ? "border-neon-amber text-neon-amber hover:bg-neon-amber/10"
                  : "border-border text-muted-foreground cursor-not-allowed opacity-50"
              )}
            >
              {analyzing ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> ANALYZING...</>
              ) : (
                <><BarChart3 className="h-3 w-3" /> GENERATE REPORT</>
              )}
            </button>
          )}
        </div>
      )}

      {analytics && (
        <FocusGroupAnalyticsDashboard analytics={analytics} personas={personas} />
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-muted-foreground/40">
        <div className="flex items-center gap-1"><Globe className="h-3 w-3" /><span className="font-mono text-[9px]">URLS</span></div>
        <div className="flex items-center gap-1"><ImageIcon className="h-3 w-3" /><span className="font-mono text-[9px]">IMAGES</span></div>
        <div className="flex items-center gap-1"><FileText className="h-3 w-3" /><span className="font-mono text-[9px]">PDF DECKS</span></div>
        <div className="flex items-center gap-1"><Video className="h-3 w-3" /><span className="font-mono text-[9px]">VIDEOS</span></div>
      </div>
    </div>
  );
}
