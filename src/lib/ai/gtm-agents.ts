// ============================================================
// FitCheck — GTM Brand Copilot Agents
// Owned by: GTM agent
//
// Five agents:
//   runStrategistAgent   — reads report, produces GtmStrategy
//   runMessagingAgent    — rewrites copy per MessagingWorkstream
//   runCreativeAgent     — drafts marketing assets per CreativeWorkstream
//   runOutreachAgent     — writes outreach templates per OutreachWorkstream
//   runGrowthAgent       — designs experiments per GrowthWorkstream
// ============================================================

import { generateObject, generateImage } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';

import type {
  FitCheckReport,
  GtmStrategy,
  MessagingWorkstream,
  CreativeWorkstream,
  OutreachWorkstream,
  GrowthWorkstream,
  MessagingAssetContent,
  CreativeAssetContent,
  OutreachAssetContent,
  GrowthAssetContent,
} from '../types';

import {
  GTM_SYSTEM_PROMPT,
  GtmStrategySchema,
  MessagingAssetSchema,
  CreativeAssetSchema,
  OutreachAssetSchema,
  GrowthAssetSchema,
  buildStrategistPrompt,
  buildMessagingAgentPrompt,
  buildCreativeAgentPrompt,
  buildOutreachAgentPrompt,
  buildGrowthAgentPrompt,
} from './gtm-prompts';

// ============================================================
// Model selection with key-presence fallback chain
//
// AI_PROVIDER sets the preferred provider. If that provider's key
// is missing, we walk a fallback chain rather than throwing.
//
// Strategist fallback order: anthropic → gemini → openai
//   (prefers the model best suited to long-horizon planning)
// Execution fallback order:  gemini → anthropic → openai
//   (prefers speed/cost for high-volume parallel asset generation)
// ============================================================

type ProviderName = 'anthropic' | 'gemini' | 'openai';

interface ProviderConfig {
  name: ProviderName;
  key: string | undefined;
}

const PROVIDERS: Record<ProviderName, ProviderConfig> = {
  anthropic: { name: 'anthropic', key: process.env.ANTHROPIC_API_KEY },
  gemini:    { name: 'gemini',    key: process.env.GEMINI_API_KEY },
  openai:    { name: 'openai',    key: process.env.OPENAI_API_KEY },
};

function buildModel(name: ProviderName, key: string, role: 'strategist' | 'execution') {
  if (name === 'openai')    return createOpenAI({ apiKey: key })('gpt-4o');
  if (name === 'gemini')    return role === 'execution'
    ? createGoogleGenerativeAI({ apiKey: key })('gemini-2.5-flash')
    : createGoogleGenerativeAI({ apiKey: key })('gemini-2.5-pro');
  // anthropic
  return createAnthropic({ apiKey: key })('claude-sonnet-4-6');
}

/**
 * Try each provider in `order` and return the first whose key is set.
 * Throws a clear error listing which keys are missing if none are available.
 */
function resolveModel(
  order: ProviderName[],
  role: 'strategist' | 'execution',
): ReturnType<typeof buildModel> {
  for (const name of order) {
    const { key } = PROVIDERS[name];
    if (key) return buildModel(name, key, role);
  }

  const missing = order.filter((n) => !PROVIDERS[n].key).map((n) => {
    const envVar = n === 'anthropic' ? 'ANTHROPIC_API_KEY' : n === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY';
    return envVar;
  });
  throw new Error(
    `[GTM ${role}] No AI provider available. ` +
    `Tried: ${order.join(' → ')}. ` +
    `Missing env vars: ${missing.join(', ')}.`,
  );
}

function getStrategistModel() {
  const preferred = (process.env.AI_PROVIDER ?? 'anthropic').toLowerCase() as ProviderName;
  // Build order: preferred first, then the natural fallback chain
  const fallback: ProviderName[] = ['anthropic', 'gemini', 'openai'];
  const order: ProviderName[] = [preferred, ...fallback.filter((p) => p !== preferred)];
  return resolveModel(order, 'strategist');
}

function getExecutionModel() {
  const preferred = (process.env.AI_PROVIDER ?? 'gemini').toLowerCase() as ProviderName;
  // Execution prefers gemini by default (faster/cheaper for asset gen)
  const fallback: ProviderName[] = ['gemini', 'anthropic', 'openai'];
  const order: ProviderName[] = [preferred, ...fallback.filter((p) => p !== preferred)];
  return resolveModel(order, 'execution');
}

// ============================================================
// Strategist Agent
// Reads the full FitCheckReport and produces a GtmStrategy.
// ============================================================

export async function runStrategistAgent(report: FitCheckReport): Promise<GtmStrategy> {
  const prompt = buildStrategistPrompt(report);
  const result = await generateObject({
    model: getStrategistModel() as Parameters<typeof generateObject>[0]['model'],
    schema: GtmStrategySchema,
    system: GTM_SYSTEM_PROMPT,
    prompt,
    temperature: 0.5,
  });
  return result.object as GtmStrategy;
}

// ============================================================
// Messaging Agent
// For a MessagingWorkstream, produces rewritten copy, positioning, tone guide.
// ============================================================

export async function runMessagingAgent(
  workstream: MessagingWorkstream,
  report: FitCheckReport,
): Promise<MessagingAssetContent> {
  const prompt = buildMessagingAgentPrompt(workstream, report);
  const result = await generateObject({
    model: getExecutionModel() as Parameters<typeof generateObject>[0]['model'],
    schema: MessagingAssetSchema,
    system: GTM_SYSTEM_PROMPT,
    prompt,
    temperature: 0.6,
  });
  return result.object as MessagingAssetContent;
}

// ============================================================
// Creative Agent
// For a CreativeWorkstream, produces full marketing asset copy +
// a Gemini Imagen visual preview (when GEMINI_API_KEY is set).
// ============================================================

export async function runCreativeAgent(
  workstream: CreativeWorkstream,
  report: FitCheckReport,
): Promise<CreativeAssetContent> {
  const prompt = buildCreativeAgentPrompt(workstream, report);
  const result = await generateObject({
    model: getExecutionModel() as Parameters<typeof generateObject>[0]['model'],
    schema: CreativeAssetSchema,
    system: GTM_SYSTEM_PROMPT,
    prompt,
    temperature: 0.7,
  });
  const content = result.object as CreativeAssetContent;

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const imageUrl = await generateCreativeVisual(workstream, content, geminiKey);
    if (imageUrl) content.imageUrl = imageUrl;
  }

  return content;
}

// ============================================================
// Outreach Agent
// For an OutreachWorkstream, produces stakeholder profiles + message templates.
// ============================================================

export async function runOutreachAgent(
  workstream: OutreachWorkstream,
  report: FitCheckReport,
): Promise<OutreachAssetContent> {
  const prompt = buildOutreachAgentPrompt(workstream, report);
  const result = await generateObject({
    model: getExecutionModel() as Parameters<typeof generateObject>[0]['model'],
    schema: OutreachAssetSchema,
    system: GTM_SYSTEM_PROMPT,
    prompt,
    temperature: 0.6,
  });
  return result.object as OutreachAssetContent;
}

// ============================================================
// Growth Agent
// For a GrowthWorkstream, produces experiment brief + copy variants.
// ============================================================

export async function runGrowthAgent(
  workstream: GrowthWorkstream,
  report: FitCheckReport,
): Promise<GrowthAssetContent> {
  const prompt = buildGrowthAgentPrompt(workstream, report);
  const result = await generateObject({
    model: getExecutionModel() as Parameters<typeof generateObject>[0]['model'],
    schema: GrowthAssetSchema,
    system: GTM_SYSTEM_PROMPT,
    prompt,
    temperature: 0.6,
  });
  return result.object as GrowthAssetContent;
}

// ============================================================
// Image generation (Creative agent helper)
// Uses Gemini Imagen 3 to produce a visual preview for each
// creative asset. Fails silently — text content is always saved.
// ============================================================

const ASSET_TYPE_LABELS: Record<string, string> = {
  landing_page: 'landing page hero banner',
  ad_copy: 'digital advertisement creative',
  social_post: 'social media graphic',
  email_sequence: 'email header banner',
  one_pager: 'marketing one-pager cover',
};

function buildImagePrompt(
  workstream: CreativeWorkstream,
  content: CreativeAssetContent,
): string {
  const heroBlock = content.blocks.find(
    (b) =>
      b.label.toLowerCase().includes('hero') ||
      b.label.toLowerCase().includes('headline'),
  );
  const headline = (heroBlock?.content ?? workstream.keyMessage).slice(0, 120);
  const assetLabel = ASSET_TYPE_LABELS[workstream.assetType] ?? 'marketing visual';
  const visualNotes = content.notes ? content.notes.slice(0, 300) : '';

  return [
    `Professional ${assetLabel} for a modern brand.`,
    `Core message: "${headline}".`,
    `Target audience: ${workstream.targetAudience}.`,
    visualNotes ? `Visual direction: ${visualNotes}` : '',
    'Clean, modern, editorial photography or flat illustration style.',
    'No text, no logos, no watermarks. High production quality.',
  ]
    .filter(Boolean)
    .join(' ');
}

async function generateCreativeVisual(
  workstream: CreativeWorkstream,
  content: CreativeAssetContent,
  apiKey: string,
): Promise<string | null> {
  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const imagePrompt = buildImagePrompt(workstream, content);

    const { image } = await generateImage({
      model: google.image('imagen-3.0-generate-002'),
      prompt: imagePrompt,
      aspectRatio: workstream.assetType === 'social_post' ? '1:1' : '16:9',
    });

    return `data:image/png;base64,${image.base64}`;
  } catch (err) {
    console.warn('[Creative agent] Imagen generation failed (skipped):', err instanceof Error ? err.message : err);
    return null;
  }
}
