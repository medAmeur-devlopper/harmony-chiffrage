import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/share", "/403"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  // Lightweight cookie-presence check only — the Edge runtime can't reach Prisma.
  // Full session validation (expiry, isActive) happens server-side via getSession()/requireAuth().
  const token = request.cookies.get("session_token")?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
