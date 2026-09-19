"use client";

import { signIn } from "next-auth/react";
import { Suspense } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

function AgentLoginCard() {
  const callbackUrl = "/agent/dashboard";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl" style={{ background: "#d4a01708" }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl" style={{ background: "#1e3a8a15" }} />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-8 shadow-2xl shadow-black/40">

          {/* Header */}
          <div className="flex flex-col items-center gap-3 mb-2">
            <BrandLogo size={48} />
            <span className="text-xs font-semibold px-3 py-1 rounded-full border" style={{ borderColor: "#d4a01740", color: "#d4a017", background: "#d4a01710" }}>
              Agent / Agency
            </span>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-lg font-bold text-white mt-3">Welcome back</h1>
            <p className="text-sm text-slate-500 mt-1">Sign in to manage your listings</p>
          </div>

          {/* Auth buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => signIn("google", { callbackUrl })}
              style={{ color: "#0F172A", background: "#ffffff", border: "1px solid #E2E8F0" }}
              className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl
                hover:bg-slate-50 font-medium text-sm transition-all duration-150 shadow-sm hover:shadow-md"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <button
              onClick={() => signIn("github", { callbackUrl })}
              style={{ color: "#ffffff", background: "#24292e", borderColor: "#1b1f23" }}
              className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl
                font-medium text-sm border hover:opacity-90 transition-all duration-150 shadow-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              Continue with GitHub
            </button>
          </div>

          <p className="text-center text-xs text-slate-600 mt-6">
            By signing in you agree to our terms of service
          </p>

          <div className="border-t border-slate-800 mt-5 pt-5 text-center">
            <p className="text-xs text-slate-500 mb-2">Not an agent yet?</p>
            <Link href="/register/agent" className="text-xs font-semibold transition-colors" style={{ color: "#d4a017" }}>
              Register as an Agent →
            </Link>
          </div>

          <div className="text-center mt-3">
            <Link href="/login" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
              ← Travelling instead? Sign in as traveller
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgentLoginPage() {
  return (
    <Suspense>
      <AgentLoginCard />
    </Suspense>
  );
}
