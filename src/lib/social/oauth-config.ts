/**
 * OAuth configuration per platform.
 * All redirect URIs use NEXTAUTH_URL as the base.
 */

import type { SocialPlatform } from "@/lib/types";

export interface OAuthConfig {
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  usePKCE: boolean;
}

export function getOAuthConfig(platform: SocialPlatform): OAuthConfig {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const callbackUrl = `${base}/api/social/${platform.toLowerCase()}/callback`;

  switch (platform) {
    case "LINKEDIN":
      return {
        authorizationUrl: "https://www.linkedin.com/oauth/v2/authorization",
        tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
        // OpenID Connect (Sign In with LinkedIn) + posting (Share on LinkedIn product).
        // Legacy r_liteprofile / r_emailaddress cause unauthorized_scope_error on new apps.
        scopes: ["openid", "profile", "email", "w_member_social"],
        clientId: process.env.LINKEDIN_CLIENT_ID ?? "",
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
        callbackUrl,
        usePKCE: false,
      };

    case "TWITTER":
      return {
        authorizationUrl: "https://twitter.com/i/oauth2/authorize",
        tokenUrl: "https://api.twitter.com/2/oauth2/token",
        scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
        clientId: process.env.TWITTER_CLIENT_ID ?? "",
        clientSecret: process.env.TWITTER_CLIENT_SECRET ?? "",
        callbackUrl,
        usePKCE: true,
      };

    case "FACEBOOK":
      return {
        authorizationUrl: "https://www.facebook.com/v19.0/dialog/oauth",
        tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
        scopes: ["pages_manage_posts", "pages_read_engagement", "pages_show_list"],
        clientId: process.env.FACEBOOK_APP_ID ?? "",
        clientSecret: process.env.FACEBOOK_APP_SECRET ?? "",
        callbackUrl,
        usePKCE: false,
      };
  }
}

export function buildAuthorizationUrl(
  platform: SocialPlatform,
  state: string,
  codeVerifier?: string
): string {
  const config = getOAuthConfig(platform);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    scope: config.scopes.join(" "),
    state,
  });

  if (config.usePKCE && codeVerifier) {
    // For Twitter PKCE: derive code_challenge from verifier
    params.set("code_challenge_method", "plain");
    params.set("code_challenge", codeVerifier);
  }

  return `${config.authorizationUrl}?${params.toString()}`;
}
