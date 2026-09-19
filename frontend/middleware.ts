export { auth as middleware } from "@/auth";

export const config = {
  // Protect everything except: auth API routes, static assets, and the login page itself
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)"],
};
