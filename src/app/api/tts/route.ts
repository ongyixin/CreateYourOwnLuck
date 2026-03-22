/**
 * POST /api/tts
 *
 * Text-to-speech proxy. Supports two providers, selected by AI_PROVIDER:
 *
 *  - openai  → OpenAI tts-1 model, returns audio/mpeg
 *  - gemini  → Gemini 2.5 Flash TTS, returns audio/wav (PCM wrapped in WAV header)
 *  - anthropic → Anthropic has no TTS; falls back to whichever key is available
 *
 * Request body: { text: string; voice?: string }
 *
 * The `voice` field accepts OpenAI voice names (alloy | echo | fable | nova | onyx | shimmer).
 * These are transparently mapped to the equivalent Gemini voice when Gemini is used.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTier } from '@/lib/auth/require-tier';

// ─── Voice mappings ───────────────────────────────────────────────────────────

const OPENAI_VOICES = ['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer'] as const;
type OpenAIVoice = (typeof OPENAI_VOICES)[number];

// Map OpenAI voice names → Gemini voice names (character matched by feel)
const OPENAI_TO_GEMINI: Record<OpenAIVoice, string> = {
  alloy: 'Aoede',      // Breezy  ↔  Alloy: neutral/versatile
  echo: 'Kore',        // Firm    ↔  Echo: clear/precise
  fable: 'Puck',       // Upbeat  ↔  Fable: warm/storytelling
  nova: 'Zephyr',      // Bright  ↔  Nova: energetic
  onyx: 'Charon',      // Informative ↔ Onyx: deep/authoritative
  shimmer: 'Leda',     // Youthful ↔ Shimmer: light/bright
};

const MAX_TEXT_LENGTH = 4096;

// ─── WAV header builder ───────────────────────────────────────────────────────

/**
 * Wraps raw PCM (s16le) in a minimal WAV/RIFF header.
 * Gemini TTS returns raw 16-bit little-endian PCM at 24 000 Hz, mono.
 */
function pcmToWav(pcmData: Buffer, sampleRate = 24000, channels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);

  // RIFF chunk
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8, 'ascii');

  // fmt sub-chunk
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);           // sub-chunk size
  buffer.writeUInt16LE(1, 20);            // PCM = 1
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataSize, 40);
  pcmData.copy(buffer, headerSize);

  return buffer;
}

// ─── Provider implementations ─────────────────────────────────────────────────

async function ttsOpenAI(text: string, voice: OpenAIVoice, apiKey: string): Promise<Response> {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice,
      response_format: 'mp3',
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error');
    throw new Error(`OpenAI TTS ${res.status}: ${errText}`);
  }

  return new Response(res.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  });
}

async function ttsGemini(text: string, voice: OpenAIVoice, apiKey: string): Promise<Response> {
  const geminiVoice = OPENAI_TO_GEMINI[voice];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: geminiVoice },
            },
          },
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Gemini TTS ${res.status}: ${errText}`);
  }

  const json = await res.json() as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { data?: string } }> };
    }>;
  };

  const b64 = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) throw new Error('Gemini TTS: no audio data in response');

  const pcmBuffer = Buffer.from(b64, 'base64');
  const wavBuffer = pcmToWav(pcmBuffer);
  // Slice to a clean ArrayBuffer aligned to the WAV content
  const arrayBuffer = wavBuffer.buffer.slice(
    wavBuffer.byteOffset,
    wavBuffer.byteOffset + wavBuffer.byteLength
  ) as ArrayBuffer;

  return new Response(arrayBuffer, {
    headers: {
      'Content-Type': 'audio/wav',
      'Cache-Control': 'no-store',
    },
  });
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const tierCheck = await requireTier('PRO');
  if (!tierCheck.ok) return tierCheck.response;

  let body: { text?: string; voice?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { text, voice = 'alloy' } = body;

  if (!text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `text must be ${MAX_TEXT_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }

  const resolvedVoice: OpenAIVoice = OPENAI_VOICES.includes(voice as OpenAIVoice)
    ? (voice as OpenAIVoice)
    : 'alloy';

  const truncated = text.slice(0, MAX_TEXT_LENGTH);
  const provider = (process.env.AI_PROVIDER ?? 'gemini').toLowerCase();
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  try {
    // Primary: use the configured AI_PROVIDER if it supports TTS
    if (provider === 'openai' && openaiKey) {
      return await ttsOpenAI(truncated, resolvedVoice, openaiKey);
    }
    if (provider === 'gemini' && geminiKey) {
      return await ttsGemini(truncated, resolvedVoice, geminiKey);
    }

    // Anthropic has no TTS — fall back to whichever key is available
    if (geminiKey) {
      return await ttsGemini(truncated, resolvedVoice, geminiKey);
    }
    if (openaiKey) {
      return await ttsOpenAI(truncated, resolvedVoice, openaiKey);
    }

    return NextResponse.json(
      { error: 'No TTS API key configured. Set OPENAI_API_KEY or GEMINI_API_KEY.' },
      { status: 503 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/tts] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
