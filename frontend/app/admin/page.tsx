"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

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
interface TimePoint {
  date: string;
  conversations: number;
  messages: number;
}
interface Stats {
  overview: Overview;
  users: UserStat[];
  recent_conversations: RecentConv[];
  timeseries: TimePoint[];
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
  } catch { return iso; }
}

function formatAxisDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch { return iso; }
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");
  const [exporting, setExporting] = useState<"users" | "conversations" | null>(null);

  const userEmail = session?.user?.email ?? null;
  const isAdmin   = userEmail ? ADMIN_EMAILS.has(userEmail.toLowerCase()) : false;

  const fetchStats = useCallback(async (from = fromDate, to = toDate) => {
    if (!userEmail) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from_date", from);
      if (to)   params.set("to_date", to);
      const res = await fetch(`${API_URL}/api/admin/stats?${params}`, {
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
  }, [userEmail, fromDate, toDate]);

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/login"); return; }
    if (status === "authenticated" && !isAdmin) { router.replace("/"); return; }
    if (status === "authenticated" && isAdmin) fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isAdmin]);

  const handleFilter = () => fetchStats(fromDate, toDate);
  const handleReset  = () => { setFromDate(""); setToDate(""); fetchStats("", ""); };

  const handleExport = async (type: "users" | "conversations") => {
    if (!userEmail) return;
    setExporting(type);
    try {
      const res = await fetch(`${API_URL}/api/admin/export/${type}`, {
        headers: { "X-User-Email": userEmail },
      });
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `plan-advisor-${type}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  };

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
          <button onClick={() => fetchStats()} className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Plan Advisor usage overview</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => fetchStats()} disabled={loading}
              className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-lg transition-colors disabled:opacity-50">
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button onClick={() => handleExport("users")} disabled={exporting === "users"}
              className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-lg transition-colors disabled:opacity-50">
              {exporting === "users" ? "Exporting…" : "Export Users CSV"}
            </button>
            <button onClick={() => handleExport("conversations")} disabled={exporting === "conversations"}
              className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-lg transition-colors disabled:opacity-50">
              {exporting === "conversations" ? "Exporting…" : "Export Convs CSV"}
            </button>
            <button onClick={() => router.push("/")}
              className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors">
              ← Back to app
            </button>
          </div>
        </div>

        {/* Date filter */}
        <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
          </div>
          <button onClick={handleFilter}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-sm rounded-lg transition-colors">
            Apply
          </button>
          {(fromDate || toDate) && (
            <button onClick={handleReset} className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-sm rounded-lg transition-colors">
              Reset
            </button>
          )}
          {(fromDate || toDate) && (
            <span className="text-xs text-indigo-400 self-center">
              Filtered: {fromDate || "start"} → {toDate || "today"}
            </span>
          )}
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Users"         value={stats.overview.total_users}         icon="👥" />
          <StatCard label="Conversations" value={stats.overview.total_conversations} icon="💬" />
          <StatCard label="Messages"      value={stats.overview.total_messages}      icon="✉️" />
          <StatCard label="Passengers"    value={stats.overview.total_passengers}    icon="🧳" />
        </div>

        {/* Activity chart */}
        {stats.timeseries.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-200 mb-3">Activity</h2>
            <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-5">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats.timeseries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gMsg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tickFormatter={formatAxisDate} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: "#94a3b8" }}
                    labelFormatter={(label) => formatAxisDate(String(label))}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
                  <Area type="monotone" dataKey="conversations" name="Conversations" stroke="#6366f1" fill="url(#gConv)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="messages"      name="Messages"      stroke="#a78bfa" fill="url(#gMsg)"  strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

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
                    <tr><td colSpan={5} className="text-center text-slate-600 py-8">No users yet</td></tr>
                  ) : stats.users.map((u) => (
                    <tr key={u.email} className="border-b border-slate-800/30 last:border-0 hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3 text-slate-300 font-mono text-xs">{u.email}</td>
                      <td className="px-5 py-3 text-right text-slate-400">{u.conversations}</td>
                      <td className="px-5 py-3 text-right text-slate-400">{u.messages}</td>
                      <td className="px-5 py-3 text-right text-slate-400">{u.passengers}</td>
                      <td className="px-5 py-3 text-right text-slate-500 text-xs">{formatDate(u.last_active)}</td>
                    </tr>
                  ))}
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
                    <tr><td colSpan={4} className="text-center text-slate-600 py-8">No conversations yet</td></tr>
                  ) : stats.recent_conversations.map((c) => (
                    <tr key={c.id} className="border-b border-slate-800/30 last:border-0 hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">{c.user_email}</td>
                      <td className="px-5 py-3 text-slate-300 max-w-xs truncate">{c.title}</td>
                      <td className="px-5 py-3 text-right text-slate-400">{c.message_count}</td>
                      <td className="px-5 py-3 text-right text-slate-500 text-xs whitespace-nowrap">{formatDate(c.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <p className="text-center text-slate-700 text-xs pb-4">Signed in as {userEmail}</p>
      </div>
    </div>
  );
}
