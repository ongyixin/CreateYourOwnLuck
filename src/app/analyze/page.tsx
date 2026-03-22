"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2, Cpu, FileText } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/form/step-indicator";
import { CompanyInfoStep } from "@/components/form/company-info-step";
import { MaterialsStep } from "@/components/form/materials-step";
import { CompetitorsStep } from "@/components/form/competitors-step";
import { GoalStep } from "@/components/form/goal-step";
import { SourcesStep } from "@/components/form/sources-step";
import AnimatedLogo from "@/components/animated-logo";
import ScanlineOverlay from "@/components/scanline-overlay";
import type { AnalysisRequest, AnalyzeResponse, ScraperSource } from "@/lib/types";
import { ALL_SCRAPER_SOURCES } from "@/lib/types";

interface FormState {
  companyName: string;
  websiteUrl: string;
  extraMaterials: string;
  competitorUrls: string[];
  goal: string;
  selectedSources: ScraperSource[];
  autonomousSetup: boolean;
}

const INITIAL_FORM: FormState = {
  companyName: "",
  websiteUrl: "",
  extraMaterials: "",
  competitorUrls: [""],
  goal: "",
  selectedSources: ALL_SCRAPER_SOURCES,
  autonomousSetup: false,
};

const STEPS = [
  { label: "Company", description: "Your company details" },
  { label: "Materials", description: "Additional context" },
  { label: "Competitors", description: "Competitor URLs" },
  { label: "Sources", description: "Data sources to scrape" },
  { label: "Goal", description: "What to focus on" },
];

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function validateStep(step: number, form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};

  if (step === 0) {
    if (!form.companyName.trim()) {
      errors.companyName = "Company name is required.";
    }
    if (!form.websiteUrl.trim()) {
      errors.websiteUrl = "Website URL is required.";
    } else if (!isValidUrl(form.websiteUrl.trim())) {
      errors.websiteUrl = "Please enter a valid URL (e.g. https://example.com).";
    }
  }

  if (step === 2) {
    form.competitorUrls.forEach((url, i) => {
      if (url.trim() && !isValidUrl(url.trim())) {
        errors[`competitorUrls.${i}`] = "Invalid URL";
      }
    });
  }

  return errors;
}

export default function AnalyzePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isLastStep = step === STEPS.length - 1;

  function handleNext() {
    const errs = validateStep(step, form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function handleBack() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    const errs = validateStep(step, form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const request: AnalysisRequest = {
      companyName: form.companyName.trim(),
      websiteUrl: form.websiteUrl.trim(),
      extraMaterials: form.extraMaterials.trim() || undefined,
      competitorUrls: form.competitorUrls
        .map((u) => u.trim())
        .filter(Boolean),
      goal: form.goal.trim() || undefined,
      selectedSources: form.selectedSources,
      autonomousSetup: form.autonomousSetup || undefined,
    };

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }

      const data: AnalyzeResponse = await res.json();
      sessionStorage.setItem(`fitcheck-company-${data.jobId}`, request.companyName);
      router.push(`/processing/${data.jobId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const companyErrors = {
    companyName: errors.companyName,
    websiteUrl: errors.websiteUrl,
  };
  const competitorErrors = {
    competitorUrls: form.competitorUrls.map(
      (_, i) => errors[`competitorUrls.${i}`] ?? ""
    ),
  };

  return (
    <div className="min-h-screen relative">
      <ScanlineOverlay />

      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 py-3 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-neon-green"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="font-mono text-[10px] tracking-wider">BACK</span>
          </Link>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <AnimatedLogo size={18} />
            <span className="font-mono text-neon-green font-bold text-sm tracking-wider">
              FITCHECK<span className="blink">_</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {status === "authenticated" && (
            <Link
              href="/reports"
              className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground hover:text-neon-green transition-colors tracking-wider"
            >
              <FileText className="w-3 h-3" />
              REPORTS
            </Link>
          )}
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
            SETUP WIZARD
          </span>
        </div>
      </nav>

      <main className="relative z-20 px-6 py-10">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="font-mono text-[10px] text-neon-pink tracking-[0.4em] mb-2 uppercase">
              CONFIGURATION
            </div>
            <h1 className="font-mono text-2xl font-bold text-foreground tracking-wider">
              SET UP YOUR ANALYSIS
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tell us about your company — we&apos;ll handle the rest.
            </p>
          </div>

          {/* Step indicator */}
          <div className="mb-8 flex justify-center">
            <StepIndicator steps={STEPS} currentStep={step} />
          </div>

          {/* Step card */}
          <div className="terminal-card border-border">
            {/* Current step label */}
            <div className="mb-6 flex items-center gap-2 font-mono text-[10px] text-muted-foreground tracking-widest">
              <Cpu className="h-3 w-3 text-neon-cyan" />
              <span className="text-neon-green">
                {String(step + 1).padStart(2, "0")}
              </span>
              <span>/</span>
              <span>
                {String(STEPS.length).padStart(2, "0")}
              </span>
              <span className="ml-1 text-foreground">
                {STEPS[step].description.toUpperCase()}
              </span>
            </div>

            {/* Step content */}
            {step === 0 && (
              <CompanyInfoStep
                data={{ companyName: form.companyName, websiteUrl: form.websiteUrl, autonomousSetup: form.autonomousSetup }}
                errors={companyErrors}
                onChange={(d) => setForm((f) => ({ ...f, ...d }))}
              />
            )}
            {step === 1 && (
              <MaterialsStep
                data={{ extraMaterials: form.extraMaterials }}
                onChange={(d) => setForm((f) => ({ ...f, ...d }))}
              />
            )}
            {step === 2 && (
              <CompetitorsStep
                data={{ competitorUrls: form.competitorUrls }}
                errors={competitorErrors}
                onChange={(d) => setForm((f) => ({ ...f, ...d }))}
                companyName={form.companyName}
                websiteUrl={form.websiteUrl}
              />
            )}
            {step === 3 && (
              <SourcesStep
                data={{ selectedSources: form.selectedSources }}
                onChange={(d) => setForm((f) => ({ ...f, ...d }))}
              />
            )}
            {step === 4 && (
              <GoalStep
                data={{ goal: form.goal }}
                onChange={(d) => setForm((f) => ({ ...f, ...d }))}
                companyName={form.companyName}
              />
            )}

            {/* Submit error */}
            {submitError && (
              <div className="mt-4 rounded-sm border-2 border-neon-pink/30 bg-neon-pink/5 p-3">
                <p className="text-xs text-neon-pink font-mono">{submitError}</p>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 0 || submitting}
                className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                BACK
              </button>

              <div className="flex items-center gap-3">
                {step > 0 && !isLastStep && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => s + 1)}
                    disabled={submitting}
                    className="font-mono text-[10px] text-muted-foreground hover:text-neon-cyan transition-colors tracking-wider"
                  >
                    SKIP
                  </button>
                )}

                {isLastStep || (step === 0 && form.autonomousSetup) ? (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 bg-neon-green text-primary-foreground font-mono font-bold px-6 py-2.5 rounded-sm text-xs tracking-wider hover:glow-green transition-all active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        STARTING...
                      </>
                    ) : (
                      "[ RUN FITCHECK ]"
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-1.5 border-2 border-neon-green text-neon-green font-mono font-bold px-5 py-2 rounded-sm text-xs tracking-wider hover:bg-neon-green hover:text-primary-foreground transition-all"
                  >
                    NEXT <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Progress summary */}
          <div className="mt-6 text-center font-mono text-[10px] text-muted-foreground tracking-widest">
            STEP {step + 1} OF {STEPS.length}
            {step === 0 && " — REQUIRED"}
            {step > 0 && " — OPTIONAL"}
          </div>
        </div>
      </main>
    </div>
  );
}
