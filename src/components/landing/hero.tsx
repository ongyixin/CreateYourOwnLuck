"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  Search, Users, Sparkles, Globe, ArrowRight,
  ChevronDown, Eye, BarChart3, Lightbulb, Target,
  LogOut, Shield, FileText,
} from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";
import AnimatedLogo from "@/components/animated-logo";
import ScanlineOverlay from "@/components/scanline-overlay";
import CursorBloom from "@/components/cursor-bloom";
import { ThemeToggle } from "@/components/theme-toggle";
import PricingSection from "@/components/landing/pricing";

const Section = ({ children, className = "", direction = "up" }: {
  children: React.ReactNode; className?: string; direction?: "up" | "left" | "right" | "scale";
}) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const initial = {
    up: { opacity: 0, y: 50 },
    left: { opacity: 0, x: -60 },
    right: { opacity: 0, x: 60 },
    scale: { opacity: 0, scale: 0.9 },
  }[direction];

  const visible = { opacity: 1, y: 0, x: 0, scale: 1 };

  return (
    <motion.section
      ref={ref}
      initial={initial}
      animate={inView ? visible : initial}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.section>
  );
};

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

const FEATURES = [
  { icon: Eye, title: "BRAND AUDIT", desc: "Detect tone, strengths, and confusing signals from your web presence.", color: "text-neon-green", border: "border-neon-green", glow: "hover:glow-green" },
  { icon: BarChart3, title: "COMPETITOR MAP", desc: "See how you stack up against competitors with gap analysis.", color: "text-neon-pink", border: "border-neon-pink", glow: "hover:glow-pink" },
  { icon: Users, title: "AI PERSONAS", desc: "AI-generated customer profiles you can actually talk to.", color: "text-neon-cyan", border: "border-neon-cyan", glow: "hover:glow-cyan" },
  { icon: Target, title: "ICP CLARITY", desc: "Data-driven ideal customer profiles ranked by fit score.", color: "text-neon-amber", border: "border-neon-amber", glow: "hover:glow-amber" },
  { icon: Lightbulb, title: "RECOMMENDATIONS", desc: "Before/after copy suggestions and messaging angles.", color: "text-neon-purple", border: "border-neon-purple", glow: "hover:glow-purple" },
];

const STEPS = [
  { step: "01", title: "Submit your URL", desc: "Enter your website and optional competitors." },
  { step: "02", title: "AI scans the web", desc: "FitCheck crawls sites, reviews, mentions, and discussions." },
  { step: "03", title: "Get your report", desc: "Interactive report with brand analysis, ICPs, and actions." },
];

const TIER_BADGE: Record<string, { label: string; color: string }> = {
  PRO: { label: "PRO", color: "text-neon-green border-neon-green" },
  AGENCY: { label: "AGENCY", color: "text-neon-pink border-neon-pink" },
};

function NavBar() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const tierInfo = TIER_BADGE[session?.user?.tier ?? ""];

  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between px-6 py-3 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <AnimatedLogo size={22} />
        <span className="font-mono text-neon-green font-bold text-lg tracking-wider">
          FITCHECK<span className="blink">_</span>
        </span>
      </div>
      <div className="flex items-center gap-3 min-w-0">
        <div className="hidden sm:flex items-center gap-4 font-mono text-[10px] tracking-widest text-muted-foreground">
          <span className="text-neon-pink">●</span> LIVE
          <span>|</span>
          <a href="#pricing" className="hover:text-neon-amber transition-colors">PRICING</a>
          <span>|</span>
          <span>v1.0.0</span>
        </div>
        <ThemeToggle />

        {status === "authenticated" && session?.user ? (
          <div className="flex items-center gap-2 shrink-0">
            {tierInfo && (
              <span className={`font-mono text-[9px] tracking-widest border px-1.5 py-0.5 shrink-0 ${tierInfo.color}`}>
                {tierInfo.label}
              </span>
            )}
            <Link
              href="/reports"
              className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-neon-green transition-colors tracking-wider shrink-0 whitespace-nowrap"
            >
              <FileText className="w-3 h-3 shrink-0" />
              REPORTS
            </Link>
            {isAdmin && (
              <Link href="/admin" className="flex items-center gap-1 font-mono text-[10px] text-neon-amber hover:text-neon-green transition-colors tracking-wider shrink-0">
                <Shield className="w-3 h-3" />
                ADMIN
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-1 border-2 border-border text-muted-foreground font-mono font-bold px-3 py-2 rounded-sm text-xs tracking-wider hover:border-neon-pink hover:text-neon-pink transition-all shrink-0"
            >
              <LogOut className="w-3 h-3" />
              SIGN OUT
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => signIn()}
              className="border-2 border-border text-muted-foreground font-mono font-bold px-3 py-2 rounded-sm text-xs tracking-wider hover:border-neon-green hover:text-neon-green transition-all"
            >
              SIGN IN
            </button>
            <Link
              href="/analyze"
              className="bg-neon-green text-primary-foreground font-mono font-bold px-4 py-2 rounded-sm text-xs tracking-wider hover:glow-green transition-all active:scale-95"
            >
              [ RUN FITCHECK ]
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

export default function Hero() {
  return (
    <div className="min-h-screen relative">
      <ScanlineOverlay />
      <CursorBloom />

      {/* Sticky Nav */}
      <NavBar />

      {/* Hero */}
      <header className="relative z-20 flex flex-col items-center justify-center px-6 pt-20 pb-16 md:pt-28 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div className="font-mono text-[10px] text-neon-pink tracking-[0.4em] mb-4 uppercase">
            AI-Powered Brand Intelligence
          </div>
          <h1 className="font-mono text-3xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight gradient-text">
            DOES YOUR STARTUP
            <br />
            PASS THE FIT CHECK?
          </h1>
          <p className="mt-6 text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Paste your URL. We crawl the web, map your competitors, and generate
            AI-powered brand perception and ICP insights in minutes.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-10 flex flex-col sm:flex-row gap-3 max-w-xl w-full"
        >
          <Link
            href="/analyze"
            className="flex-1 bg-neon-green text-primary-foreground font-mono font-bold px-6 py-3.5 rounded-sm text-sm tracking-wider hover:glow-green transition-all active:scale-95 text-center"
          >
            [ RUN FITCHECK ]
          </Link>
          <a
            href="#features"
            className="flex items-center justify-center gap-2 border-2 border-border text-foreground font-mono font-bold px-6 py-3.5 rounded-sm text-sm tracking-wider hover:border-neon-cyan hover:text-neon-cyan transition-all text-center"
          >
            HOW IT WORKS
          </a>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          {[
            { icon: Search, label: "BRAND AUDIT", color: "text-neon-green", tooltip: "Detects your brand tone, messaging strengths, and confusing signals from your web presence." },
            { icon: Globe, label: "COMPETITOR MAP", color: "text-neon-pink", tooltip: "Shows how your positioning stacks up against competitors with side-by-side gap analysis." },
            { icon: Users, label: "AI PERSONAS", color: "text-neon-cyan", tooltip: "AI-generated customer profiles built from real web data — segments you can actually target." },
            { icon: Sparkles, label: "RECOMMENDATIONS", color: "text-neon-amber", tooltip: "Actionable before/after copy suggestions and messaging angles to sharpen your positioning." },
          ].map((f) => (
            <div key={f.label} className="relative group">
              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground border border-border rounded-sm px-3 py-1.5 cursor-default">
                <f.icon className={`w-3.5 h-3.5 ${f.color}`} />
                {f.label}
              </div>
              <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 rounded-sm border border-border bg-background/95 backdrop-blur-sm px-3 py-2 text-xs font-mono text-muted-foreground leading-relaxed shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-border" />
                {f.tooltip}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="mt-12 text-muted-foreground"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </header>

      <div className="section-divider" />

      {/* Pipeline Preview */}
      <div className="relative z-20 max-w-6xl mx-auto px-6">
        <Section direction="scale">
          <div className="max-w-lg mx-auto">
            <div className="terminal-card border-border hover:glow-green">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-neon-green animate-pulse" />
                <span className="font-mono text-[10px] text-muted-foreground tracking-widest">
                  LIVE ANALYSIS IN PROGRESS...
                </span>
              </div>
              {[
                { label: "Crawling company website...", done: true },
                { label: "Scraping competitor sites...", done: true },
                { label: "Searching public mentions...", done: true },
                { label: "Running AI brand analysis...", active: true },
                { label: "Generating ICP profiles...", pending: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5">
                  <span className="font-mono text-xs">
                    {item.done ? (
                      <span className="text-neon-green">✓</span>
                    ) : item.active ? (
                      <span className="text-neon-cyan animate-pulse">▶</span>
                    ) : (
                      <span className="text-muted-foreground">○</span>
                    )}
                  </span>
                  <span className={`text-xs font-mono ${
                    item.done
                      ? "text-muted-foreground line-through"
                      : item.active
                        ? "text-neon-cyan"
                        : "text-muted-foreground/50"
                  }`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <div className="section-divider" />

        {/* Features */}
        <Section direction="up" className="scroll-mt-24" >
          <div id="features" className="scroll-mt-24">
            <div className="text-center mb-8">
              <div className="font-mono text-[10px] text-neon-pink tracking-[0.4em] mb-2 uppercase">CAPABILITIES</div>
              <h2 className="font-mono text-2xl font-bold gradient-text">EVERYTHING IN ONE REPORT</h2>
              <p className="mt-3 text-muted-foreground text-sm max-w-lg mx-auto">
                Five focused sections, grounded in real evidence from your site and the web.
              </p>
            </div>

            <StaggerContainer className="grid md:grid-cols-3 gap-4">
              {FEATURES.map((f) => (
                <StaggerItem key={f.title}>
                  <div className={`terminal-card ${f.border} ${f.glow}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <f.icon className={`w-4 h-4 ${f.color}`} />
                      <span className={`font-mono text-xs font-bold tracking-wider ${f.color}`}>{f.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </StaggerItem>
              ))}

              <StaggerItem>
                <div className="terminal-card border-neon-green glow-green flex flex-col items-center justify-center text-center">
                  <p className="text-sm text-foreground mb-3">
                    Ready to see what the web thinks of your brand?
                  </p>
                  <Link
                    href="/analyze"
                    className="bg-neon-green text-primary-foreground font-mono font-bold px-5 py-2 rounded-sm text-xs tracking-wider hover:glow-green transition-all active:scale-95 flex items-center gap-2"
                  >
                    START ANALYSIS <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </Section>

        <div className="section-divider" />

        {/* How it works */}
        <Section direction="right">
          <div className="text-center mb-8">
            <div className="font-mono text-[10px] text-neon-cyan tracking-[0.4em] mb-2 uppercase">PROCESS</div>
            <h2 className="font-mono text-2xl font-bold gradient-text">HOW IT WORKS</h2>
            <p className="mt-3 text-muted-foreground text-sm">
              From company URL to actionable report in under two minutes.
            </p>
          </div>

          <StaggerContainer className="grid md:grid-cols-3 gap-4">
            {STEPS.map((s) => (
              <StaggerItem key={s.step} className="h-full">
                <div className="terminal-card border-border text-center hover:glow-cyan h-full">
                  <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-sm border-2 border-neon-cyan font-mono text-sm font-bold text-neon-cyan">
                    {s.step}
                  </div>
                  <h3 className="font-mono text-foreground font-bold text-sm mb-2 tracking-wider">{s.title.toUpperCase()}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </Section>

        <div className="section-divider" />

        {/* Data sources */}
        <Section direction="up">
          <div className="text-center mb-6">
            <div className="font-mono text-[10px] text-muted-foreground tracking-[0.4em] mb-2 uppercase">POWERED BY</div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {["Company website", "Competitor sites", "Reddit", "Hacker News", "G2", "Trustpilot", "Google Search", "Twitter/X"].map(
              (s) => (
                <span key={s} className="flex items-center gap-2 font-mono text-xs text-muted-foreground border border-border rounded-sm px-3 py-1.5">
                  <Globe className="h-3 w-3 text-neon-green" />
                  {s}
                </span>
              )
            )}
          </div>
        </Section>

        <div className="section-divider" />

        {/* Pricing */}
        <Section direction="up">
          <PricingSection />
        </Section>

        <div className="section-divider" />

        {/* Final CTA */}
        <Section direction="scale">
          <div className="terminal-card border-neon-green glow-green text-center py-12">
            <h2 className="font-mono text-2xl md:text-3xl font-bold gradient-text mb-4">
              STOP GUESSING. START KNOWING.
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto mb-8">
              FitCheck gives you the brand clarity and customer intelligence you need to sharpen your positioning.
            </p>
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 bg-neon-green text-primary-foreground font-mono font-bold px-8 py-3.5 rounded-sm text-sm tracking-wider hover:glow-green transition-all active:scale-95"
            >
              [ RUN FITCHECK NOW ] <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Section>

        {/* Footer */}
        <footer className="py-16 text-center space-y-3 flex flex-col items-center">
          <AnimatedLogo size={36} />
          <div className="font-mono text-neon-green font-bold text-lg tracking-wider">
            FITCHECK<span className="blink">_</span>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground tracking-widest">
            [ AI-POWERED BRAND INTELLIGENCE ] — BUILT FOR FOUNDERS WHO SHIP
          </div>
        </footer>
      </div>
    </div>
  );
}
