import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // No password set — skip the gate (local dev)
  if (!process.env.PREVIEW_PASSWORD) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get("hp-preview-auth");

  if (cookie?.value === "authenticated") {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: "/docs/:path*",
};
