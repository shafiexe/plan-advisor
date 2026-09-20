"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type TravellerUser = {
  email: string;
  home_city: string;
  nationality: string;
  travel_style: string;
  currency: string;
  onboarding_done: boolean;
};

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<TravellerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!session?.user?.email) return;
    fetch(`${API}/api/agent/admin/users`, {
      headers: { "X-User-Email": session.user.email },
    })
      .then(r => r.json())
      .then(d => { setUsers(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session]);

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.home_city.toLowerCase().includes(search.toLowerCase())
  );

  const styleColor: Record<string, string> = {
    budget: "#4ade80",
    "mid-range": "#60a5fa",
    luxury: "#d4a017",
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">All Travellers</h1>
          <p className="text-sm text-slate-400 mt-0.5">{users.length} registered user{users.length !== 1 ? "s" : ""}</p>
        </div>
        <input
          type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by email or city…"
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-64" />
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-slate-500 text-sm py-10 text-center">
          {search ? "No users match your search." : "No travellers registered yet."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-slate-800">
              <tr className="text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Home City</th>
                <th className="px-4 py-3">Nationality</th>
                <th className="px-4 py-3">Travel Style</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3">Profile</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.email} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{u.email}</td>
                  <td className="px-4 py-3 text-slate-400">{u.home_city || "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{u.nationality || "—"}</td>
                  <td className="px-4 py-3">
                    {u.travel_style ? (
                      <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                        style={{ color: styleColor[u.travel_style] ?? "#94a3b8", background: `${styleColor[u.travel_style] ?? "#94a3b8"}15` }}>
                        {u.travel_style}
                      </span>
                    ) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{u.currency}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.onboarding_done ? "text-green-400 bg-green-400/10" : "text-slate-500 bg-slate-700/30"}`}>
                      {u.onboarding_done ? "Complete" : "Incomplete"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
