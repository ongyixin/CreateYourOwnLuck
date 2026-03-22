import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/auth/signin",
  "/auth/verify-request",
  "/api/auth",
  "/api/webhooks",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublic(pathname)) return NextResponse.next();

  const token = await getToken({ req: request });

  // Unauthenticated → redirect to sign-in
  if (!token) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Admin-only routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/analyze/:path*",
    "/processing/:path*",
    "/report/:path*",
    "/reports/:path*",
    "/admin/:path*",
    "/api/analyze/:path*",
    "/api/report/:path*",
    "/api/reports/:path*",
    "/api/status/:path*",
    "/api/export/:path*",
    "/api/find-competitors/:path*",
    "/api/parse-pdf/:path*",
    "/api/persona-chat/:path*",
    "/api/focus-group/:path*",
    "/experiment/:path*",
    "/api/experiment/:path*",
    "/api/checkout/:path*",
    "/api/admin/:path*",
  ],
};
