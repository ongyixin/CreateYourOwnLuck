import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Globe,
  Users,
  Target,
  TrendingUp,
  UserCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Brand Perception",
    description:
      "Understand how your brand actually comes across — tone, strengths, and confusing signals.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
  {
    icon: Users,
    title: "ICP Assessment",
    description:
      "Discover who your product resonates with and which segments are most aligned with your brand.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    icon: Target,
    title: "Brand Actionables",
    description:
      "Concrete recommendations: what to improve, what to change, what to lean into.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    icon: TrendingUp,
    title: "Lead Suggestions",
    description:
      "Find communities, channels, and company types where your best customers already hang out.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    icon: UserCircle,
    title: "ICP Studio",
    description:
      "Test your messaging against AI-generated personas with simulated 5-second homepage reactions.",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Submit your company",
    description: "Enter your website URL. Add competitors and a goal for richer analysis.",
  },
  {
    step: "02",
    title: "AI analyzes the web",
    description:
      "FitCheck crawls your site, competitors, and searches for public mentions and reviews.",
  },
  {
    step: "03",
    title: "Get your report",
    description:
      "A visual, interactive report with brand perception, ICP profiles, and actionable next steps.",
  },
];

export default function Hero() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-800/50 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-violet-400" />
            <span className="text-lg font-bold tracking-tight">FitCheck</span>
          </div>
          <Button asChild size="sm">
            <Link href="/analyze">
              Analyze Your Brand <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-grid px-6 py-24 text-center">
        {/* Radial glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl">
          <Badge className="mb-6 gap-1.5 border-violet-500/30 bg-violet-500/10 text-violet-300">
            <Sparkles className="h-3 w-3" />
            AI-Powered Brand Intelligence
          </Badge>

          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
            Know your brand.{" "}
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              Know your customer.
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-zinc-400 md:text-xl">
            FitCheck analyzes your company&apos;s web presence with live data to
            surface brand perception insights, ideal customer profiles, and
            concrete positioning recommendations — all in minutes.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="gap-2 px-8">
              <Link href="/analyze">
                Analyze Your Brand
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>

          {/* Fake pipeline preview */}
          <div className="mx-auto mt-16 max-w-lg rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-left backdrop-blur-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono text-zinc-400">
                Live analysis in progress...
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
                    <span className="text-emerald-400">✓</span>
                  ) : item.active ? (
                    <span className="text-violet-400 animate-pulse">▶</span>
                  ) : (
                    <span className="text-zinc-600">○</span>
                  )}
                </span>
                <span
                  className={`text-xs font-mono ${
                    item.done
                      ? "text-zinc-500 line-through"
                      : item.active
                        ? "text-violet-300"
                        : "text-zinc-600"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold">
              Everything in one report
            </h2>
            <p className="text-zinc-400">
              Five focused sections, grounded in real evidence from your site
              and the web.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className={`rounded-xl border ${f.border} ${f.bg} p-5 transition-transform hover:-translate-y-0.5`}
              >
                <div className={`mb-3 inline-flex rounded-lg p-2 ${f.bg}`}>
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <h3 className="mb-1.5 font-semibold">{f.title}</h3>
                <p className="text-sm text-zinc-400">{f.description}</p>
              </div>
            ))}

            {/* CTA card */}
            <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-600/20 to-blue-600/10 p-5 sm:col-span-2 lg:col-span-1">
              <p className="mb-3 text-sm text-zinc-300">
                Ready to see what the web thinks about your brand?
              </p>
              <Button asChild size="sm" className="gap-1.5">
                <Link href="/analyze">
                  Start free analysis <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-zinc-800/50 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold">How it works</h2>
            <p className="text-zinc-400">
              From company URL to actionable report in under two minutes.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 font-mono text-sm font-bold text-violet-400">
                  {s.step}
                </div>
                <h3 className="mb-2 font-semibold">{s.title}</h3>
                <p className="text-sm text-zinc-400">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data sources */}
      <section className="border-t border-zinc-800/50 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <p className="mb-6 text-center text-xs font-medium uppercase tracking-widest text-zinc-500">
            Powered by live data from
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500">
            {["Company website", "Competitor sites", "Reddit", "Hacker News", "G2", "Trustpilot", "Google Search"].map(
              (s) => (
                <span key={s} className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  {s}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-zinc-800/50 px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-3xl font-bold">
            Stop guessing. Start knowing.
          </h2>
          <p className="mb-8 text-zinc-400">
            FitCheck gives you the brand clarity and customer intelligence you
            need to sharpen your positioning.
          </p>
          <Button asChild size="lg" className="gap-2 px-10">
            <Link href="/analyze">
              Analyze Your Brand Now <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 px-6 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-zinc-500">
            <Zap className="h-3.5 w-3.5 text-violet-500" />
            <span className="font-semibold text-zinc-400">FitCheck</span>
          </div>
          <p className="text-xs text-zinc-600">
            AI-powered brand intelligence
          </p>
        </div>
      </footer>
    </div>
  );
}
