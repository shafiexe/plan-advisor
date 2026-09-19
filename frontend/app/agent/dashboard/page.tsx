"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface RecentPackage { id: number; title: string; status: string; destinations: string[]; }
interface Stats {
  packages: number;
  published_packages: number;
  tickets: number;
  visa: number;
  enquiries: number;
  recent_packages: RecentPackage[];
}

export default function AgentDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.email) return;
    const headers = { "X-User-Email": session.user.email };
    fetch(`${API}/api/agent/dashboard/stats`, { headers })
      .then(r => r.json()).then(setStats).catch(console.error).finally(() => setLoading(false));
    fetch(`${API}/api/agent/check`, { headers })
      .then(r => r.json())
      .then(d => {
        if (d.profile?.id && d.profile?.name) {
          const base = d.profile.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
          setProfileSlug(`${base}-${d.profile.id}`);
        }
      }).catch(console.error);
  }, [session]);

  const STAT_CARDS = [
    { label: "Total Packages", value: stats?.packages ?? 0, sub: `${stats?.published_packages ?? 0} published`, icon: "🌍", href: "/agent/packages" },
    { label: "Active Tickets", value: stats?.tickets ?? 0, sub: "upcoming trips", icon: "🎫", href: "/agent/tickets" },
    { label: "Visa Services", value: stats?.visa ?? 0, sub: "active listings", icon: "🛂", href: "/agent/visa" },
    { label: "Enquiries", value: stats?.enquiries ?? 0, sub: "new messages", icon: "💬", href: "/agent/enquiries" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your listings and track performance</p>
        </div>
        {profileSlug && (
          <Link href={`/explore/agents/${profileSlug}`}
            className="shrink-0 text-xs px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all">
            🌐 View public profile
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map(card => (
          <Link key={card.label} href={card.href}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all group">
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="text-2xl font-bold text-white">
              {loading ? <div className="h-7 w-12 bg-slate-800 rounded animate-pulse" /> : card.value}
            </div>
            <div className="text-xs font-semibold text-slate-300 mt-0.5">{card.label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{card.sub}</div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "+ New Package", href: "/agent/packages/new", gold: true },
            { label: "+ New Ticket", href: "/agent/tickets/new" },
            { label: "+ New Visa", href: "/agent/visa/new" },
          ].map(a => (
            <Link key={a.href} href={a.href}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={a.gold ? { background: "#d4a017", color: "#000" } : { background: "#1e3a8a", color: "#fff" }}>
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Recent packages */}
      {(stats?.recent_packages?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Recent Packages</h2>
          <div className="flex flex-col gap-2">
            {stats!.recent_packages.map(p => (
              <Link key={p.id} href={`/agent/packages/${p.id}/edit`}
                className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 hover:border-slate-700 transition-all">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{p.title}</p>
                  <p className="text-xs text-slate-500">{p.destinations?.join(", ")}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${p.status === "published" ? "bg-green-900/40 text-green-400" : "bg-slate-800 text-slate-400"}`}>
                  {p.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
