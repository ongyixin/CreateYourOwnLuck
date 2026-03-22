/**
 * Exchanging OAuth authorization codes for access tokens, per platform.
 */

import { getOAuthConfig } from "./oauth-config";
import type { SocialPlatform } from "@/lib/types";

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string;
}

export interface PlatformProfile {
  platformAccountId: string;
  platformUsername: string;
  metadata?: Record<string, unknown>;
}

export async function exchangeCodeForTokens(
  platform: SocialPlatform,
  code: string,
  codeVerifier?: string
): Promise<TokenResponse> {
  const config = getOAuthConfig(platform);

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.callbackUrl,
    client_id: config.clientId,
  });

  if (platform === "TWITTER" && codeVerifier) {
    body.set("code_verifier", codeVerifier);
    // Twitter uses Basic auth for client credentials
  } else {
    body.set("client_secret", config.clientSecret);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (platform === "TWITTER") {
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
    headers["Authorization"] = `Basic ${credentials}`;
  }

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Token exchange failed for ${platform}: ${error}`);
  }

  const data = await res.json();

  let expiresAt: Date | undefined;
  if (data.expires_in) {
    expiresAt = new Date(Date.now() + data.expires_in * 1000);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
    scopes: data.scope,
  };
}

/** OpenID UserInfo — use with openid + profile (+ email) scopes (not legacy r_liteprofile). */
export async function fetchLinkedInProfile(accessToken: string): Promise<PlatformProfile> {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch LinkedIn profile: ${err}`);
  }
  const data = (await res.json()) as {
    sub: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    email?: string;
  };
  const displayName =
    (data.name?.trim() ||
      [data.given_name, data.family_name].filter(Boolean).join(" ").trim() ||
      data.email?.trim() ||
      "LinkedIn member") ?? "LinkedIn member";
  return {
    platformAccountId: data.sub,
    platformUsername: displayName,
  };
}

export async function fetchTwitterProfile(accessToken: string): Promise<PlatformProfile> {
  const res = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch Twitter profile");
  const data = await res.json();
  return {
    platformAccountId: data.data.id as string,
    platformUsername: `@${data.data.username}`,
  };
}

export async function fetchFacebookPages(accessToken: string): Promise<PlatformProfile[]> {
  // Exchange user token for long-lived token first
  const config = getOAuthConfig("FACEBOOK");
  const ltRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${config.clientId}&client_secret=${config.clientSecret}&fb_exchange_token=${accessToken}`
  );
  const ltData = ltRes.ok ? await ltRes.json() : { access_token: accessToken };
  const longLivedToken = ltData.access_token as string;

  // Fetch pages the user manages
  const pagesRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedToken}`
  );
  if (!pagesRes.ok) throw new Error("Failed to fetch Facebook pages");
  const pagesData = await pagesRes.json();

  if (!pagesData.data?.length) {
    // Fall back to personal profile if no pages
    const meRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${longLivedToken}`);
    const meData = meRes.ok ? await meRes.json() : { id: "unknown", name: "Personal" };
    return [{
      platformAccountId: meData.id as string,
      platformUsername: meData.name as string,
      metadata: { type: "personal", accessToken: longLivedToken },
    }];
  }

  return (pagesData.data as Array<{ id: string; name: string; access_token: string }>).map((page) => ({
    platformAccountId: page.id,
    platformUsername: page.name,
    metadata: { type: "page", pageAccessToken: page.access_token },
  }));
}
