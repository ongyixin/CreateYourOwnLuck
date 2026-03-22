"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import AnimatedLogo from "@/components/animated-logo";

const TIERS = ["FREE", "PRO", "AGENCY"] as const;
type Tier = (typeof TIERS)[number];

const TIER_COLORS: Record<Tier, string> = {
  FREE: "text-muted-foreground border-border",
  PRO: "text-neon-green border-neon-green",
  AGENCY: "text-neon-pink border-neon-pink",
};

export default function AdminNav() {
  const { data: session, update } = useSession();
  const [switching, setSwitching] = useState(false);

  const currentTier = (session?.user?.tier ?? "AGENCY") as Tier;

  async function switchTier(tier: Tier) {
    if (tier === currentTier || switching) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/admin/self/tier", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      if (res.ok) {
        await update(); // force JWT refresh
      }
    } finally {
      setSwitching(false);
    }
  }

  return (
    <nav className="relative z-40 border-b border-neon-amber/40 px-6 py-3 bg-background/95 backdrop-blur-md">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <AnimatedLogo size={18} />
            <span className="font-mono text-neon-green font-bold text-sm tracking-wider">
              FITCHECK<span className="blink">_</span>
            </span>
          </Link>
          <span className="font-mono text-[10px] text-neon-amber tracking-widest border border-neon-amber px-2 py-0.5">
            ADMIN
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Tier switcher */}
          <div className="flex items-center gap-1">
            <span className="font-mono text-[9px] text-muted-foreground tracking-widest mr-1">
              TEST TIER:
            </span>
            {TIERS.map((tier) => (
              <button
                key={tier}
                onClick={() => switchTier(tier)}
                disabled={switching}
                className={`font-mono text-[9px] border px-2 py-0.5 tracking-widest transition-all ${
                  tier === currentTier
                    ? TIER_COLORS[tier] + " opacity-100"
                    : "text-muted-foreground border-border opacity-50 hover:opacity-80"
                } disabled:cursor-wait`}
              >
                {tier}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 font-mono text-[10px] tracking-widest">
            <Link href="/admin" className="text-muted-foreground hover:text-neon-green transition-colors">
              DASHBOARD
            </Link>
            <Link href="/admin/users" className="text-muted-foreground hover:text-neon-green transition-colors">
              USERS
            </Link>
            <Link href="/" className="text-muted-foreground hover:text-neon-pink transition-colors">
              ← BACK TO SITE
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
