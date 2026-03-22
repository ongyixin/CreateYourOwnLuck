import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { NextResponse } from "next/server";
import { buildAuthorizationUrl } from "@/lib/social/oauth-config";
import { createOAuthState, generateCodeVerifier } from "@/lib/social/oauth-state";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = createOAuthState(session.user.id);
  const codeVerifier = generateCodeVerifier();
  const url = buildAuthorizationUrl("TWITTER", state, codeVerifier);

  const response = NextResponse.redirect(url);
  response.cookies.set("oauth_state_twitter", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  // Store PKCE verifier for callback
  response.cookies.set("oauth_pkce_twitter", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
