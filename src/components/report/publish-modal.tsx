"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Linkedin,
  Twitter,
  Facebook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SocialConnectionRecord, SocialPlatform } from "@/lib/types";

const CHAR_LIMITS: Record<SocialPlatform, number> = {
  LINKEDIN: 3000,
  TWITTER: 280,
  FACEBOOK: 63206,
};

const PLATFORM_ICONS: Record<SocialPlatform, typeof Linkedin> = {
  LINKEDIN: Linkedin,
  TWITTER: Twitter,
  FACEBOOK: Facebook,
};

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  LINKEDIN: "LinkedIn",
  TWITTER: "Twitter / X",
  FACEBOOK: "Facebook",
};

const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  LINKEDIN: "text-[#0A66C2] border-[#0A66C2]/40",
  TWITTER: "text-foreground border-foreground/40",
  FACEBOOK: "text-[#1877F2] border-[#1877F2]/40",
};

interface PublishModalProps {
  connection: SocialConnectionRecord;
  assetId: string;
  initialText: string;
  onClose: () => void;
  onPublished?: (externalUrl?: string) => void;
}

export function PublishModal({
  connection,
  assetId,
  initialText,
  onClose,
  onPublished,
}: PublishModalProps) {
  const [text, setText] = useState(initialText);
  const [status, setStatus] = useState<"idle" | "publishing" | "success" | "error">("idle");
  const [externalUrl, setExternalUrl] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const limit = CHAR_LIMITS[connection.platform];
  const over = text.length > limit;
  const PlatformIcon = PLATFORM_ICONS[connection.platform];
  const platformColor = PLATFORM_COLORS[connection.platform];

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && status !== "publishing") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, status]);

  async function handlePublish() {
    if (over || status === "publishing") return;

    setStatus("publishing");
    setErrorMessage(undefined);

    try {
      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: connection.id, assetId, content: text }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        setExternalUrl(data.externalUrl);
        onPublished?.(data.externalUrl);
      } else {
        setStatus("error");
        setErrorMessage(data.error ?? "Publish failed");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && status !== "publishing") onClose(); }}
    >
      <div className="w-full max-w-lg bg-background border border-border shadow-2xl font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <PlatformIcon className={cn("w-4 h-4", platformColor.split(" ")[0])} />
            <span className={cn("text-[11px] tracking-widest border px-2 py-0.5", platformColor)}>
              {PLATFORM_LABELS[connection.platform]}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {connection.platformUsername}
            </span>
          </div>
          {status !== "publishing" && (
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-5 space-y-4">
          {status === "success" ? (
            <div className="text-center py-6 space-y-4">
              <CheckCircle className="w-10 h-10 text-neon-green mx-auto" />
              <div>
                <p className="text-sm font-bold text-foreground tracking-wider">PUBLISHED</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your content has been posted to {PLATFORM_LABELS[connection.platform]}.
                </p>
              </div>
              {externalUrl && (
                <a
                  href={externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] text-neon-green border border-neon-green/40 px-3 py-1.5 hover:bg-neon-green/10 transition-colors"
                >
                  VIEW POST <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                onClick={onClose}
                className="block w-full text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-2"
              >
                CLOSE
              </button>
            </div>
          ) : (
            <>
              {/* Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-muted-foreground tracking-widest">
                    EDIT BEFORE PUBLISHING
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-mono tabular-nums",
                      over ? "text-red-400" : text.length > limit * 0.9 ? "text-neon-amber" : "text-muted-foreground"
                    )}
                  >
                    {text.length}/{limit}
                  </span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={status === "publishing"}
                  rows={8}
                  className={cn(
                    "w-full bg-secondary border text-sm text-foreground p-3 resize-none leading-relaxed focus:outline-none focus:border-neon-green/60 transition-colors",
                    over ? "border-red-400/60" : "border-border"
                  )}
                  placeholder="Enter your post content..."
                />
                {over && (
                  <p className="text-[10px] text-red-400 mt-1">
                    Exceeds {PLATFORM_LABELS[connection.platform]} character limit by {text.length - limit}
                  </p>
                )}
              </div>

              {/* Error */}
              {status === "error" && errorMessage && (
                <div className="flex items-start gap-2 text-[11px] text-red-400 border border-red-400/30 px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {errorMessage}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={onClose}
                  disabled={status === "publishing"}
                  className="text-[11px] text-muted-foreground hover:text-foreground tracking-wider transition-colors disabled:opacity-50"
                >
                  CANCEL
                </button>
                <button
                  onClick={handlePublish}
                  disabled={over || status === "publishing" || !text.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-[11px] tracking-wider bg-neon-green text-black font-bold hover:bg-neon-green/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {status === "publishing" ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      PUBLISHING...
                    </>
                  ) : (
                    `PUBLISH TO ${PLATFORM_LABELS[connection.platform].toUpperCase()}`
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
