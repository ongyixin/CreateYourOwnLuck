import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { NextResponse } from "next/server";
import { buildAuthorizationUrl } from "@/lib/social/oauth-config";
import { createOAuthState } from "@/lib/social/oauth-state";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = createOAuthState(session.user.id);
  const url = buildAuthorizationUrl("FACEBOOK", state);

  const response = NextResponse.redirect(url);
  response.cookies.set("oauth_state_facebook", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
