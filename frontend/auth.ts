import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          // "select_account" lets users pick their account but skips
          // the passkey/re-consent challenge on every OAuth redirect.
          // Change to "none" to silently reuse the active Google session.
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    GitHub,
  ],

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,   // 30 days — users stay logged in
    updateAge: 24 * 60 * 60,      // Refresh token once per day
  },

  callbacks: {
    // Keep the user's id, name, email, and image in the JWT
    jwt({ token, user }) {
      if (user) {
        token.id    = user.id;
        token.name  = user.name;
        token.email = user.email;
        token.picture = (user as { image?: string }).image ?? token.picture;
      }
      return token;
    },

    // Surface that data in the session object (available to useSession())
    session({ session, token }) {
      if (session.user) {
        session.user.id    = token.id    as string;
        session.user.name  = token.name  as string;
        session.user.email = token.email as string;
        session.user.image = token.picture as string | undefined;
      }
      return session;
    },

    // Route guard — anyone with a valid session can proceed
    authorized({ auth: session }) {
      return !!session;
    },
  },

  // Trustworthy cookie settings for local dev and production
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
});
