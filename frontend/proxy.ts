import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    /*
     * Match everything EXCEPT:
     *   /login          — the sign-in page itself
     *   /api/auth/*     — NextAuth's own OAuth callbacks
     *   /_next/*        — Next.js internals (JS, CSS, images)
     *   /favicon.ico    — browser icon
     *   /*.svg|png|…    — public static assets
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
