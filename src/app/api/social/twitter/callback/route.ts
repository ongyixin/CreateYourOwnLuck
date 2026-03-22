import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/social/crypto";
import { exchangeCodeForTokens, fetchTwitterProfile } from "@/lib/social/token-exchange";
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

  const storedState = req.cookies.get("oauth_state_twitter")?.value;
  const codeVerifier = req.cookies.get("oauth_pkce_twitter")?.value;

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
    const tokens = await exchangeCodeForTokens("TWITTER", code, codeVerifier);
    const profile = await fetchTwitterProfile(tokens.accessToken);

    const [encryptedAccess, encryptedRefresh] = await Promise.all([
      encryptToken(tokens.accessToken),
      tokens.refreshToken ? encryptToken(tokens.refreshToken) : Promise.resolve(null),
    ]);

    await prisma.socialConnection.upsert({
      where: {
        userId_platform_platformAccountId: {
          userId: parsed.userId,
          platform: "TWITTER",
          platformAccountId: profile.platformAccountId,
        },
      },
      update: {
        platformUsername: profile.platformUsername,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresAt: tokens.expiresAt ?? null,
        scopes: tokens.scopes ?? null,
      },
      create: {
        userId: parsed.userId,
        platform: "TWITTER",
        platformAccountId: profile.platformAccountId,
        platformUsername: profile.platformUsername,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresAt: tokens.expiresAt ?? null,
        scopes: tokens.scopes ?? null,
      },
    });

    settingsUrl.searchParams.set("connected", "twitter");
  } catch (err) {
    console.error("Twitter OAuth callback error:", err);
    settingsUrl.searchParams.set("error", "token_exchange_failed");
  }

  const response = NextResponse.redirect(settingsUrl);
  response.cookies.delete("oauth_state_twitter");
  response.cookies.delete("oauth_pkce_twitter");
  return response;
}
