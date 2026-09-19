"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import BrandLogo from "@/components/BrandLogo";

export default function LandingNav() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated" && !!session;

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md border-b border-slate-800/60 bg-slate-950/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <Link href="/landing"><BrandLogo size={32} /></Link>
        <div className="flex items-center gap-3">
          <Link
            href="/explore"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors hidden sm:inline"
          >
            Explore →
          </Link>
          {isLoggedIn ? (
            <Link
              href="/"
              className="px-4 py-1.5 rounded-lg border border-[#1e3a8a]/70 text-[#d4a017] text-sm font-medium
                hover:bg-[#1e3a8a]/10 hover:border-[#1e3a8a] transition-colors duration-150"
            >
              Open Chat →
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-4 py-1.5 rounded-lg border border-[#1e3a8a]/70 text-[#d4a017] text-sm font-medium
                hover:bg-[#1e3a8a]/10 hover:border-[#1e3a8a] transition-colors duration-150"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
