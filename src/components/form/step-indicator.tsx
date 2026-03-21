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
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-8 transition-colors sm:w-12",
                  i <= currentStep ? "bg-neon-green" : "bg-border"
                )}
              />
            )}

            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-sm border-2 font-mono text-xs font-bold transition-all",
                  isComplete
                    ? "border-neon-green bg-neon-green text-primary-foreground"
                    : isCurrent
                      ? "border-neon-green bg-transparent text-neon-green"
                      : "border-border bg-transparent text-muted-foreground"
                )}
              >
                {isComplete ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <span>{String(i + 1).padStart(2, "0")}</span>
                )}
              </div>
              <span
                className={cn(
                  "mt-1.5 hidden text-[10px] font-mono tracking-wider sm:block",
                  isCurrent
                    ? "font-medium text-foreground"
                    : isComplete
                      ? "text-neon-green"
                      : "text-muted-foreground"
                )}
              >
                {step.label.toUpperCase()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
