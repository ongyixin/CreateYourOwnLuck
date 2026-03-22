/**
 * FitCheck — Panel Mode AI Orchestration
 *
 * Panel mode differs from focus-group chat in two key ways:
 *  1. All personas react in parallel (Promise.allSettled) rather than sequentially.
 *  2. Personas can "see" uploaded media (images, video frames, PDF text) via
 *     multimodal content parts in the Vercel AI SDK.
 */

import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import type { MediaAttachment, PanelReaction, Persona } from '../types';
import { buildPersonaContext } from './focus-group';

// ─── Model selection ──────────────────────────────────────────────────────────

function getChatModel() {
  const provider = (process.env.AI_PROVIDER ?? 'gemini').toLowerCase();

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    return createGoogleGenerativeAI({ apiKey })('gemini-2.5-flash');
  }

  if (provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    return createAnthropic({ apiKey })('claude-haiku-4-5-20251001');
  }

  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
    return createOpenAI({ apiKey })('gpt-4o-mini');
  }

  throw new Error(`Unknown AI_PROVIDER "${provider}"`);
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPanelPrompt(persona: Persona, allPersonas: Persona[]): string {
  const context = buildPersonaContext(persona, allPersonas);

  return `${context}

## Your role right now
You are in a live research panel. The founder has just shared a piece of marketing material or
asked a question. Give your immediate, authentic first impression as ${persona.name}.

Guidelines:
- React to what you actually see or hear — be specific about the visual, copy, or claim.
- If an image is provided, comment on what stands out visually before anything else.
- Express genuine emotion: excitement, confusion, skepticism, curiosity — whatever fits your worldview.
- Keep it 2–4 sentences. No preamble, no "As someone who…" openers — just react.
- After your reaction, end your response with a sentiment tag on its own line in this exact format:
  [SENTIMENT: positive|neutral|skeptical|negative]

Stay in character. Do not break the fourth wall or reveal you are an AI.`;
}

// ─── Content part builder ─────────────────────────────────────────────────────

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: string; mimeType: string };

function buildUserContent(stimulus: string | undefined, media: MediaAttachment | undefined): ContentPart[] {
  const parts: ContentPart[] = [];

  if (media) {
    if ((media.type === 'image' || media.type === 'video') && media.dataUrl) {
      // Strip the "data:<mime>;base64," prefix to get raw base64
      const base64Match = media.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (base64Match) {
        parts.push({
          type: 'image',
          image: base64Match[2],
          mimeType: base64Match[1],
        });
        if (media.type === 'video') {
          parts.push({
            type: 'text',
            text: `[This is a still frame extracted from the video "${media.name}"]`,
          });
        }
      }
    }

    if (media.type === 'pdf' && media.extractedText) {
      parts.push({
        type: 'text',
        text: `[PDF document: "${media.name}"]\n\n${media.extractedText.slice(0, 8000)}`,
      });
    }
  }

  if (stimulus) {
    parts.push({
      type: 'text',
      text: stimulus,
    });
  }

  if (parts.length === 0) {
    parts.push({
      type: 'text',
      text: 'Please give your overall first impression of this product.',
    });
  }

  return parts;
}

// ─── Sentiment extractor ──────────────────────────────────────────────────────

function extractSentiment(text: string): {
  content: string;
  sentiment: PanelReaction['sentiment'];
} {
  const match = text.match(/\[SENTIMENT:\s*(positive|neutral|skeptical|negative)\]/i);
  const sentiment = (match?.[1]?.toLowerCase() ?? 'neutral') as PanelReaction['sentiment'];
  const content = text.replace(/\[SENTIMENT:[^\]]*\]/gi, '').trim();
  return { content, sentiment };
}

// ─── Single persona panel reaction ───────────────────────────────────────────

export async function generatePersonaPanelReaction(
  persona: Persona,
  allPersonas: Persona[],
  stimulus: string | undefined,
  media: MediaAttachment | undefined
): Promise<PanelReaction> {
  const systemPrompt = buildPanelPrompt(persona, allPersonas);
  const contentParts = buildUserContent(stimulus, media);

  // Build messages array — use multimodal parts when image is present
  const hasImage = contentParts.some((p) => p.type === 'image');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let userMessage: any;

  if (hasImage) {
    userMessage = {
      role: 'user' as const,
      content: contentParts.map((part) => {
        if (part.type === 'image') {
          return {
            type: 'image' as const,
            image: part.image,
            mimeType: part.mimeType,
          };
        }
        return { type: 'text' as const, text: part.text };
      }),
    };
  } else {
    const textContent = contentParts
      .filter((p): p is Extract<ContentPart, { type: 'text' }> => p.type === 'text')
      .map((p) => p.text)
      .join('\n\n');
    userMessage = {
      role: 'user' as const,
      content: textContent || 'Give your first impression.',
    };
  }

  const result = await generateText({
    model: getChatModel() as any,
    system: systemPrompt,
    messages: [userMessage],
    temperature: 0.8,
    maxOutputTokens: 512,
  });

  const { content, sentiment } = extractSentiment(result.text.trim());

  return {
    personaId: persona.id,
    personaName: persona.name,
    content,
    sentiment,
    timestamp: new Date().toISOString(),
  };
}

// ─── Parallel reaction runner ─────────────────────────────────────────────────

export interface ParallelPanelResult {
  reaction: PanelReaction | null;
  error: string | null;
  personaId: string;
}

/**
 * Run all personas in parallel. Returns results in completion order.
 * Uses a callback so callers can stream each result as it arrives.
 */
export async function generateAllPanelReactions(
  personas: Persona[],
  stimulus: string | undefined,
  media: MediaAttachment | undefined,
  onReactionComplete: (result: ParallelPanelResult) => void
): Promise<void> {
  const tasks = personas.map(async (persona) => {
    try {
      const reaction = await generatePersonaPanelReaction(persona, personas, stimulus, media);
      onReactionComplete({ reaction, error: null, personaId: persona.id });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      onReactionComplete({ reaction: null, error, personaId: persona.id });
    }
  });

  await Promise.allSettled(tasks);
}
