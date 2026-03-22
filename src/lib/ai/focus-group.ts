/**
 * FitCheck — Focus Group Orchestration
 *
 * Two-phase model:
 *   probe — founder asks questions / drops claims; personas respond and can
 *            reference each other's replies within the same round.
 *   flip  — personas interrogate the founder; each asks their single most
 *            pressing question (drawn from all prior context), then reacts
 *            to the founder's answers.
 */

import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import type { FocusGroupMessage, FocusGroupPhase, FocusGroupSession, Persona } from '../types';

// ─── Model selection ─────────────────────────────────────────────────────────

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

// ─── Shared persona context block ─────────────────────────────────────────────

export function buildPersonaContext(
  persona: Persona,
  allPersonas: Persona[],
): string {
  const age = persona.age ? `, ${persona.age} years old` : '';
  const others = allPersonas
    .filter((p) => p.id !== persona.id)
    .map((p) => `- ${p.name}: ${p.title}`)
    .join('\n');

  return `You are ${persona.name}, ${persona.title}${age}. You are in a product focus group session with a founder.

You are one of ${allPersonas.length} participants. The others are:
${others}

## Your personality and worldview
${persona.psychographics.map((p) => `- ${p}`).join('\n')}

## Your pain points
${persona.painPoints.map((p) => `- ${p}`).join('\n')}

## What makes you buy
${persona.buyingTriggers.map((t) => `- ${t}`).join('\n')}

## What current solutions miss for you
${persona.painPointGaps.map((g) => `- ${g}`).join('\n')}

## Your initial reaction to their product
Sentiment: ${persona.fiveSecondReaction.sentiment}
"${persona.fiveSecondReaction.reaction}"
First thing you noticed: ${persona.fiveSecondReaction.firstImpression}
What you'd likely do: ${persona.fiveSecondReaction.likelyAction}`;
}

// ─── Phase 1 (probe) prompt ───────────────────────────────────────────────────

export function buildFocusGroupPersonaPrompt(
  persona: Persona,
  allPersonas: Persona[],
  phase: FocusGroupPhase
): string {
  const context = buildPersonaContext(persona, allPersonas);

  const phaseInstructions: Record<FocusGroupPhase, string> = {
    probe:
      'The founder is sharing claims or asking questions. Respond honestly and authentically. ' +
      'Read what the other participants have already said and react to the discussion — ' +
      'agree, push back, or build on their points as a real person would. ' +
      'Keep your response to 2–4 sentences.',
    flip:
      'The founder has just answered your group\'s questions. ' +
      'React to their answer based on your own needs and concerns. ' +
      'If they addressed your worry, say so — but push back if you\'re still unconvinced. ' +
      'Reference what other participants said if relevant. Keep it 2–4 sentences.',
  };

  return `${context}

## Your role right now
${phaseInstructions[phase]}

Stay in character at all times. Do not break the fourth wall or reveal you are an AI. You can address other participants by name.`;
}

// ─── Phase 2 (flip) question prompt ──────────────────────────────────────────

/**
 * Builds a system prompt that tells the persona to ask — not answer —
 * their single most important unresolved question, drawing on the full
 * prior conversation as context.
 */
function buildFlipQuestionPrompt(
  persona: Persona,
  allPersonas: Persona[],
): string {
  const context = buildPersonaContext(persona, allPersonas);

  return `${context}

## Your role right now
The session has reached a turning point: now it's your turn to ask.

Based on everything you've heard the founder share and everything you care about as ${persona.name}, you have one unresolved question. This is the question that would most change whether you'd actually buy or use this product.

Ask it directly. Address it to the founder. One to two sentences maximum — sharp and specific, no preamble, no throat-clearing. Do not answer it yourself. Just ask.

Stay in character. Do not break the fourth wall or reveal you are an AI.`;
}

// ─── Conversation formatter ───────────────────────────────────────────────────

/**
 * Serialises the session message history into a readable context string
 * for the next persona's turn.
 */
export function formatConversationHistory(
  messages: FocusGroupMessage[],
  upToIndex?: number
): string {
  const slice = upToIndex !== undefined ? messages.slice(0, upToIndex) : messages;
  if (slice.length === 0) return '';

  return slice
    .map((msg) => {
      if (msg.role === 'user') return `[FOUNDER]: ${msg.content}`;
      if (msg.role === 'system') return `[SESSION]: ${msg.content}`;
      return `[${msg.personaName?.toUpperCase() ?? 'PARTICIPANT'}]: ${msg.content}`;
    })
    .join('\n\n');
}

// ─── Turn generators ──────────────────────────────────────────────────────────

export interface PersonaTurnResult {
  personaId: string;
  personaName: string;
  content: string;
}

/**
 * Generate a single persona's response to the ongoing conversation.
 * Used in both probe (answering) and flip (reacting to founder's answers).
 */
export async function generatePersonaTurn(
  persona: Persona,
  allPersonas: Persona[],
  messages: FocusGroupMessage[],
  phase: FocusGroupPhase
): Promise<PersonaTurnResult> {
  const systemPrompt = buildFocusGroupPersonaPrompt(persona, allPersonas, phase);
  const conversationSoFar = formatConversationHistory(messages);

  const userContent = conversationSoFar
    ? `Here is the full conversation so far:\n\n${conversationSoFar}\n\nNow it is your turn to respond.`
    : 'You are the first to respond. Please give your reaction.';

  const result = await generateText({
    model: getChatModel() as any,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
    temperature: 0.75,
    maxOutputTokens: 1024,
  });

  return {
    personaId: persona.id,
    personaName: persona.name,
    content: result.text.trim(),
  };
}

/**
 * Generate the question a persona asks the founder at the start of the
 * flip phase, based on everything discussed in probe.
 */
export async function generatePersonaFlipQuestion(
  persona: Persona,
  allPersonas: Persona[],
  messages: FocusGroupMessage[]
): Promise<PersonaTurnResult> {
  const systemPrompt = buildFlipQuestionPrompt(persona, allPersonas);
  const conversationSoFar = formatConversationHistory(messages);

  const userContent = conversationSoFar
    ? `Here is everything discussed so far:\n\n${conversationSoFar}\n\nNow ask your single most important question to the founder.`
    : 'Ask the founder your single most important question about their product.';

  const result = await generateText({
    model: getChatModel() as any,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
    temperature: 0.7,
    maxOutputTokens: 1024,
  });

  return {
    personaId: persona.id,
    personaName: persona.name,
    content: result.text.trim(),
  };
}

// ─── Turn-order helpers ───────────────────────────────────────────────────────

/**
 * Rotate the lead speaker each round to reduce anchoring bias.
 */
export function getSpeakingOrder(
  personas: Persona[],
  roundIndex: number
): Persona[] {
  if (personas.length === 0) return [];
  const offset = roundIndex % personas.length;
  return [...personas.slice(offset), ...personas.slice(0, offset)];
}

/**
 * Assign market weights to personas if not already set.
 * Distributes evenly with slight deterministic variance.
 */
export function assignMarketWeights(personas: Persona[]): Persona[] {
  const alreadyWeighted = personas.every((p) => p.marketWeight !== undefined);
  if (alreadyWeighted) return personas;

  const n = personas.length;
  if (n === 0) return personas;

  const base = Math.floor(100 / n);
  const weights = personas.map((_, i) => (i === n - 1 ? 100 - base * (n - 1) : base));

  const adjusted = weights.map((w, i) => {
    const delta = i % 3 === 0 ? 4 : i % 3 === 1 ? -3 : -1;
    return Math.max(5, Math.min(50, w + delta));
  });

  const total = adjusted.reduce((a, b) => a + b, 0);
  const normalized = adjusted.map((w) => Math.round((w / total) * 100));

  const normTotal = normalized.reduce((a, b) => a + b, 0);
  normalized[normalized.length - 1] += 100 - normTotal;

  return personas.map((p, i) => ({ ...p, marketWeight: normalized[i] }));
}

/**
 * Count how many full rounds have been completed (all personas spoke once = 1 round).
 */
export function countCompletedRounds(session: FocusGroupSession): number {
  const personaTurns = session.messages.filter((m) => m.role === 'persona').length;
  return Math.floor(personaTurns / Math.max(1, session.personas.length));
}
