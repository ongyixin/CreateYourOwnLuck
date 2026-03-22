/**
 * Generates a structured Experiment Design Document from the intake form.
 */

import { generateText, Output } from 'ai';
import { z } from 'zod';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type {
  ExperimentDesignDocument,
  ExperimentDesignRequest,
  ExperimentOrchestrationStep,
} from '../types';

function getModel() {
  const provider = (process.env.AI_PROVIDER ?? 'gemini').toLowerCase();

  if (provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    return createAnthropic({ apiKey })('claude-sonnet-4-6');
  }

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    return createGoogleGenerativeAI({ apiKey })('gemini-2.5-pro');
  }

  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
    return createOpenAI({ apiKey })('gpt-4o');
  }

  throw new Error(`Unknown AI_PROVIDER "${provider}"`);
}

const StepSchema = z.object({
  type: z.enum(['stimulus', 'probe', 'recall_check', 'transition']),
  label: z.string(),
  variant: z.enum(['A', 'B', 'shared']).optional(),
  moderatorPrompt: z.string(),
  probeQuestion: z.string().optional(),
});

export const ExperimentDesignSchema = z.object({
  testableHypothesis: z.string(),
  methodology: z.string(),
  stimulusPresentationOrder: z.array(z.string()).min(1),
  probeQuestions: z.array(z.string()).min(1).max(8),
  positiveResult: z.string(),
  neutralResult: z.string(),
  negativeResult: z.string(),
  recallTargets: z.array(z.string()).max(12),
  steps: z.array(StepSchema).min(1).max(24),
});

const GOAL_LABELS: Record<string, string> = {
  new_release: 'New release',
  pricing_test: 'Pricing test',
  positioning_test: 'Positioning test',
  lead_intent: 'Lead intent',
  messaging_test: 'Messaging test',
  competitive_displacement: 'Competitive displacement',
};

const TYPE_LABELS: Record<string, string> = {
  ab_test: 'A/B test',
  concept_test: 'Concept test',
  price_sensitivity: 'Price sensitivity',
  message_recall: 'Message recall',
  competitive_displacement: 'Competitive displacement',
};

const METRIC_LABELS: Record<string, string> = {
  conversion_likelihood: 'Conversion likelihood',
  objection_reduction: 'Objection reduction',
  recall_score: 'Recall score',
  willingness_to_pay: 'Willingness to pay',
  displacement_rate: 'Displacement rate',
};

function buildFallbackSteps(
  input: ExperimentDesignRequest,
  probes: string[],
): ExperimentOrchestrationStep[] {
  const steps: ExperimentOrchestrationStep[] = [];
  if (input.hasAbVariants && input.experimentType === 'ab_test') {
    steps.push({
      type: 'transition',
      label: 'Arms A & B (parallel)',
      variant: 'shared',
      moderatorPrompt:
        'Two stimulus variants will be shown in parallel to split persona groups. Stay on-topic for your arm only.',
    });
    steps.push({
      type: 'stimulus',
      label: 'Variant A — first exposure',
      variant: 'A',
      moderatorPrompt:
        'React only to the stimulus labeled Variant A. Do not compare to other variants you have not seen yet.',
    });
    steps.push({
      type: 'stimulus',
      label: 'Variant B — first exposure',
      variant: 'B',
      moderatorPrompt:
        'React only to the stimulus labeled Variant B. Do not compare to other variants you have not seen yet.',
    });
  } else {
    steps.push({
      type: 'stimulus',
      label: 'Primary stimulus',
      variant: 'shared',
      moderatorPrompt:
        'Give your honest first reaction to the shared stimulus. Stay within what is shown.',
    });
  }

  for (let i = 0; i < probes.length; i++) {
    const q = probes[i];
    steps.push({
      type: input.experimentType === 'message_recall' && i === probes.length - 1 ? 'recall_check' : 'probe',
      label: `Probe ${i + 1}`,
      variant: 'shared',
      moderatorPrompt:
        'Answer the moderator question directly. Do not drift to unrelated topics. One clear answer.',
      probeQuestion: q,
    });
  }

  return steps;
}

export async function generateExperimentDesignDocument(
  input: ExperimentDesignRequest,
): Promise<ExperimentDesignDocument> {
  const goal = GOAL_LABELS[input.goal] ?? input.goal;
  const expType = TYPE_LABELS[input.experimentType] ?? input.experimentType;
  const metric = METRIC_LABELS[input.successMetric] ?? input.successMetric;

  const prompt = `You are a senior research methodologist designing a synthetic panel study (AI personas).

## Intake
- Goal: ${goal}
- Experiment type: ${expType}
- Primary success metric: ${metric}
- Stimulus / materials summary (may be truncated): ${input.stimulusSummary.slice(0, 12000)}
${input.hypothesis?.trim() ? `- Founder hypothesis (optional): ${input.hypothesis.trim()}` : ''}
${input.adjacentProfileNote?.trim() ? `- Adjacent profile to keep in mind (personas should acknowledge this lens where relevant): ${input.adjacentProfileNote.trim()}` : ''}
- A/B two stimulus variants: ${input.hasAbVariants && input.experimentType === 'ab_test' ? 'YES — split the persona pool; include separate stimulus steps for arm A and arm B, then shared probes.' : 'NO — single stimulus path.'}

## Output requirements
1. Restate the hypothesis in falsifiable, testable form (testableHypothesis).
2. methodology: concise paragraph on how the synthetic session estimates ${metric}.
3. stimulusPresentationOrder: ordered human-readable bullets for the moderator script.
4. probeQuestions: 3–6 concrete moderator questions aligned with the metric and experiment type.
5. recallTargets: short phrases to scan for in open responses for recall-style metrics (if not recall-heavy, still list 2–4 key message elements from the stimulus).
6. positiveResult / neutralResult / negativeResult: what outcomes mean for ${metric}.
7. steps: executable orchestration. Each step MUST include a detailed moderatorPrompt telling personas exactly what to do this turn.
   - For A/B: use type "stimulus" with variant "A" then variant "B" (or both in either order). Use variant "shared" for probes that apply to everyone.
   - Include at least one "transition" step if helpful.
   - recall_check steps should ask what they remember verbatim or which claims stuck (for message recall).
   - Do NOT repeat the full stimulus text in moderatorPrompt if it will be supplied separately — refer to "the stimulus shown this round."

Return only valid JSON matching the schema.`;

  try {
    const result = await generateText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: getModel() as any,
      output: Output.object({ schema: ExperimentDesignSchema }),
      prompt,
      system:
        'You produce rigorous, practical experiment designs. Be specific; avoid generic research platitudes.',
    });

    const raw = result.output as z.infer<typeof ExperimentDesignSchema>;

    let steps = raw.steps as ExperimentOrchestrationStep[];
    if (input.hasAbVariants && input.experimentType === 'ab_test') {
      const hasA = steps.some((s) => s.variant === 'A');
      const hasB = steps.some((s) => s.variant === 'B');
      if (!hasA || !hasB) {
        steps = buildFallbackSteps(input, raw.probeQuestions);
      }
    } else if (steps.length < 2) {
      steps = buildFallbackSteps(input, raw.probeQuestions);
    }

    return {
      testableHypothesis: raw.testableHypothesis,
      methodology: raw.methodology,
      stimulusPresentationOrder: raw.stimulusPresentationOrder,
      probeQuestions: raw.probeQuestions,
      positiveResult: raw.positiveResult,
      neutralResult: raw.neutralResult,
      negativeResult: raw.negativeResult,
      recallTargets: raw.recallTargets.length ? raw.recallTargets : ['value proposition', 'pricing', 'differentiator'],
      steps,
    };
  } catch {
    const probes = [
      'What is the single biggest reason you would or would not move forward after seeing this?',
      'What confused you or felt unsupported by the material?',
      'What would you tell a colleague in one sentence?',
    ];
    const steps = buildFallbackSteps(input, probes);
    return {
      testableHypothesis: input.hypothesis?.trim()
        ? `We can observe measurable differences in ${metric} consistent with: ${input.hypothesis.trim()}`
        : `We can estimate ${metric} for this stimulus under ${expType} conditions using the synthetic panel.`,
      methodology: `Sequential moderated rounds: stimulus exposure, then fixed probes, with personas constrained to the experiment script. Success metric: ${metric}.`,
      stimulusPresentationOrder: input.hasAbVariants && input.experimentType === 'ab_test'
        ? ['Variant A (parallel arm)', 'Variant B (parallel arm)', 'Shared probes']
        : ['Primary stimulus', 'Moderator probes'],
      probeQuestions: probes,
      positiveResult: `Signals align with ${metric} moving in the intended direction across weighted personas.`,
      neutralResult: 'Mixed or weak signal — no clear directional read.',
      negativeResult: `Signals contradict the intended direction for ${metric}.`,
      recallTargets: ['headline', 'price', 'call to action'],
      steps,
    };
  }
}
