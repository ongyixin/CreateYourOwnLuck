"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
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
  RefreshCw,
  BarChart3,
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

const SENTIMENT_STYLES: Record<PanelReaction["sentiment"], string> = {
  positive: "border-neon-green/40 bg-neon-green/5",
  neutral: "border-border bg-card",
  skeptical: "border-neon-amber/40 bg-neon-amber/5",
  negative: "border-neon-pink/40 bg-neon-pink/5",
};

const SENTIMENT_LABEL_STYLES: Record<PanelReaction["sentiment"], string> = {
  positive: "text-neon-green",
  neutral: "text-muted-foreground",
  skeptical: "text-neon-amber",
  negative: "text-neon-pink",
};

const SENTIMENT_DOTS: Record<PanelReaction["sentiment"], string> = {
  positive: "bg-neon-green",
  neutral: "bg-muted-foreground",
  skeptical: "bg-neon-amber",
  negative: "bg-neon-pink",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Media Preview ─────────────────────────────────────────────────────────────

function MediaPreview({
  media,
  onRemove,
}: {
  media: MediaAttachment;
  onRemove: () => void;
}) {
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
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={media.dataUrl}
          alt={media.name}
          className="w-full max-h-48 object-contain"
        />
      )}

      {media.type === "video" && media.dataUrl && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={media.dataUrl}
            alt={`${media.name} (first frame)`}
            className="w-full max-h-48 object-contain"
          />
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
              PDF — {media.extractedText
                ? `${Math.round(media.extractedText.length / 4)} words extracted`
                : "No text extracted"}
            </p>
          </div>
        </div>
      )}

      <div className="px-3 pb-2">
        <p className="font-mono text-[9px] text-muted-foreground/60 truncate">{media.name}</p>
      </div>
    </div>
  );
}

// ─── Persona Reaction Card ─────────────────────────────────────────────────────

function PersonaReactionCard({
  persona,
  personaIndex,
  reaction,
  isLoading,
  ttsVoice,
}: {
  persona: Persona;
  personaIndex: number;
  reaction: PanelReaction | null;
  isLoading: boolean;
  ttsVoice: string;
}) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isFetchingAudio, setIsFetchingAudio] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const color = AVATAR_COLORS[personaIndex % AVATAR_COLORS.length];

  const fetchAndPlayAudio = useCallback(async (text: string) => {
    if (isMuted) return;
    setIsFetchingAudio(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: ttsVoice }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch(() => null);
        setIsPlaying(true);
      }
    } finally {
      setIsFetchingAudio(false);
    }
  }, [isMuted, ttsVoice]);

  // Auto-play when reaction arrives
  useEffect(() => {
    if (reaction && !audioUrl) {
      fetchAndPlayAudio(reaction.content);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reaction?.content]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const handleReplay = () => {
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => null);
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    setIsMuted((m) => !m);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  const sentimentStyle = reaction ? SENTIMENT_STYLES[reaction.sentiment] : "border-border bg-card";
  const sentimentLabelStyle = reaction ? SENTIMENT_LABEL_STYLES[reaction.sentiment] : "text-muted-foreground";
  const sentimentDot = reaction ? SENTIMENT_DOTS[reaction.sentiment] : "bg-muted-foreground";

  return (
    <div
      className={cn(
        "rounded-sm border-2 p-4 flex flex-col gap-3 transition-all",
        sentimentStyle
      )}
    >
      {/* Card header */}
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "h-8 w-8 rounded-sm flex items-center justify-center text-primary-foreground font-mono text-[10px] font-bold flex-shrink-0",
            color
          )}
        >
          {getInitials(persona.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs font-bold text-foreground truncate">
            {persona.name}
          </p>
          <p className="text-muted-foreground text-[10px] truncate">{persona.title}</p>
        </div>

        {/* Sentiment dot + audio controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {reaction && (
            <div className="flex items-center gap-1">
              <span className={cn("h-2 w-2 rounded-full inline-block", sentimentDot)} />
              <span className={cn("font-mono text-[9px] uppercase tracking-widest", sentimentLabelStyle)}>
                {reaction.sentiment}
              </span>
            </div>
          )}
          {reaction && (
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={toggleMute}
                className="h-5 w-5 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              </button>
              {audioUrl && (
                <button
                  onClick={handleReplay}
                  disabled={isPlaying && !audioRef.current?.paused}
                  className="h-5 w-5 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                  aria-label="Replay"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              )}
              {isFetchingAudio && (
                <Loader2 className="h-3 w-3 text-muted-foreground animate-spin" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reaction content */}
      <div className="min-h-[60px] flex items-start">
        {isLoading && !reaction && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
            <span className="font-mono text-[10px] tracking-wider">THINKING...</span>
          </div>
        )}
        {reaction && (
          <p className="text-sm text-foreground leading-relaxed">{reaction.content}</p>
        )}
        {!isLoading && !reaction && (
          <p className="font-mono text-[10px] text-muted-foreground/50 tracking-wider self-center w-full text-center">
            AWAITING STIMULUS
          </p>
        )}
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  );
}

// ─── Upload helper ─────────────────────────────────────────────────────────────

async function processFile(file: File): Promise<MediaAttachment | null> {
  const type = file.type;

  // Images
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

  // PDFs — send to /api/parse-pdf, no thumbnail
  if (type === "application/pdf") {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/parse-pdf", { method: "POST", body: formData });
      if (!res.ok) return null;
      const { text } = (await res.json()) as { text: string };
      return {
        type: "pdf",
        name: file.name,
        dataUrl: null,
        extractedText: text,
        mimeType: type,
      };
    } catch {
      return null;
    }
  }

  // Videos — extract first frame via canvas
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
        resolve({
          type: "video",
          name: file.name,
          dataUrl,
          extractedText: null,
          mimeType: type,
        });
      };
      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
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
  const [reactions, setReactions] = useState<Map<string, PanelReaction>>(new Map());
  const [loadingPersonaIds, setLoadingPersonaIds] = useState<Set<string>>(new Set());
  const [media, setMedia] = useState<MediaAttachment | null>(null);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [roundCount, setRoundCount] = useState(0);
  const [analytics, setAnalytics] = useState<FocusGroupAnalytics | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isListening,
    isSupported: voiceSupported,
    transcript,
    start: startListening,
    stop: stopListening,
  } = useVoiceInput({
    onResult: (text) => setInput(text),
  });

  // When transcription comes in, fill it into input
  useEffect(() => {
    if (transcript) setInput(transcript);
  }, [transcript]);

  const handleFileSelect = useCallback(async (file: File) => {
    setIsProcessingMedia(true);
    setError(null);
    try {
      const result = await processFile(file);
      if (result) {
        setMedia(result);
      } else {
        setError("Unsupported file type or processing failed. Try PNG, JPG, PDF, or MP4.");
      }
    } finally {
      setIsProcessingMedia(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const item = Array.from(e.clipboardData.items).find((i) =>
        i.type.startsWith("image/")
      );
      if (item) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleFileSelect(file);
        }
      }
    },
    [handleFileSelect]
  );

  async function runPanel() {
    const text = input.trim();
    if ((!text && !media) || isRunning) return;

    setInput("");
    setError(null);
    setIsRunning(true);
    setReactions(new Map());
    setLoadingPersonaIds(new Set(personas.map((p) => p.id)));

    try {
      const res = await fetch("/api/focus-group/panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          jobId,
          personas,
          stimulus: text || undefined,
          media: media || undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Panel request failed");
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

            if (event.type === "session_id") {
              setSessionId(event.sessionId);
            }

            if (event.type === "persona_reaction_start") {
              setLoadingPersonaIds((prev) => {
                const next = new Set(prev);
                next.add(event.personaId);
                return next;
              });
            }

            if (event.type === "persona_reaction_complete") {
              const reaction = event.reaction as PanelReaction;
              setReactions((prev) => new Map(prev).set(reaction.personaId, reaction));
              setLoadingPersonaIds((prev) => {
                const next = new Set(prev);
                next.delete(reaction.personaId);
                return next;
              });
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error — please try again");
    } finally {
      setLoadingPersonaIds(new Set());
      setIsRunning(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runPanel();
    }
  }

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

  const hasReactions = reactions.size > 0;

  return (
    <div className="space-y-4">
      {/* Explainer */}
      <div className="terminal-card border-border">
        <p className="text-muted-foreground text-sm leading-relaxed font-mono">
          Upload a{" "}
          <span className="text-neon-purple font-bold">landing page, ad, deck, or video</span>{" "}
          and get instant live reactions from all personas at once — like a real research panel.
          Speak your question or type it. Each persona reacts in parallel with their own voice.
        </p>
      </div>

      {/* Persona grid */}
      <div
        className={cn(
          "grid gap-3",
          personas.length <= 2
            ? "grid-cols-1 sm:grid-cols-2"
            : personas.length === 3
            ? "grid-cols-1 sm:grid-cols-3"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {personas.map((persona, i) => (
          <PersonaReactionCard
            key={persona.id}
            persona={persona}
            personaIndex={i}
            reaction={reactions.get(persona.id) ?? null}
            isLoading={loadingPersonaIds.has(persona.id)}
            ttsVoice={TTS_VOICES[i % TTS_VOICES.length]}
          />
        ))}
      </div>

      {/* Input area */}
      <div className="border border-border rounded-sm overflow-hidden">
        {/* Media preview */}
        {media && (
          <div className="p-3 border-b border-border">
            <MediaPreview media={media} onRemove={() => setMedia(null)} />
          </div>
        )}

        {/* Drop zone hint when no media */}
        {!media && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="p-3 border-b border-border border-dashed bg-secondary/10 text-center transition-colors hover:bg-secondary/20"
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
            {isProcessingMedia ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
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
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              isListening
                ? "Listening... speak your question"
                : media
                ? "Add context about this material, or just hit send..."
                : "Describe a landing page, paste a headline, or ask a question..."
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
            className={cn(
              "flex-shrink-0 h-9 w-9 rounded-sm disabled:bg-secondary disabled:text-muted-foreground text-primary-foreground flex items-center justify-center transition-all bg-neon-purple hover:opacity-90"
            )}
            aria-label="Send to panel"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
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
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> ANALYZING...
                </>
              ) : (
                <>
                  <BarChart3 className="h-3 w-3" /> GENERATE REPORT
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Analytics dashboard */}
      {analytics && (
        <FocusGroupAnalyticsDashboard analytics={analytics} personas={personas} />
      )}

      {/* Media type icons legend */}
      <div className="flex items-center gap-4 text-muted-foreground/40">
        <div className="flex items-center gap-1">
          <ImageIcon className="h-3 w-3" />
          <span className="font-mono text-[9px]">IMAGES</span>
        </div>
        <div className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          <span className="font-mono text-[9px]">PDF DECKS</span>
        </div>
        <div className="flex items-center gap-1">
          <Video className="h-3 w-3" />
          <span className="font-mono text-[9px]">VIDEOS</span>
        </div>
      </div>
    </div>
  );
}
