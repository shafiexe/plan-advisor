"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const ADMIN_EMAILS = new Set(["shafi1379@gmail.com"]);
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Overview {
  total_users: number;
  total_conversations: number;
  total_messages: number;
  total_passengers: number;
}

interface UserStat {
  email: string;
  conversations: number;
  messages: number;
  passengers: number;
  last_active: string | null;
}

interface RecentConv {
  id: string;
  user_email: string;
  title: string;
  message_count: number;
  updated_at: string;
}

interface Stats {
  overview: Overview;
  users: UserStat[];
  recent_conversations: RecentConv[];
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-2xl shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-bold text-slate-100 mt-0.5">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userEmail = session?.user?.email ?? null;
  const isAdmin = userEmail ? ADMIN_EMAILS.has(userEmail.toLowerCase()) : false;

  const fetchStats = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { "X-User-Email": userEmail },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `HTTP ${res.status}`);
      }
      setStats(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/login"); return; }
    if (status === "authenticated" && !isAdmin) { router.replace("/"); return; }
    if (status === "authenticated" && isAdmin) fetchStats();
  }, [status, isAdmin, router, fetchStats]);

  if (status === "loading" || (loading && !stats)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading admin dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-md text-center">
          <p className="text-red-400 font-medium">Failed to load stats</p>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Plan Advisor usage overview</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700/60
                rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              ← Back to app
            </button>
          </div>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Users" value={stats.overview.total_users} icon="👥" />
          <StatCard label="Conversations" value={stats.overview.total_conversations} icon="💬" />
          <StatCard label="Messages" value={stats.overview.total_messages} icon="✉️" />
          <StatCard label="Passengers" value={stats.overview.total_passengers} icon="🧳" />
        </div>

        {/* Users table */}
        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-3">Users</h2>
          <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="text-left text-slate-500 font-medium px-5 py-3">Email</th>
                    <th className="text-right text-slate-500 font-medium px-5 py-3">Convs</th>
                    <th className="text-right text-slate-500 font-medium px-5 py-3">Messages</th>
                    <th className="text-right text-slate-500 font-medium px-5 py-3">Passengers</th>
                    <th className="text-right text-slate-500 font-medium px-5 py-3">Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-slate-600 py-8">No users yet</td>
                    </tr>
                  ) : (
                    stats.users.map((u) => (
                      <tr key={u.email} className="border-b border-slate-800/30 last:border-0 hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3 text-slate-300 font-mono text-xs">{u.email}</td>
                        <td className="px-5 py-3 text-right text-slate-400">{u.conversations}</td>
                        <td className="px-5 py-3 text-right text-slate-400">{u.messages}</td>
                        <td className="px-5 py-3 text-right text-slate-400">{u.passengers}</td>
                        <td className="px-5 py-3 text-right text-slate-500 text-xs">{formatDate(u.last_active)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Recent conversations */}
        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-3">Recent Conversations</h2>
          <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="text-left text-slate-500 font-medium px-5 py-3">User</th>
                    <th className="text-left text-slate-500 font-medium px-5 py-3">Title</th>
                    <th className="text-right text-slate-500 font-medium px-5 py-3">Messages</th>
                    <th className="text-right text-slate-500 font-medium px-5 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_conversations.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-slate-600 py-8">No conversations yet</td>
                    </tr>
                  ) : (
                    stats.recent_conversations.map((c) => (
                      <tr key={c.id} className="border-b border-slate-800/30 last:border-0 hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">{c.user_email}</td>
                        <td className="px-5 py-3 text-slate-300 max-w-xs truncate">{c.title}</td>
                        <td className="px-5 py-3 text-right text-slate-400">{c.message_count}</td>
                        <td className="px-5 py-3 text-right text-slate-500 text-xs whitespace-nowrap">{formatDate(c.updated_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <p className="text-center text-slate-700 text-xs pb-4">
          Signed in as {userEmail}
        </p>
      </div>
    </div>
  );
}
