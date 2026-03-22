/**
 * FitCheck — Panel Mode AI Orchestration
 *
 * Panel mode runs personas SEQUENTIALLY so each participant can hear what
 * the previous ones said, making the conversation genuinely emergent.
 * Personas also "see" uploaded media (images, video frames, PDF text, URLs)
 * via multimodal content parts in the Vercel AI SDK.
 */

import { streamText } from 'ai';
import { createHash } from 'crypto';
import { createGoogleGenerativeAI, type GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import type { MediaAttachment, PanelReaction, Persona } from '../types';
import { buildPersonaContext } from './focus-group';

// ─── Reaction cache ───────────────────────────────────────────────────────────
//
// A 30-minute TTL in-memory cache keyed on a hash of the inputs that determine
// a persona's response. Cache hits skip the AI call entirely, returning the
// stored reaction immediately. Useful when the same stimulus is tested
// repeatedly (e.g. iteration sessions).
//
// Anchored to globalThis so Next.js dev-mode module reloads share the same
// cache instance across routes.

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

declare global {
  // eslint-disable-next-line no-var
  var __fitcheckPanelCache: Map<string, { reaction: PanelReaction; expiresAt: number }> | undefined;
}

const panelReactionCache: Map<string, { reaction: PanelReaction; expiresAt: number }> =
  globalThis.__fitcheckPanelCache ??
  (globalThis.__fitcheckPanelCache = new Map());

function buildCacheKey(
  personaId: string,
  stimulus: string | undefined,
  media: MediaAttachment | undefined,
  priorReactions: PanelReaction[],
  conversationHistory: PanelReaction[][] | undefined,
  experimentModeratorAppend?: string,
): string {
  const h = createHash('sha256');
  h.update(personaId);
  h.update('|');
  h.update(stimulus ?? '');
  h.update('|');
  h.update(experimentModeratorAppend ?? '');
  h.update('|');
  if (media) {
    h.update(media.type + ':' + media.name);
    if (media.extractedText) h.update(media.extractedText.slice(0, 500));
    if (media.dataUrl) h.update(media.dataUrl.slice(0, 200));
  }
  h.update('|');
  for (const r of priorReactions) {
    h.update(r.personaId + ':' + r.content.slice(0, 100));
  }
  h.update('|');
  if (conversationHistory) {
    for (const round of conversationHistory.slice(-3)) {
      for (const r of round) {
        h.update(r.personaId + ':' + r.content.slice(0, 100));
      }
    }
  }
  return h.digest('hex');
}

function getCachedReaction(key: string): PanelReaction | null {
  const entry = panelReactionCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    panelReactionCache.delete(key);
    return null;
  }
  return entry.reaction;
}

function setCachedReaction(key: string, reaction: PanelReaction): void {
  // Evict expired entries periodically to prevent unbounded memory growth
  if (panelReactionCache.size > 200) {
    const now = Date.now();
    for (const [k, v] of Array.from(panelReactionCache.entries())) {
      if (now > v.expiresAt) panelReactionCache.delete(k);
    }
  }
  panelReactionCache.set(key, { reaction, expiresAt: Date.now() + CACHE_TTL_MS });
}

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

function buildPanelPrompt(
  persona: Persona,
  allPersonas: Persona[],
  speakingPosition: number,
  isContinuation: boolean,
  isDirectlyAddressed: boolean = false,
  experimentModeratorAppend?: string,
): string {
  const context = buildPersonaContext(persona, allPersonas);
  const isFirst = speakingPosition === 0;

  let turnInstruction: string;
  if (isDirectlyAddressed) {
    turnInstruction = `The founder has directed this question or comment specifically to you. Respond personally and directly — this is your moment to be candid. You may reference what others have said if relevant.`;
  } else if (isContinuation) {
    turnInstruction = isFirst
      ? `The group has been talking for a while. Pick up the thread — respond to what's been said most recently. Bring your perspective to where the conversation is right now.`
      : `Others have just added their thoughts. Read the latest exchange, then add your take. Push back, build on something, or introduce an angle that hasn't come up yet.`;
  } else {
    turnInstruction = isFirst
      ? `You are the first to react. Give your immediate, unfiltered first impression.`
      : `The other participants have already weighed in — read what they said, then give your own take. ` +
        `You can agree, push back, or add a new angle. Don't just echo others.`;
  }

  const followUpInstruction = !isFirst
    ? `
- If one of the other participants said something you'd strongly push back on, correct, or build on,
  add this tag on its own line AFTER the sentiment tag:
  [FOLLOW_UP: a brief phrase (≤10 words) naming exactly what you'd want to add]
  Only include this when you feel genuinely compelled to respond. Omit it entirely otherwise.`
    : '';

  const settingDescription = isContinuation
    ? `You're mid-conversation on a live video call — the group has been discussing this for a bit.`
    : `You're on a live video call with the founder and other research panel members. They've just shared something and asked for reactions.`;

  return `${context}

## Your role right now
${settingDescription} You're speaking out loud, so keep it natural and conversational.

${turnInstruction}

Guidelines:
- If you can see an image or video frame, lead with what stands out visually.
- Be specific — reference the actual copy, design, claim, or detail you're reacting to.
- Express genuine emotion that fits your worldview: excitement, skepticism, confusion, delight.
- STRICT: 1–2 short sentences only. No more. Speak like you're talking, not writing a review.
- Always finish your sentence completely before stopping.
- After your reaction, add a sentiment tag on its own line:
  [SENTIMENT: positive|neutral|skeptical|negative]${followUpInstruction}

Stay fully in character as ${persona.name}. Do not mention being an AI.${
    experimentModeratorAppend
      ? `

## Controlled experiment (mandatory)
The moderator is running a structured study. You MUST:
- Follow the instructions below exactly — do not drift into unrelated topics, hypotheticals, or meta commentary about research.
- Answer only what is asked for this turn; stay within the stimulus and the stated question.
- If something is unclear, say so briefly — do not invent product details not shown.

${experimentModeratorAppend}`
      : ''
  }`;
}

function buildFollowUpPrompt(
  persona: Persona,
  allPersonas: Persona[],
  hint: string,
): string {
  const context = buildPersonaContext(persona, allPersonas);

  return `${context}

## Your role right now
You're on a live video call. The full group has already given their initial reactions. You indicated you had something specific to add: "${hint}".

Now it's your turn. Address whoever you're responding to by name if it's clear. Speak naturally, as if picking up a thread of conversation.

Guidelines:
- STRICT: 1–2 short sentences only. No more.
- Be direct — you're following up on a specific point, not rehashing your entire view.
- Always finish your sentence completely before stopping.
- After your follow-up, add a sentiment tag on its own line:
  [SENTIMENT: positive|neutral|skeptical|negative]

Stay fully in character as ${persona.name}. Do not mention being an AI.`;
}

// ─── Content part builder ─────────────────────────────────────────────────────

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: string; mimeType: string };

function buildUserContent(
  stimulus: string | undefined,
  media: MediaAttachment | undefined,
  priorReactions: PanelReaction[],
  conversationHistory?: PanelReaction[][],
  speakingPosition: number = 0,
): ContentPart[] {
  const parts: ContentPart[] = [];

  // Non-first personas get compressed media text — prior reactions already
  // contextualize the key content so less raw source is needed.
  const maxMediaChars = speakingPosition === 0 ? 8000 : 2000;

  // --- Media (always provided for reference context) ---
  if (media) {
    if ((media.type === 'image' || media.type === 'video') && media.dataUrl) {
      const base64Match = media.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (base64Match) {
        parts.push({ type: 'image', image: base64Match[2], mimeType: base64Match[1] });
        if (media.type === 'video') {
          parts.push({
            type: 'text',
            text: `[Still frame from video: "${media.name}"]`,
          });
        }
      }
    }

    if (media.type === 'pdf' && media.extractedText) {
      parts.push({
        type: 'text',
        text: `[PDF: "${media.name}"]\n\n${media.extractedText.slice(0, maxMediaChars)}`,
      });
    }

    if (media.type === 'url' && media.extractedText) {
      const src = media.sourceUrl ? ` — ${media.sourceUrl}` : '';
      parts.push({
        type: 'text',
        text: `[Web page: "${media.name}"${src}]\n\n${media.extractedText.slice(0, maxMediaChars)}`,
      });
    }
  }

  // --- Founder's question/context ---
  if (stimulus) {
    parts.push({ type: 'text', text: stimulus });
  }

  // --- Prior rounds of conversation (autoplay continuation) ---
  // Cap at the last 3 rounds to prevent unbounded context growth in long sessions.
  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-3);
    const historyText = recentHistory
      .map((round, idx) => {
        const roundLines = round.map((r) => `${r.personaName.toUpperCase()}: ${r.content}`).join('\n\n');
        const roundNumber = conversationHistory.length - recentHistory.length + idx + 1;
        return `[Round ${roundNumber}]\n${roundLines}`;
      })
      .join('\n\n---\n\n');
    parts.push({
      type: 'text',
      text: `Full discussion so far:\n\n${historyText}`,
    });
  }

  // --- What the previous participants said in THIS round ---
  if (priorReactions.length > 0) {
    const transcript = priorReactions
      .map((r) => `${r.personaName.toUpperCase()}: ${r.content}`)
      .join('\n\n');
    parts.push({
      type: 'text',
      text: conversationHistory && conversationHistory.length > 0
        ? `What the others just said (latest round):\n\n${transcript}`
        : `What the others said before you:\n\n${transcript}`,
    });
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', text: 'Give your honest first impression of this product.' });
  }

  return parts;
}

// ─── Tag extractors ───────────────────────────────────────────────────────────

function extractReactionMeta(text: string): {
  content: string;
  sentiment: PanelReaction['sentiment'];
  followUpHint: string | null;
} {
  const sentimentMatch = text.match(/\[SENTIMENT:\s*(positive|neutral|skeptical|negative)\]/i);
  const sentiment = (sentimentMatch?.[1]?.toLowerCase() ?? 'neutral') as PanelReaction['sentiment'];

  const followUpMatch = text.match(/\[FOLLOW_UP:\s*([^\]]+)\]/i);
  const followUpHint = followUpMatch ? followUpMatch[1].trim() : null;

  const content = text
    .replace(/\[SENTIMENT:[^\]]*\]/gi, '')
    .replace(/\[FOLLOW_UP:[^\]]*\]/gi, '')
    .trim();

  return { content, sentiment, followUpHint };
}

// ─── Single persona panel reaction ───────────────────────────────────────────

export async function generatePersonaPanelReaction(
  persona: Persona,
  allPersonas: Persona[],
  stimulus: string | undefined,
  media: MediaAttachment | undefined,
  priorReactions: PanelReaction[],
  speakingPosition: number,
  conversationHistory?: PanelReaction[][],
  isDirectlyAddressed: boolean = false,
  onChunk?: (delta: string) => void,
  experimentModeratorAppend?: string,
): Promise<PanelReaction> {
  // Check cache first — skip AI call entirely on hits
  const cacheKey = buildCacheKey(
    persona.id,
    stimulus,
    media,
    priorReactions,
    conversationHistory,
    experimentModeratorAppend,
  );
  const cached = getCachedReaction(cacheKey);
  if (cached) {
    // Emit the full content as a single chunk so the UI streaming path is exercised
    onChunk?.(cached.content);
    return { ...cached, timestamp: new Date().toISOString() };
  }

  const isContinuation = !!(conversationHistory && conversationHistory.length > 0);
  const systemPrompt = buildPanelPrompt(
    persona,
    allPersonas,
    speakingPosition,
    isContinuation,
    isDirectlyAddressed,
    experimentModeratorAppend,
  );
  const contentParts = buildUserContent(stimulus, media, priorReactions, conversationHistory, speakingPosition);

  const hasImage = contentParts.some((p) => p.type === 'image');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let userMessage: any;

  if (hasImage) {
    userMessage = {
      role: 'user' as const,
      content: contentParts.map((part) =>
        part.type === 'image'
          ? { type: 'image' as const, image: part.image, mimeType: part.mimeType }
          : { type: 'text' as const, text: part.text }
      ),
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

  const { textStream } = streamText({
    model: getChatModel() as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    system: systemPrompt,
    messages: [userMessage],
    temperature: 0.85,
    maxOutputTokens: 300,
    // Disable Gemini 2.5 Flash's default thinking — thinking tokens count
    // against maxOutputTokens and will truncate the spoken response.
    providerOptions: {
      google: {
        thinkingConfig: { thinkingBudget: 0 },
      } satisfies GoogleGenerativeAIProviderOptions,
    },
  });

  let fullText = '';
  for await (const delta of textStream) {
    fullText += delta;
    onChunk?.(delta);
  }

  const { content, sentiment, followUpHint } = extractReactionMeta(fullText.trim());

  const reaction: PanelReaction = {
    personaId: persona.id,
    personaName: persona.name,
    content,
    sentiment,
    followUpHint,
    timestamp: new Date().toISOString(),
  };

  setCachedReaction(cacheKey, reaction);
  return reaction;
}

// ─── Follow-up reaction for a single persona ──────────────────────────────────

export async function generatePersonaFollowUp(
  persona: Persona,
  allPersonas: Persona[],
  stimulus: string | undefined,
  media: MediaAttachment | undefined,
  allReactions: PanelReaction[],
  hint: string,
): Promise<PanelReaction> {
  const systemPrompt = buildFollowUpPrompt(persona, allPersonas, hint);

  // Build the discussion transcript as context
  const transcript = allReactions
    .map((r) => `${r.personaName.toUpperCase()}: ${r.content}`)
    .join('\n\n');

  const contextParts = buildUserContent(stimulus, media, []);
  const transcriptPart = { type: 'text' as const, text: `Discussion so far:\n\n${transcript}` };

  const allParts = [...contextParts, transcriptPart];
  const hasImage = allParts.some((p) => p.type === 'image');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let userMessage: any;

  if (hasImage) {
    userMessage = {
      role: 'user' as const,
      content: allParts.map((part) =>
        part.type === 'image'
          ? { type: 'image' as const, image: (part as { type: 'image'; image: string; mimeType: string }).image, mimeType: (part as { type: 'image'; image: string; mimeType: string }).mimeType }
          : { type: 'text' as const, text: (part as { type: 'text'; text: string }).text },
      ),
    };
  } else {
    const textContent = allParts
      .filter((p) => p.type === 'text')
      .map((p) => (p as { type: 'text'; text: string }).text)
      .join('\n\n');
    userMessage = { role: 'user' as const, content: textContent };
  }

  const { textStream: followUpStream } = streamText({
    model: getChatModel() as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    system: systemPrompt,
    messages: [userMessage],
    temperature: 0.85,
    maxOutputTokens: 200,
    providerOptions: {
      google: {
        thinkingConfig: { thinkingBudget: 0 },
      } satisfies GoogleGenerativeAIProviderOptions,
    },
  });

  let followUpText = '';
  for await (const delta of followUpStream) {
    followUpText += delta;
  }

  const { content, sentiment } = extractReactionMeta(followUpText.trim());

  return {
    personaId: persona.id,
    personaName: persona.name,
    content,
    sentiment,
    timestamp: new Date().toISOString(),
  };
}

// ─── Sequential reaction runner ───────────────────────────────────────────────

export interface PanelReactionResult {
  reaction: PanelReaction | null;
  error: string | null;
  personaId: string;
}

/**
 * Run all persona reactions SEQUENTIALLY so each participant hears what
 * the previous ones said. Callbacks fire at each stage, allowing the API
 * route to stream results token-by-token via SSE.
 *
 * @param onReactionComplete - Fires after each persona's full reaction is ready.
 * @param conversationHistory - Prior rounds from an autoplay session. When
 *   provided, personas are prompted to continue an ongoing discussion rather
 *   than give a first impression.
 * @param targetedPersonaId - When set, only this persona responds. All others
 *   are skipped (they remain aware via conversation history in future rounds).
 * @param onReactionStart - Optional: fires just before a persona begins
 *   generating, so the client can show a typing indicator immediately.
 * @param onChunk - Optional: fires for each streamed token delta so the
 *   client can render text progressively without waiting for the full response.
 */
export async function generateAllPanelReactions(
  personas: Persona[],
  stimulus: string | undefined,
  media: MediaAttachment | undefined,
  onReactionComplete: (result: PanelReactionResult) => void,
  conversationHistory?: PanelReaction[][],
  targetedPersonaId?: string,
  onReactionStart?: (personaId: string) => void,
  onChunk?: (personaId: string, delta: string) => void,
  options?: { experimentModeratorAppend?: string },
): Promise<void> {
  const accumulated: PanelReaction[] = [];
  const experimentModeratorAppend = options?.experimentModeratorAppend;

  for (let i = 0; i < personas.length; i++) {
    const persona = personas[i];

    // When a specific persona is targeted, skip all others — they are aware
    // of the exchange through conversation history in subsequent rounds.
    if (targetedPersonaId && persona.id !== targetedPersonaId) {
      continue;
    }

    // Notify client before generation begins so it can show a typing indicator
    onReactionStart?.(persona.id);

    try {
      const isDirectlyAddressed = !!targetedPersonaId;
      const reaction = await generatePersonaPanelReaction(
        persona,
        personas,
        stimulus,
        media,
        accumulated,
        i,
        conversationHistory,
        isDirectlyAddressed,
        onChunk ? (delta) => onChunk(persona.id, delta) : undefined,
        experimentModeratorAppend,
      );
      accumulated.push(reaction);
      onReactionComplete({ reaction, error: null, personaId: persona.id });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      onReactionComplete({ reaction: null, error, personaId: persona.id });
    }
  }
}
