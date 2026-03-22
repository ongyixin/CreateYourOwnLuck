"use client";

import { useState } from "react";
import { Lock, Zap, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useUserTier } from "@/lib/auth/use-user-tier";
import { signIn } from "next-auth/react";

interface PaywallGateProps {
  featureName: string;
  featureDesc: string;
  requiredTier: "PRO" | "AGENCY";
  children: React.ReactNode;
}

const TIER_LABEL: Record<string, string> = {
  PRO: "SERIES A",
  AGENCY: "SERIES B",
};

export function PaywallGate({ featureName, featureDesc, requiredTier, children }: PaywallGateProps) {
  const { canAccess, isLoading, isAuthenticated } = useUserTier();
  const [upgrading, setUpgrading] = useState(false);

  if (isLoading) return null;

  if (isAuthenticated && canAccess(requiredTier)) {
    return <>{children}</>;
  }

  const handleUpgrade = async () => {
    if (!isAuthenticated) {
      signIn();
      return;
    }
    setUpgrading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: requiredTier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setUpgrading(false);
    }
  };

  return (
    <div className="relative min-h-[520px] flex items-center justify-center">
      {/* Blurred background preview */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
        <div className="opacity-20 blur-sm scale-95">{children}</div>
      </div>

      {/* Paywall overlay */}
      <div className="relative z-10 flex flex-col items-center gap-6 max-w-sm w-full px-4">
        <div className="terminal-card border-neon-green glow-green w-full text-center"
          style={{ boxShadow: "0 0 20px hsl(153 100% 50% / 0.3), 0 0 60px hsl(153 100% 50% / 0.08)" }}
        >
          {/* Lock icon */}
          <div className="flex items-center justify-center w-12 h-12 border-2 border-neon-green rounded-sm mx-auto mb-4">
            <Lock className="w-5 h-5 text-neon-green" />
          </div>

          {/* Labels */}
          <div className="font-mono text-[10px] text-neon-amber tracking-[0.3em] uppercase mb-1">
            PRO FEATURE
          </div>
          <h3 className="font-mono text-base font-bold text-foreground tracking-wider mb-1">
            {featureName}
          </h3>
          <p className="font-mono text-xs text-muted-foreground mb-5 leading-relaxed">
            {featureDesc}
          </p>

          {/* Required plan badge */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <Zap className="w-3 h-3 text-neon-green" />
            <span className="font-mono text-[10px] text-neon-green tracking-widest border border-neon-green px-2 py-0.5">
              REQUIRES [ {TIER_LABEL[requiredTier] ?? requiredTier} ] OR HIGHER
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            {!isAuthenticated ? (
              <button
                onClick={() => signIn()}
                className="w-full bg-neon-green text-primary-foreground font-mono font-bold px-4 py-2.5 rounded-sm text-xs tracking-wider hover:glow-green transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                SIGN IN TO ACCESS <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="w-full bg-neon-green text-primary-foreground font-mono font-bold px-4 py-2.5 rounded-sm text-xs tracking-wider hover:glow-green transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {upgrading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    UPGRADE TO {TIER_LABEL[requiredTier] ?? requiredTier} <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
            <Link
              href="/#pricing"
              className="w-full border-2 border-border text-muted-foreground font-mono font-bold px-4 py-2.5 rounded-sm text-xs tracking-wider hover:border-neon-green hover:text-neon-green transition-all text-center"
            >
              VIEW PLANS
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
