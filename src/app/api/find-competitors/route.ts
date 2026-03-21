/**
 * POST /api/find-competitors
 *
 * Accepts { companyName, websiteUrl } and uses the configured AI provider
 * to suggest up to 3 real competitor website URLs.
 */

import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

const CompetitorsSchema = z.object({
  competitors: z
    .array(z.string().url())
    .min(1)
    .max(3)
    .describe("Array of competitor website URLs, each starting with https://"),
});

function getModel() {
  const provider = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    return createOpenAI({ apiKey })("gpt-4o-mini");
  }

  if (provider === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    return createAnthropic({ apiKey })("claude-sonnet-4-6");
  }

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    return createGoogleGenerativeAI({ apiKey })("gemini-2.5-flash");
  }

  throw new Error(`Unknown AI_PROVIDER "${provider}"`);
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { companyName, websiteUrl } = body as Record<string, string>;

  if (!companyName?.trim() || !websiteUrl?.trim()) {
    return NextResponse.json(
      { error: "companyName and websiteUrl are required" },
      { status: 400 }
    );
  }

  try {
    const result = await generateText({
      model: getModel() as Parameters<typeof generateText>[0]["model"],
      output: Output.object({ schema: CompetitorsSchema }),
      system:
        "You are a market research assistant. Your job is to identify real, well-known competitors for a given company. Always return valid, live website URLs that actually exist.",
      prompt: `Find up to 3 real direct competitors for this company:

Company name: ${companyName.trim()}
Website: ${websiteUrl.trim()}

Return the homepage URLs of their top competitors. Use your knowledge to provide accurate, real URLs (e.g. https://competitor.com). Do not invent or guess URLs — only include companies you are confident exist and compete directly in the same market.`,
      temperature: 0.2,
    });

    const parsed = result.output as { competitors: string[] };
    return NextResponse.json({ competitors: parsed.competitors });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
