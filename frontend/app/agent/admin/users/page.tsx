"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function useAgentEmail() {
  const { data: session } = useSession();
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    if (session?.user?.email) { setEmail(session.user.email); return; }
    try {
      const raw = localStorage.getItem("pa_agent_session");
      if (raw) { const s = JSON.parse(raw); if (s.email) setEmail(s.email); }
    } catch {}
  }, [session]);
  return email;
}

type TravellerUser = {
  email: string;
  home_city: string;
  nationality: string;
  travel_style: string;
  currency: string;
  onboarding_done: boolean;
};

export default function AdminUsersPage() {
  const agentEmail = useAgentEmail();
  const [users, setUsers] = useState<TravellerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!agentEmail) return;
    fetch(`${API}/api/agent/admin/users`, {
      headers: { "X-User-Email": agentEmail ?? "" },
    })
      .then(r => r.json())
      .then(d => { setUsers(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [agentEmail]);

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
          style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "8px 12px", fontSize: 14, color: "#e2e8f0", outline: "none", width: 256 }} />
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-slate-500 text-sm py-10 text-center">
          {search ? "No users match your search." : "No travellers registered yet."}
        </div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 16, border: "1px solid #1e293b" }}>
          <table className="w-full text-sm text-left">
            <thead style={{ borderBottom: "1px solid #1e293b" }}>
              <tr style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
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
                <tr key={u.email} style={{ borderBottom: "1px solid #1e293b20" }}>
                  <td className="px-4 py-3" style={{ color: "#f1f5f9", fontWeight: 500 }}>{u.email}</td>
                  <td className="px-4 py-3" style={{ color: "#94a3b8" }}>{u.home_city || "—"}</td>
                  <td className="px-4 py-3" style={{ color: "#94a3b8" }}>{u.nationality || "—"}</td>
                  <td className="px-4 py-3">
                    {u.travel_style ? (
                      <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                        style={{ color: styleColor[u.travel_style] ?? "#94a3b8", background: `${styleColor[u.travel_style] ?? "#94a3b8"}15` }}>
                        {u.travel_style}
                      </span>
                    ) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3" style={{ color: "#94a3b8" }}>{u.currency}</td>
                  <td className="px-4 py-3">
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, color: u.onboarding_done ? "#4ade80" : "#64748b", background: u.onboarding_done ? "#4ade8015" : "#1e293b50" }}>
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
