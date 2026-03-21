import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  label: string;
  description: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const isComplete = i < currentStep;
        const isCurrent = i === currentStep;

        return (
          <div key={i} className="flex items-center">
            {/* Connector line before (skip for first) */}
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-8 transition-colors sm:w-12",
                  i <= currentStep ? "bg-violet-500" : "bg-zinc-800"
                )}
              />
            )}

            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                  isComplete
                    ? "border-violet-500 bg-violet-500 text-white"
                    : isCurrent
                      ? "border-violet-500 bg-transparent text-violet-400"
                      : "border-zinc-700 bg-transparent text-zinc-600"
                )}
              >
                {isComplete ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "mt-1.5 hidden text-xs sm:block",
                  isCurrent
                    ? "font-medium text-zinc-200"
                    : isComplete
                      ? "text-zinc-400"
                      : "text-zinc-600"
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
