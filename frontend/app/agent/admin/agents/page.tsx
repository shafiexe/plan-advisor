"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type AgentProfile = {
  id: number;
  user_email: string;
  name: string;
  agent_type: string;
  phone: string;
  location: string;
  is_active: boolean;
  phone_verified: boolean;
  experience_years: number;
  specializations: string[];
  created_at: string | null;
};

type CreateForm = {
  user_email: string;
  agent_type: "agency" | "individual";
  name: string;
  phone: string;
  location: string;
  description: string;
};

const emptyForm: CreateForm = {
  user_email: "",
  agent_type: "individual",
  name: "",
  phone: "",
  location: "",
  description: "",
};

export default function AdminAgentsPage() {
  const { data: session } = useSession();
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const headers = { "X-User-Email": session?.user?.email ?? "" };

  async function load() {
    setLoading(true);
    const res = await fetch(`${API}/api/agent/admin/agents`, { headers });
    if (res.ok) setAgents(await res.json());
    setLoading(false);
  }

  useEffect(() => { if (session?.user?.email) load(); }, [session]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`${API}/api/agent/admin/agents`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setForm(emptyForm);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.detail ?? "Failed to create agent");
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">All Agents</h1>
          <p className="text-sm text-slate-400 mt-0.5">{agents.length} registered agent{agents.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(""); }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: "#d4a017" }}>
          + Create Agent
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-6 bg-slate-900 border border-slate-700 rounded-2xl p-5">
          <h2 className="text-base font-semibold text-white mb-4">Create Agent Profile</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">User Email *</label>
              <input
                required type="email" value={form.user_email}
                onChange={e => setForm(f => ({ ...f, user_email: e.target.value }))}
                placeholder="agent@email.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Name *</label>
              <input
                required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Agent or Agency name"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Phone *</label>
              <input
                required value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+91 99999 00000"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Type *</label>
              <select
                value={form.agent_type}
                onChange={e => setForm(f => ({ ...f, agent_type: e.target.value as "agency" | "individual" }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                <option value="individual">Individual</option>
                <option value="agency">Agency</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Location</label>
              <input
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="City, State"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Description</label>
              <textarea
                value={form.description} rows={2}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Short bio / about"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none" />
            </div>
            {error && <p className="sm:col-span-2 text-sm text-red-400">{error}</p>}
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "#1e3a8a" }}>
                {saving ? "Creating…" : "Create Agent"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-5 py-2 rounded-xl text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Agents table */}
      {loading ? (
        <div className="text-slate-500 text-sm">Loading…</div>
      ) : agents.length === 0 ? (
        <div className="text-slate-500 text-sm py-10 text-center">No agents registered yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-slate-800">
              <tr className="text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(a => (
                <tr key={a.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{a.name}</td>
                  <td className="px-4 py-3 text-slate-400">{a.user_email}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{
                      background: a.agent_type === "agency" ? "#1e3a8a30" : "#d4a01720",
                      color: a.agent_type === "agency" ? "#93c5fd" : "#d4a017",
                    }}>{a.agent_type}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{a.phone}</td>
                  <td className="px-4 py-3 text-slate-400">{a.location || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_active ? "text-green-400 bg-green-400/10" : "text-slate-500 bg-slate-700/30"}`}>
                      {a.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {a.created_at ? new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
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
