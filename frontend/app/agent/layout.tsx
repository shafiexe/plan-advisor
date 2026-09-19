"use client";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const NAV = [
  { href: "/agent/dashboard", icon: "📊", label: "Dashboard" },
  { href: "/agent/packages", icon: "🌍", label: "Tour Packages" },
  { href: "/agent/tickets",  icon: "🎫", label: "Tickets" },
  { href: "/agent/visa",     icon: "🛂", label: "Visa Services" },
  { href: "/agent/profile",  icon: "👤", label: "Profile" },
];

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isAgent, setIsAgent] = useState<boolean | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login?callbackUrl=/agent/dashboard"); return; }
    if (status === "authenticated" && session?.user?.email) {
      fetch(`${API}/api/agent/check`, { headers: { "X-User-Email": session.user.email } })
        .then(r => r.json())
        .then(d => {
          if (!d.is_agent) router.push("/register/agent");
          else setIsAgent(true);
        })
        .catch(() => router.push("/register/agent"));
    }
  }, [status, session, router]);

  if (status === "loading" || isAgent === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex gap-2 items-center text-slate-400">
          <div className="w-4 h-4 border-2 border-slate-600 border-t-[#d4a017] rounded-full animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: "#172554" }}>
        <div className="p-4 border-b border-white/10">
          <Link href="/"><BrandLogo size={28} /></Link>
          <p className="text-xs text-blue-300/60 mt-2 truncate">{session?.user?.email}</p>
        </div>

        <nav className="flex flex-col gap-1 p-3 flex-1">
          {NAV.map(item => {
            const active = pathname === item.href || (item.href !== "/agent/dashboard" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${active ? "text-white border-l-2 border-[#d4a017]" : "text-blue-200/60 hover:text-white hover:bg-white/5"}`}
                style={active ? { background: "#1e3a8a60" } : {}}>
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <Link href="/" className="flex items-center gap-2 px-3 py-2 text-xs text-blue-300/50 hover:text-blue-200 rounded-lg hover:bg-white/5 transition-all">
            ← Back to Chat
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
