"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Check, Zap, Building2, Rocket, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";

const StaggerContainer = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const StaggerItem = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 30, scale: 0.95 },
      visible: { opacity: 1, y: 0, scale: 1 },
    }}
    transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    className={className}
  >
    {children}
  </motion.div>
);

const FREE_FEATURES = [
  "1 startup analysis",
  "3 core personas",
  "Basic brand snapshot",
  "Competitor map (top 3)",
  "Solo persona chat",
];

const PRO_FEATURES = [
  "Unlimited analyses",
  "5 personas per run",
  "Individual persona chat",
  "Focus Group Mode (4–6 agents)",
  "Market-weighted PMF score",
  "Full Focus Group Report export",
  "Saved reports & history",
  "Priority processing",
];

const AGENCY_FEATURES = [
  "Everything in Pro",
  "Multi-client workspace",
  "White-label reports",
  "10 personas per run",
  "Adjacent segment expansion",
  "Deeper competitor scans (up to 10)",
  "Team access (up to 5 seats)",
];

function CheckoutButton({
  tier,
  currentTier,
  className,
  children,
}: {
  tier: "PRO" | "AGENCY";
  currentTier?: string;
  className: string;
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);

  if (currentTier === tier) {
    return (
      <div className="block w-full text-center font-mono font-bold px-4 py-2.5 rounded-sm text-xs tracking-wider border-2 border-neon-green text-neon-green opacity-60 cursor-default">
        [ CURRENT PLAN ]
      </div>
    );
  }

  const handleClick = async () => {
    if (status !== "authenticated") {
      signIn();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={loading} className={className}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
      {loading ? "REDIRECTING..." : children}
    </button>
  );
}

export default function PricingSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { data: session } = useSession();
  const currentTier = session?.user?.tier;

  return (
    <div id="pricing" className="scroll-mt-24">
      {/* Section header */}
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 40 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="text-center mb-10"
      >
        <div className="font-mono text-[10px] text-neon-pink tracking-[0.4em] mb-3 uppercase">PLANS</div>
        <h2 className="font-mono text-2xl md:text-3xl font-bold text-neon-green tracking-tight">
          &gt; PRICING.EXE
        </h2>
        <p className="mt-3 font-mono text-sm text-muted-foreground">
          Pick your plan. No BS, no hidden fees.
        </p>
      </motion.div>

      {/* Cards */}
      <StaggerContainer className="grid md:grid-cols-3 gap-5 items-stretch">
        {/* TIER 01 — FREE */}
        <StaggerItem className="h-full">
          <div className="terminal-card border-border hover:border-neon-green hover:glow-green flex flex-col h-full">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Rocket className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-mono text-[10px] text-muted-foreground tracking-[0.3em] uppercase">
                  TIER 01 — FREE
                </span>
              </div>
              <div className="font-mono text-xs text-neon-green tracking-widest mb-3">
                [ BOOTLOADER ]
              </div>
              <div className="flex items-end gap-1">
                <span className="font-mono text-3xl font-bold text-foreground">$0</span>
                <span className="font-mono text-xs text-muted-foreground mb-1">/ mo</span>
              </div>
            </div>

            <ul className="space-y-2 flex-1 mb-6">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-neon-green mt-0.5 shrink-0" />
                  <span className="font-mono text-xs text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>

            {currentTier === "FREE" ? (
              <div className="block w-full text-center font-mono font-bold px-4 py-2.5 rounded-sm text-xs tracking-wider border-2 border-neon-green text-neon-green opacity-60 cursor-default">
                [ CURRENT PLAN ]
              </div>
            ) : (
              <Link
                href="/analyze"
                className="block w-full text-center border-2 border-neon-green text-neon-green font-mono font-bold px-4 py-2.5 rounded-sm text-xs tracking-wider hover:bg-neon-green hover:text-primary-foreground transition-all active:scale-95"
              >
                [ LAUNCH FREE ]
              </Link>
            )}
          </div>
        </StaggerItem>

        {/* TIER 02 — PRO (highlighted) */}
        <StaggerItem className="h-full">
          <div className="relative pt-4 h-full flex flex-col">
            {/* MOST POPULAR badge — outside the overflow-hidden card */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap">
              <span className="font-mono text-[10px] text-neon-amber border border-neon-amber bg-background px-3 py-0.5 tracking-widest uppercase">
                &gt; MOST POPULAR
              </span>
            </div>

          <div className="terminal-card border-neon-green glow-green flex flex-col flex-1"
            style={{ boxShadow: "0 0 20px hsl(153 100% 50% / 0.35), 0 0 60px hsl(153 100% 50% / 0.12)" }}
          >
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-3.5 h-3.5 text-neon-green" />
                <span className="font-mono text-[10px] text-neon-green tracking-[0.3em] uppercase">
                  TIER 02 — PRO
                </span>
              </div>
              <div className="font-mono text-xs text-neon-green tracking-widest mb-3">
                [ SERIES A ]
              </div>
              <div className="flex items-end gap-1">
                <span className="font-mono text-3xl font-bold text-foreground">$29</span>
                <span className="font-mono text-xs text-muted-foreground mb-1">/ mo</span>
              </div>
            </div>

            <ul className="space-y-2 flex-1 mb-6">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-neon-green mt-0.5 shrink-0" />
                  <span className="font-mono text-xs text-foreground">{f}</span>
                </li>
              ))}
            </ul>

            <CheckoutButton
              tier="PRO"
              currentTier={currentTier}
              className="block w-full text-center bg-neon-green text-primary-foreground font-mono font-bold px-4 py-2.5 rounded-sm text-xs tracking-wider hover:glow-green transition-all active:scale-95 disabled:opacity-50"
            >
              [ RUN FITCHECK PRO ]
            </CheckoutButton>
          </div>
          </div>
        </StaggerItem>

        {/* TIER 03 — AGENCY */}
        <StaggerItem className="h-full">
          <div className="terminal-card border-border hover:border-neon-pink hover:glow-pink flex flex-col h-full">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-mono text-[10px] text-muted-foreground tracking-[0.3em] uppercase">
                  TIER 03 — AGENCY
                </span>
              </div>
              <div className="font-mono text-xs text-neon-pink tracking-widest mb-3">
                [ SERIES B ]
              </div>
              <div className="flex items-end gap-1">
                <span className="font-mono text-3xl font-bold text-foreground">$67</span>
                <span className="font-mono text-xs text-muted-foreground mb-1">/ mo</span>
              </div>
            </div>

            <ul className="space-y-2 flex-1 mb-6">
              {AGENCY_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-neon-pink mt-0.5 shrink-0" />
                  <span className="font-mono text-xs text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>

            <CheckoutButton
              tier="AGENCY"
              currentTier={currentTier}
              className="block w-full text-center border-2 border-neon-pink text-neon-pink font-mono font-bold px-4 py-2.5 rounded-sm text-xs tracking-wider hover:bg-neon-pink hover:text-primary-foreground transition-all active:scale-95 disabled:opacity-50"
            >
              [ GO AGENCY ]
            </CheckoutButton>
          </div>
        </StaggerItem>
      </StaggerContainer>

      {/* Disclaimer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="mt-8 text-center font-mono text-[10px] text-neon-amber tracking-wider"
      >
        ⚠ Market weight estimates are directional. Not a substitute for primary research.
      </motion.p>
    </div>
  );
}
