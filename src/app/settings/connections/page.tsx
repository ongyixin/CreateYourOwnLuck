"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Linkedin,
  Twitter,
  Facebook,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Unlink,
} from "lucide-react";
import ScanlineOverlay from "@/components/scanline-overlay";
import type { SocialConnectionRecord, SocialPlatform } from "@/lib/types";

interface PlatformConfig {
  id: SocialPlatform;
  label: string;
  Icon: typeof Linkedin;
  color: string;
  borderColor: string;
  connectUrl: string;
  description: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: "LINKEDIN",
    label: "LinkedIn",
    Icon: Linkedin,
    color: "text-[#0A66C2]",
    borderColor: "border-[#0A66C2]/40",
    connectUrl: "/api/social/linkedin/connect",
    description: "Post updates and articles to your LinkedIn profile",
  },
  {
    id: "TWITTER",
    label: "Twitter / X",
    Icon: Twitter,
    color: "text-foreground",
    borderColor: "border-foreground/40",
    connectUrl: "/api/social/twitter/connect",
    description: "Publish tweets from your Brand Copilot assets",
  },
  {
    id: "FACEBOOK",
    label: "Facebook",
    Icon: Facebook,
    color: "text-[#1877F2]",
    borderColor: "border-[#1877F2]/40",
    connectUrl: "/api/social/facebook/connect",
    description: "Post to your Facebook Pages",
  },
];

export default function ConnectionsPage() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<SocialConnectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/social/connections");
      const data = await res.json();
      if (data.connections) setConnections(data.connections);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected) {
      const platform = PLATFORMS.find((p) => p.id === connected.toUpperCase());
      setToast({
        type: "success",
        message: `${platform?.label ?? connected} connected successfully`,
      });
    } else if (error) {
      const messages: Record<string, string> = {
        invalid_state: "OAuth validation failed. Please try again.",
        token_exchange_failed: "Could not exchange tokens. Please try again.",
        oauth_cancelled: "OAuth was cancelled.",
      };
      setToast({ type: "error", message: messages[error] ?? `Error: ${error}` });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleDisconnect(connectionId: string) {
    setDisconnecting(connectionId);
    try {
      const res = await fetch(`/api/social/connections/${connectionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConnections((prev) => prev.filter((c) => c.id !== connectionId));
        setToast({ type: "success", message: "Account disconnected" });
      } else {
        setToast({ type: "error", message: "Failed to disconnect" });
      }
    } catch {
      setToast({ type: "error", message: "Failed to disconnect" });
    } finally {
      setDisconnecting(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <ScanlineOverlay />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 text-xs border ${
            toast.type === "success"
              ? "border-neon-green/60 text-neon-green bg-background"
              : "border-red-400/60 text-red-400 bg-background"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-10">
          <div className="text-[10px] text-neon-green tracking-[0.4em] uppercase mb-2">
            SETTINGS / CONNECTIONS
          </div>
          <h1 className="text-2xl font-bold tracking-wider text-foreground">
            SOCIAL ACCOUNTS
          </h1>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Connect your social accounts to publish Brand Copilot outputs directly from the app.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            LOADING CONNECTIONS...
          </div>
        ) : (
          <div className="space-y-4">
            {PLATFORMS.map((platform) => {
              const platformConnections = connections.filter(
                (c) => c.platform === platform.id
              );
              const { Icon } = platform;

              return (
                <div
                  key={platform.id}
                  className={`terminal-card border-l-4 ${platform.borderColor}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 shrink-0 ${platform.color}`} />
                      <div>
                        <div className="font-mono text-sm font-bold text-foreground tracking-wider">
                          {platform.label.toUpperCase()}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {platform.description}
                        </div>
                      </div>
                    </div>

                    {platformConnections.length === 0 ? (
                      <a
                        href={platform.connectUrl}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono tracking-wider border border-neon-green/60 text-neon-green hover:bg-neon-green/10 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        CONNECT
                      </a>
                    ) : (
                      <a
                        href={platform.connectUrl}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono tracking-wider border border-border text-muted-foreground hover:border-neon-green/40 hover:text-neon-green transition-colors"
                      >
                        + ADD ACCOUNT
                      </a>
                    )}
                  </div>

                  {/* Connected accounts */}
                  {platformConnections.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {platformConnections.map((conn) => (
                        <div
                          key={conn.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 bg-secondary rounded-sm border border-neon-green/20"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <CheckCircle className="w-3 h-3 text-neon-green shrink-0" />
                            <span className="text-xs text-foreground truncate">
                              {conn.platformUsername}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDisconnect(conn.id)}
                            disabled={disconnecting === conn.id}
                            className="shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
                          >
                            {disconnecting === conn.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Unlink className="w-3 h-3" />
                            )}
                            {disconnecting === conn.id ? "DISCONNECTING..." : "DISCONNECT"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Info note */}
        <div className="mt-8 p-4 border border-border text-[10px] text-muted-foreground leading-relaxed space-y-1">
          <p className="text-neon-amber tracking-widest">NOTE</p>
          <p>
            For LinkedIn DM outreach templates, we copy the message to your clipboard and open
            the LinkedIn compose window — direct messaging requires partner API access.
          </p>
          <p>
            Tokens are encrypted with AES-256-GCM before storage. You can revoke access from
            each platform&apos;s settings at any time.
          </p>
        </div>

        <div className="mt-8 flex items-center gap-6">
          <Link
            href="/reports"
            className="text-[10px] text-muted-foreground hover:text-neon-green transition-colors tracking-widest"
          >
            ← BACK TO REPORTS
          </Link>
          <XCircle
            className="w-0 h-0 hidden"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
