import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/constants";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-only-secret-change-me-please-32chars-min",
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (pathname === "/admin/login") return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch {
      // fallthrough
    }
  }

  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*"],
};
