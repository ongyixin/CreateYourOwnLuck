// ============================================================
// FitCheck — AI Provider + Section Generators
// Owned by: AI agent
// Exports: AnalysisContext, generateBrandPerception, generateIcpAssessment,
//          generateActionables, generateLeadSuggestions, generateIcpStudio,
//          generateAllSections
// ============================================================

import { generateText, Output } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { ZodSchema } from 'zod';

import type {
  AnalysisRequest,
  ScrapedData,
  BrandPerception,
  IcpAssessment,
  Actionables,
  LeadSuggestions,
  IcpStudio,
} from '../types';
import {
  BrandPerceptionSchema,
  IcpAssessmentSchema,
  ActionablesSchema,
  LeadSuggestionsSchema,
  IcpStudioSchema,
  buildBrandPerceptionPrompt,
  buildIcpAssessmentPrompt,
  buildActionablesPrompt,
  buildLeadSuggestionsPrompt,
  buildIcpStudioPrompt,
  formatContext,
  SYSTEM_PROMPT,
} from './prompts';

// ============================================================
// Input type for all section generators
// ============================================================

export interface AnalysisContext {
  request: AnalysisRequest;
  scrapedData: ScrapedData;
}

// ============================================================
// Model selection — reads AI_PROVIDER env var at call time
// ============================================================

function getModel() {
  const provider = (process.env.AI_PROVIDER ?? 'anthropic').toLowerCase();

  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
    return createOpenAI({ apiKey })('gpt-4o');
  }

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

  throw new Error(
    `Unknown AI_PROVIDER "${provider}". Valid values: "anthropic" | "openai" | "gemini"`,
  );
}

// ============================================================
// Internal: typed wrapper around generateObject
// ============================================================

async function runGenerate<T>(schema: ZodSchema<T>, prompt: string): Promise<T> {
  const result = await generateText({
    model: getModel() as any,
    output: Output.object({ schema }),
    system: SYSTEM_PROMPT,
    prompt,
    temperature: 0.4,
  });
  return result.output as T;
}

// ============================================================
// Exported section generators
// Each function builds the context string once, then calls the AI.
// The pipeline runner can call all five in parallel via generateAllSections().
// ============================================================

export async function generateBrandPerception(
  ctx: AnalysisContext,
): Promise<BrandPerception> {
  const context = formatContext(ctx.request, ctx.scrapedData);
  const prompt = buildBrandPerceptionPrompt(ctx.request, context);
  return runGenerate(BrandPerceptionSchema, prompt) as Promise<BrandPerception>;
}

export async function generateIcpAssessment(
  ctx: AnalysisContext,
): Promise<IcpAssessment> {
  const context = formatContext(ctx.request, ctx.scrapedData);
  const prompt = buildIcpAssessmentPrompt(ctx.request, context);
  return runGenerate(IcpAssessmentSchema, prompt) as Promise<IcpAssessment>;
}

export async function generateActionables(
  ctx: AnalysisContext,
): Promise<Actionables> {
  const context = formatContext(ctx.request, ctx.scrapedData);
  const prompt = buildActionablesPrompt(ctx.request, context);
  return runGenerate(ActionablesSchema, prompt) as Promise<Actionables>;
}

export async function generateLeadSuggestions(
  ctx: AnalysisContext,
): Promise<LeadSuggestions> {
  const context = formatContext(ctx.request, ctx.scrapedData);
  const prompt = buildLeadSuggestionsPrompt(ctx.request, context);
  return runGenerate(LeadSuggestionsSchema, prompt) as Promise<LeadSuggestions>;
}

export async function generateIcpStudio(ctx: AnalysisContext): Promise<IcpStudio> {
  const context = formatContext(ctx.request, ctx.scrapedData);
  const prompt = buildIcpStudioPrompt(ctx.request, context);
  return runGenerate(IcpStudioSchema, prompt) as Promise<IcpStudio>;
}

// ============================================================
// Parallel runner — use this from the pipeline runner
// Runs all 5 sections concurrently; individual failures are isolated.
// ============================================================

export interface AllSectionsResult {
  brandPerception: BrandPerception | null;
  icpAssessment: IcpAssessment | null;
  actionables: Actionables | null;
  leadSuggestions: LeadSuggestions | null;
  icpStudio: IcpStudio | null;
  /** Error messages for any section that failed */
  errors: string[];
}

export async function generateAllSections(
  ctx: AnalysisContext,
): Promise<AllSectionsResult> {
  const [brand, icp, actionables, leads, studio] = await Promise.allSettled([
    generateBrandPerception(ctx),
    generateIcpAssessment(ctx),
    generateActionables(ctx),
    generateLeadSuggestions(ctx),
    generateIcpStudio(ctx),
  ]);

  const errors: string[] = [];

  function unwrap<T>(
    result: PromiseSettledResult<T>,
    label: string,
  ): T | null {
    if (result.status === 'fulfilled') return result.value;
    const msg =
      result.reason instanceof Error
        ? result.reason.message
        : String(result.reason);
    errors.push(`${label}: ${msg}`);
    return null;
  }

  return {
    brandPerception: unwrap(brand, 'brandPerception'),
    icpAssessment: unwrap(icp, 'icpAssessment'),
    actionables: unwrap(actionables, 'actionables'),
    leadSuggestions: unwrap(leads, 'leadSuggestions'),
    icpStudio: unwrap(studio, 'icpStudio'),
    errors,
  };
}
