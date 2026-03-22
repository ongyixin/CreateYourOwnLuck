/**
 * POST /api/scrape-url
 *
 * Scrapes a URL and returns a MediaAttachment suitable for panel mode.
 *
 * Strategy:
 *  - YouTube URLs  → direct HTTP fetch, parse Open Graph / meta tags from HTML.
 *                    Fast path: no Apify needed.
 *  - Other URLs    → Apify website-content-crawler (1 page, cheerio, 60 s).
 *                    Falls back to direct fetch + meta tag parse if APIFY_TOKEN
 *                    is not set or the run fails.
 *
 * Body: { url: string }
 * Response: MediaAttachment JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTier } from '@/lib/auth/require-tier';
import { runActor } from '@/lib/apify/client';
import { ACTORS, buildWebsiteCrawlInput } from '@/lib/apify/actors';
import { normalizeWebsiteItems } from '@/lib/apify/normalizer';
import type { MediaAttachment } from '@/lib/types';

// ─── Limits ───────────────────────────────────────────────────────────────────

const MAX_CONTENT_CHARS = 8_000;
const CRAWL_TIMEOUT_SECS = 60;
const CRAWL_MEMORY_MB = 512;

// ─── YouTube detection ────────────────────────────────────────────────────────

function isYouTubeUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'youtube.com' || hostname === 'www.youtube.com' || hostname === 'youtu.be';
  } catch {
    return false;
  }
}

// ─── HTML meta tag extractor ──────────────────────────────────────────────────

interface PageMeta {
  title: string;
  description: string;
}

function extractMeta(html: string): PageMeta {
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1];

  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)?.[1];

  const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1];

  const htmlTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];

  const title = (ogTitle ?? htmlTitle ?? '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();

  const description = (ogDesc ?? metaDesc ?? '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();

  return { title, description };
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + '\n\n[content truncated]';
}

// ─── Direct fetch fallback ────────────────────────────────────────────────────

async function fetchMeta(url: string): Promise<{ title: string; content: string }> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; FitCheck/1.0; +https://fitcheck.app)',
      Accept: 'text/html,application/xhtml+xml,*/*',
    },
    // 10 second read timeout via AbortController
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);

  const html = await res.text();
  const { title, description } = extractMeta(html);

  const content = [
    title && `Title: ${title}`,
    description && `Description: ${description}`,
    `Source: ${url}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return { title: title || url, content };
}

// ─── Apify website crawl ──────────────────────────────────────────────────────

async function crawlWithApify(url: string): Promise<{ title: string; content: string }> {
  const items = await runActor(
    ACTORS.WEBSITE_CRAWLER,
    buildWebsiteCrawlInput(url, 1),
    CRAWL_TIMEOUT_SECS,
    CRAWL_MEMORY_MB
  );

  const pages = normalizeWebsiteItems(items, url);
  if (pages.length === 0) throw new Error('Crawl returned no pages');

  const page = pages[0];
  const title = page.title || url;
  const content = [
    `Title: ${title}`,
    `URL: ${page.url}`,
    page.content,
  ]
    .filter(Boolean)
    .join('\n\n');

  return { title, content: truncate(content, MAX_CONTENT_CHARS) };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const tierCheck = await requireTier('PRO');
  if (!tierCheck.ok) return tierCheck.response;

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url } = body;
  if (!url?.trim()) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  // Validate and normalise URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const normalizedUrl = parsedUrl.toString();
  const youtube = isYouTubeUrl(normalizedUrl);

  try {
    let title: string;
    let content: string;

    if (youtube) {
      // Fast path: direct fetch for YouTube (og tags are in SSR HTML)
      ({ title, content } = await fetchMeta(normalizedUrl));
    } else {
      // Full path: Apify crawler, fall back to direct fetch
      const apifyToken = process.env.APIFY_TOKEN;
      if (apifyToken) {
        try {
          ({ title, content } = await crawlWithApify(normalizedUrl));
        } catch (apifyErr) {
          console.warn('[scrape-url] Apify failed, falling back to direct fetch:', apifyErr);
          ({ title, content } = await fetchMeta(normalizedUrl));
        }
      } else {
        ({ title, content } = await fetchMeta(normalizedUrl));
      }
    }

    const attachment: MediaAttachment = {
      type: 'url',
      name: title,
      dataUrl: null,
      extractedText: content,
      mimeType: 'text/html',
      sourceUrl: normalizedUrl,
    };

    return NextResponse.json(attachment);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[scrape-url] Error:', msg);
    return NextResponse.json({ error: `Could not fetch URL: ${msg}` }, { status: 502 });
  }
}
