/**
 * FitCheck — RocketRide client wrapper.
 *
 * Provides a thin, Next.js-safe abstraction over the `rocketride` TypeScript SDK.
 * Every public function is a no-op / returns `null` when `ROCKETRIDE_URI` is not
 * set, so existing functionality is never broken by the absence of RocketRide.
 *
 * Usage pattern (all callers):
 *   if (!isRocketRideEnabled()) return;   // guard at call site
 *   const result = await withRocketRide(async (client) => { ... });
 *
 * Deployment modes supported:
 *   - Local IDE server  (ROCKETRIDE_URI=http://localhost:5565)
 *   - On-prem Docker   (ROCKETRIDE_URI=http://your-host:5565)
 *   - RocketRide Cloud (ROCKETRIDE_URI=https://cloud.rocketride.ai + ROCKETRIDE_APIKEY)
 */

import { RocketRideClient, type RocketRideClientConfig } from 'rocketride';
import type { PipelineConfig } from 'rocketride';

export type { PipelineConfig };

// ─── Config ──────────────────────────────────────────────────────────────────

function buildConfig(): RocketRideClientConfig {
  return {
    uri: process.env.ROCKETRIDE_URI ?? 'http://localhost:5565',
    auth: process.env.ROCKETRIDE_APIKEY,
    requestTimeout: 60_000,
  };
}

/**
 * Returns true when the integration is active (env var is set).
 * Use this as a fast check at every call site before calling any helper.
 */
export function isRocketRideEnabled(): boolean {
  return Boolean(process.env.ROCKETRIDE_URI);
}

// ─── Connection lifecycle ─────────────────────────────────────────────────────

/**
 * Run `callback` with a fully-connected `RocketRideClient`, then disconnect.
 * Uses the SDK's `withConnection` static helper so the connection is always
 * cleaned up — even if `callback` throws.
 *
 * Returns `null` (without connecting) when `ROCKETRIDE_URI` is not set.
 */
export async function withRocketRide<T>(
  callback: (client: RocketRideClient) => Promise<T>
): Promise<T | null> {
  if (!isRocketRideEnabled()) return null;
  return RocketRideClient.withConnection(buildConfig(), callback);
}

// ─── Pipeline helpers ─────────────────────────────────────────────────────────

/**
 * Execute a pipeline defined by an inline `PipelineConfig` object.
 * Sends `input` as a JSON string and returns the raw result body.
 *
 * Prefer `runPipelineFromFile` when you have a `.pipe` file on disk; use this
 * when you need to construct the pipeline config programmatically at runtime.
 */
export async function runPipeline(
  pipeline: PipelineConfig,
  input: unknown,
  mimeType = 'application/json'
): Promise<unknown> {
  return withRocketRide(async (client) => {
    const { token } = await client.use({ pipeline: { pipeline } });
    const payload = typeof input === 'string' ? input : JSON.stringify(input);
    const result = await client.send(token, payload, { name: 'input.json' }, mimeType);
    await client.terminate(token);
    return result;
  });
}

/**
 * Execute a pipeline loaded from a `.pipe` file path.
 * Path is relative to the project root (i.e. `pipelines/ner-enrichment.pipe`).
 */
export async function runPipelineFromFile(
  filepath: string,
  input: unknown,
  mimeType = 'application/json'
): Promise<unknown> {
  return withRocketRide(async (client) => {
    const { token } = await client.use({ filepath });
    const payload = typeof input === 'string' ? input : JSON.stringify(input);
    const result = await client.send(token, payload, { name: 'input.json' }, mimeType);
    await client.terminate(token);
    return result;
  });
}

// ─── Domain-specific helpers ──────────────────────────────────────────────────

export interface NerEntity {
  text: string;
  label: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface NerResult {
  entities: NerEntity[];
  originalText: string;
}

/**
 * Run Named Entity Recognition on raw text scraped from a company or competitor
 * page. Returns structured entities that enrich the brand perception analysis.
 *
 * Returns `null` when RocketRide is not enabled — callers should treat `null`
 * as "enrichment unavailable" and continue without it.
 */
export async function extractEntities(text: string): Promise<NerResult | null> {
  const result = await runPipelineFromFile('pipelines/ner-enrichment.pipe', { text });
  if (!result) return null;

  const body = result as Record<string, unknown>;
  return {
    entities: (body.entities as NerEntity[]) ?? [],
    originalText: text,
  };
}

export interface PiiResult {
  anonymizedText: string;
  redactedCount: number;
}

/**
 * Anonymize PII (names, emails, phone numbers, etc.) in scraped text before it
 * is persisted or sent to LLMs. Returns the original text unchanged when
 * RocketRide is not enabled.
 */
export async function anonymizePii(text: string): Promise<PiiResult> {
  if (!isRocketRideEnabled()) {
    return { anonymizedText: text, redactedCount: 0 };
  }

  const result = await runPipelineFromFile('pipelines/pii-anonymization.pipe', { text });
  if (!result) return { anonymizedText: text, redactedCount: 0 };

  const body = result as Record<string, unknown>;
  return {
    anonymizedText: (body.anonymized_text as string) ?? text,
    redactedCount: (body.redacted_count as number) ?? 0,
  };
}

export interface SentimentResult {
  score: number;       // -1 (very negative) to 1 (very positive)
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;  // 0–1
}

/**
 * Run lightweight sentiment scoring on scraped review or mention text.
 * Used as a secondary signal alongside the LLM brand perception analysis.
 *
 * Returns `null` when RocketRide is not enabled.
 */
export async function scoreSentiment(text: string): Promise<SentimentResult | null> {
  const result = await runPipelineFromFile('pipelines/sentiment-analysis.pipe', { text });
  if (!result) return null;

  const body = result as Record<string, unknown>;
  return {
    score: (body.score as number) ?? 0,
    label: (body.label as SentimentResult['label']) ?? 'neutral',
    confidence: (body.confidence as number) ?? 0,
  };
}
