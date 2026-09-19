import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!req.auth) {
    const landingUrl = new URL("/landing", req.nextUrl.origin);
    return NextResponse.redirect(landingUrl);
  }
});

export const config = {
  matcher: [
    /*
     * Match everything EXCEPT:
     *   /landing        — the public marketing page (no auth needed)
     *   /login          — the sign-in page itself
     *   /share/*        — public shared conversation links (no auth needed)
     *   /api/auth/*     — NextAuth's own OAuth callbacks
     *   /_next/*        — Next.js internals (JS, CSS, images)
     *   /favicon.ico    — browser icon
     *   /*.svg|png|…    — public static assets
     */
    "/((?!landing|login|share|api/auth|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
