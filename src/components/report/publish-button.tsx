"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Linkedin, Twitter, Facebook, ChevronDown, Settings } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSocialConnections } from "./social-connections-provider";
import { PublishModal } from "./publish-modal";
import type { SocialConnectionRecord, SocialPlatform } from "@/lib/types";

const PLATFORM_ICONS: Record<SocialPlatform, typeof Linkedin> = {
  LINKEDIN: Linkedin,
  TWITTER: Twitter,
  FACEBOOK: Facebook,
};

const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  LINKEDIN: "text-[#0A66C2]",
  TWITTER: "text-foreground",
  FACEBOOK: "text-[#1877F2]",
};

interface PublishButtonProps {
  text: string;
  assetId: string;
  label?: string;
}

export function PublishButton({ text, assetId, label = "Publish" }: PublishButtonProps) {
  const { connections, loading } = useSocialConnections();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<SocialConnectionRecord | null>(null);
  const [publishedPlatforms, setPublishedPlatforms] = useState<Set<SocialPlatform>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Don't render while loading or if no connections
  if (loading) return null;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 font-mono text-[10px] tracking-wider text-muted-foreground hover:text-neon-green transition-colors"
          title={label}
        >
          <Send className="h-3 w-3" />
          <span className="hidden sm:inline">{label.toUpperCase()}</span>
          <ChevronDown className={cn("h-2.5 w-2.5 transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 w-52 bg-background border border-border shadow-xl z-20 font-mono">
            {connections.length === 0 ? (
              <div className="px-3 py-3 space-y-2">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  No social accounts connected.
                </p>
                <Link
                  href="/settings/connections"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-1.5 text-[10px] text-neon-green hover:underline"
                >
                  <Settings className="w-3 h-3" />
                  CONNECT ACCOUNTS
                </Link>
              </div>
            ) : (
              <div className="py-1">
                <div className="px-3 py-1.5 text-[9px] text-muted-foreground tracking-widest border-b border-border">
                  PUBLISH TO
                </div>
                {connections.map((conn) => {
                  const Icon = PLATFORM_ICONS[conn.platform];
                  const color = PLATFORM_COLORS[conn.platform];
                  const published = publishedPlatforms.has(conn.platform);

                  return (
                    <button
                      key={conn.id}
                      onClick={() => {
                        setOpen(false);
                        setModal(conn);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-secondary transition-colors text-left"
                    >
                      <Icon className={cn("w-3.5 h-3.5 shrink-0", color)} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] text-foreground truncate">
                          {conn.platformUsername}
                        </div>
                        <div className="text-[9px] text-muted-foreground">{conn.platform}</div>
                      </div>
                      {published && (
                        <span className="text-[9px] text-neon-green tracking-widest shrink-0">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
                <div className="border-t border-border px-3 py-1.5">
                  <Link
                    href="/settings/connections"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-1.5 text-[9px] text-muted-foreground hover:text-neon-green transition-colors"
                  >
                    <Settings className="w-3 h-3" />
                    MANAGE CONNECTIONS
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {modal && (
        <PublishModal
          connection={modal}
          assetId={assetId}
          initialText={text}
          onClose={() => setModal(null)}
          onPublished={() => {
            setPublishedPlatforms((prev) => new Set(Array.from(prev).concat(modal.platform)));
            setModal(null);
          }}
        />
      )}
    </>
  );
}
