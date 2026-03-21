import { Target } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export interface GoalData {
  goal: string;
}

interface GoalStepProps {
  data: GoalData;
  onChange: (data: GoalData) => void;
  companyName: string;
}

const GOAL_EXAMPLES = [
  "We want to move upmarket to enterprise",
  "We're launching in Europe",
  "We need to stand out from [competitor]",
  "We want to improve conversion on our landing page",
  "We're pivoting to a new audience segment",
];

export function GoalStep({ data, onChange, companyName }: GoalStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-xl font-semibold">Your goal</h2>
          <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
            Optional
          </span>
        </div>
        <p className="text-sm text-zinc-400">
          Tell FitCheck what you&apos;re trying to achieve. This focuses the
          recommendations on what matters most to you.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="goal" className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-zinc-400" />
          What are you trying to achieve?
        </Label>
        <Textarea
          id="goal"
          placeholder={`e.g. "We want to move upmarket and attract Series B+ companies instead of early-stage startups."`}
          value={data.goal}
          onChange={(e) => onChange({ goal: e.target.value })}
          className="min-h-[120px]"
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-zinc-500">Try something like:</p>
        <div className="space-y-1.5">
          {GOAL_EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onChange({ goal: ex })}
              className="block w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-left text-xs text-zinc-400 transition-colors hover:border-violet-500/40 hover:bg-violet-500/5 hover:text-zinc-200"
            >
              &ldquo;{ex}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {companyName && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <p className="text-xs text-zinc-500">
            <span className="font-medium text-zinc-400">{companyName}</span>{" "}
            is ready to analyze.{" "}
            {data.goal
              ? "FitCheck will focus the analysis on your stated goal."
              : "You can skip this and get a general brand and ICP analysis."}
          </p>
        </div>
      )}
    </div>
  );
}
