import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/social/crypto";
import { exchangeCodeForTokens, fetchLinkedInProfile } from "@/lib/social/token-exchange";
import { parseOAuthState } from "@/lib/social/oauth-state";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const settingsUrl = new URL("/settings/connections", req.url);

  if (error || !code || !state) {
    settingsUrl.searchParams.set("error", error ?? "oauth_cancelled");
    return NextResponse.redirect(settingsUrl);
  }

  // Validate state cookie
  const storedState = req.cookies.get("oauth_state_linkedin")?.value;
  if (!storedState || storedState !== state) {
    settingsUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  const parsed = parseOAuthState(state);
  if (!parsed) {
    settingsUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const tokens = await exchangeCodeForTokens("LINKEDIN", code);
    const profile = await fetchLinkedInProfile(tokens.accessToken);

    const [encryptedAccess, encryptedRefresh] = await Promise.all([
      encryptToken(tokens.accessToken),
      tokens.refreshToken ? encryptToken(tokens.refreshToken) : Promise.resolve(null),
    ]);

    await prisma.socialConnection.upsert({
      where: {
        userId_platform_platformAccountId: {
          userId: parsed.userId,
          platform: "LINKEDIN",
          platformAccountId: profile.platformAccountId,
        },
      },
      update: {
        platformUsername: profile.platformUsername,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresAt: tokens.expiresAt ?? null,
        scopes: tokens.scopes ?? null,
        metadata: profile.metadata as Prisma.InputJsonValue ?? undefined,
      },
      create: {
        userId: parsed.userId,
        platform: "LINKEDIN",
        platformAccountId: profile.platformAccountId,
        platformUsername: profile.platformUsername,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresAt: tokens.expiresAt ?? null,
        scopes: tokens.scopes ?? null,
        metadata: profile.metadata as Prisma.InputJsonValue ?? undefined,
      },
    });

    settingsUrl.searchParams.set("connected", "linkedin");
  } catch (err) {
    console.error("LinkedIn OAuth callback error:", err);
    settingsUrl.searchParams.set("error", "token_exchange_failed");
  }

  const response = NextResponse.redirect(settingsUrl);
  response.cookies.delete("oauth_state_linkedin");
  return response;
}
