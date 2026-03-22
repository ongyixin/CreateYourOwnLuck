import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/social/crypto";
import { exchangeCodeForTokens, fetchFacebookPages } from "@/lib/social/token-exchange";
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

  const storedState = req.cookies.get("oauth_state_facebook")?.value;
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
    const tokens = await exchangeCodeForTokens("FACEBOOK", code);
    // Facebook: fetch all pages and create a connection per page
    const pages = await fetchFacebookPages(tokens.accessToken);

    for (const page of pages) {
      const pageToken = (page.metadata?.pageAccessToken as string | undefined) ?? tokens.accessToken;
      const encryptedAccess = await encryptToken(pageToken);

      await prisma.socialConnection.upsert({
        where: {
          userId_platform_platformAccountId: {
            userId: parsed.userId,
            platform: "FACEBOOK",
            platformAccountId: page.platformAccountId,
          },
        },
        update: {
          platformUsername: page.platformUsername,
          accessToken: encryptedAccess,
          expiresAt: tokens.expiresAt ?? null,
          scopes: tokens.scopes ?? null,
          metadata: page.metadata as Prisma.InputJsonValue ?? undefined,
        },
        create: {
          userId: parsed.userId,
          platform: "FACEBOOK",
          platformAccountId: page.platformAccountId,
          platformUsername: page.platformUsername,
          accessToken: encryptedAccess,
          expiresAt: tokens.expiresAt ?? null,
          scopes: tokens.scopes ?? null,
          metadata: page.metadata as Prisma.InputJsonValue ?? undefined,
        },
      });
    }

    settingsUrl.searchParams.set("connected", "facebook");
  } catch (err) {
    console.error("Facebook OAuth callback error:", err);
    settingsUrl.searchParams.set("error", "token_exchange_failed");
  }

  const response = NextResponse.redirect(settingsUrl);
  response.cookies.delete("oauth_state_facebook");
  return response;
}
