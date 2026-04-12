import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Role } from "@prisma/client";

const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

export async function middleware(req: NextRequest) {
  if (!secret) {
    return NextResponse.next();
  }

  // Sur HTTPS (Vercel), Auth.js pose __Secure-authjs.session-token ; sans secureCookie: true, getToken cherchait authjs.session-token → jamais de session.
  const secureCookie = req.nextUrl.protocol === "https:";
  const token = await getToken({ req, secret, secureCookie });
  const { pathname } = req.nextUrl;
  const role = token?.role as Role | undefined;

  if (pathname.startsWith("/app")) {
    if (!token) {
      return NextResponse.redirect(new URL("/auth/login?session=required", req.url));
    }
    if (role !== "STUDENT") {
      return NextResponse.redirect(new URL("/auth/login?error=role", req.url));
    }
  }

  if (pathname.startsWith("/parent")) {
    if (!token) {
      return NextResponse.redirect(new URL("/auth/login?session=required", req.url));
    }
    if (role !== "PARENT") {
      return NextResponse.redirect(new URL("/auth/login?error=role", req.url));
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/auth/login?session=required", req.url));
    }
    if (role !== "ADMIN" && role !== "CORRECTOR") {
      return NextResponse.redirect(new URL("/auth/login?error=role", req.url));
    }
  }

  if (pathname.startsWith("/onboarding")) {
    if (!token) {
      return NextResponse.redirect(new URL("/auth/login?session=required", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/parent/:path*", "/admin/:path*", "/onboarding/:path*"],
};
