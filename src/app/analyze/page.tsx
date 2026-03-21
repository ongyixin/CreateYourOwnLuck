"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/form/step-indicator";
import { CompanyInfoStep } from "@/components/form/company-info-step";
import { MaterialsStep } from "@/components/form/materials-step";
import { CompetitorsStep } from "@/components/form/competitors-step";
import { GoalStep } from "@/components/form/goal-step";
import { SourcesStep } from "@/components/form/sources-step";
import type { AnalysisRequest, AnalyzeResponse, ScraperSource } from "@/lib/types";
import { ALL_SCRAPER_SOURCES } from "@/lib/types";

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  companyName: string;
  websiteUrl: string;
  extraMaterials: string;
  competitorUrls: string[];
  goal: string;
  selectedSources: ScraperSource[];
}

const INITIAL_FORM: FormState = {
  companyName: "",
  websiteUrl: "",
  extraMaterials: "",
  competitorUrls: [""],
  goal: "",
  selectedSources: ALL_SCRAPER_SOURCES,
};

// ─── Steps config ─────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Company", description: "Your company details" },
  { label: "Materials", description: "Additional context" },
  { label: "Competitors", description: "Competitor URLs" },
  { label: "Sources", description: "Data sources to scrape" },
  { label: "Goal", description: "What to focus on" },
];

// ─── Validation ───────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnalyzePage() {
  const router = useRouter();
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

    // Build the request — filter out empty competitor URLs
    const request: AnalysisRequest = {
      companyName: form.companyName.trim(),
      websiteUrl: form.websiteUrl.trim(),
      extraMaterials: form.extraMaterials.trim() || undefined,
      competitorUrls: form.competitorUrls
        .map((u) => u.trim())
        .filter(Boolean),
      goal: form.goal.trim() || undefined,
      selectedSources: form.selectedSources,
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
      // Persist company name so the processing page can display it
      sessionStorage.setItem(`fitcheck-company-${data.jobId}`, request.companyName);
      router.push(`/processing/${data.jobId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  // Per-step error shapes expected by child components
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
    <div className="min-h-screen bg-[#09090b]">
      {/* Nav */}
      <nav className="border-b border-zinc-800/50 px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-semibold text-zinc-200">FitCheck</span>
          </div>
        </div>
      </nav>

      <main className="px-6 py-10">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-bold text-zinc-100">
              Set up your analysis
            </h1>
            <p className="text-sm text-zinc-400">
              Tell us about your company — we&apos;ll handle the rest.
            </p>
          </div>

          {/* Step indicator */}
          <div className="mb-8 flex justify-center">
            <StepIndicator steps={STEPS} currentStep={step} />
          </div>

          {/* Step card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-sm">
            {/* Current step label */}
            <div className="mb-6 flex items-center gap-2 text-xs text-zinc-500">
              <span className="font-mono text-violet-400">
                {String(step + 1).padStart(2, "0")}
              </span>
              <span>/</span>
              <span className="font-mono text-zinc-600">
                {String(STEPS.length).padStart(2, "0")}
              </span>
              <span className="ml-1 text-zinc-400">
                {STEPS[step].description}
              </span>
            </div>

            {/* Step content */}
            {step === 0 && (
              <CompanyInfoStep
                data={{
                  companyName: form.companyName,
                  websiteUrl: form.websiteUrl,
                }}
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
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-xs text-red-400">{submitError}</p>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={step === 0 || submitting}
                className="gap-1.5 text-zinc-400"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>

              <div className="flex items-center gap-3">
                {/* Skip button (not on first or last step) */}
                {step > 0 && !isLastStep && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep((s) => s + 1)}
                    disabled={submitting}
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Skip
                  </Button>
                )}

                {isLastStep ? (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="gap-2 px-6"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Starting analysis...
                      </>
                    ) : (
                      <>
                        Run FitCheck
                        <Zap className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="gap-1.5"
                  >
                    Next
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Progress summary (bottom) */}
          <div className="mt-6 text-center text-xs text-zinc-600">
            Step {step + 1} of {STEPS.length}
            {step === 0 && " — required"}
            {step > 0 && " — optional"}
          </div>
        </div>
      </main>
    </div>
  );
}
