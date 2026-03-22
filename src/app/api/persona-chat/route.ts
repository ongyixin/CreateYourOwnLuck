/**
 * POST /api/persona-chat
 *
 * Simulate a conversation with a FitCheck persona. The persona responds
 * in-character based on their psychographics, pain points, and buying triggers.
 *
 * Body: { persona: Persona; message: string; history: ChatMessage[] }
 * Response: { reply: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { requireTier } from '@/lib/auth/require-tier';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import type { Persona } from '@/lib/types';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface PersonaChatRequest {
  persona: Persona;
  message: string;
  history: ChatMessage[];
}

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

function buildPersonaSystemPrompt(persona: Persona): string {
  const age = persona.age ? `, ${persona.age} years old` : '';

  return `You are ${persona.name}, ${persona.title}${age}.

You are a real potential customer being interviewed by a product team. Respond naturally and authentically in first person, as yourself. Keep responses conversational and grounded — 2 to 4 sentences unless elaborating on something specific.

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
What you'd likely do: ${persona.fiveSecondReaction.likelyAction}

Stay in character at all times. Do not break the fourth wall or reveal you are an AI. Answer questions as ${persona.name} would — with your specific context, frustrations, and motivations. Be honest, even when it means expressing skepticism or confusion.`;
}

export async function POST(req: NextRequest) {
  const tierCheck = await requireTier("PRO");
  if (!tierCheck.ok) return tierCheck.response;

  let body: PersonaChatRequest;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { persona, message, history } = body;

  if (!persona || !message?.trim()) {
    return NextResponse.json(
      { error: 'Missing required fields: persona, message' },
      { status: 400 },
    );
  }

  try {
    const systemPrompt = buildPersonaSystemPrompt(persona);

    const messages = [
      ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message.trim() },
    ];

    const result = await generateText({
      model: getChatModel() as any,
      system: systemPrompt,
      messages,
      temperature: 0.7,
      maxOutputTokens: 1024,
    });

    return NextResponse.json({ reply: result.text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[persona-chat] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
