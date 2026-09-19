"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SPECIALIZATIONS = [
  "All", "adventure", "family", "honeymoon", "pilgrimage", "beach", "cultural", "wildlife", "budget", "trekking", "international", "domestic"
];
const AGENT_TYPES = ["All", "agency", "individual"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

function AgentsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [agents, setAgents] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [specialization, setSpecialization] = useState(searchParams.get("specialization") || "All");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [agentType, setAgentType] = useState(searchParams.get("agent_type") || "All");

  const fetchAgents = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (specialization && specialization !== "All") params.set("specialization", specialization);
    if (location) params.set("location", location);
    if (agentType && agentType !== "All") params.set("agent_type", agentType);

    router.replace(`/explore/agents?${params.toString()}`, { scroll: false });

    fetch(`${API}/api/explore/agents?${params.toString()}`)
      .then(r => r.json())
      .then(data => setAgents(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [specialization, location, agentType, router]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Travel Agents</h1>
        <p className="text-slate-400 text-sm mt-1">Connect with verified travel agents and agencies</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 space-y-3">
        <div className="flex flex-wrap gap-3">
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Search by location..."
            className="flex-1 min-w-40 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-600"
          />
          <select
            value={agentType}
            onChange={e => setAgentType(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-600"
          >
            {AGENT_TYPES.map(t => <option key={t} value={t}>{t === "All" ? "All types" : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        {/* Specialization pills */}
        <div className="flex flex-wrap gap-2">
          {SPECIALIZATIONS.map(s => (
            <button key={s} onClick={() => setSpecialization(s)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all border"
              style={specialization === s
                ? { background: "#1e3a8a", color: "#fff", borderColor: "#1e3a8a" }
                : { borderColor: "#334155", color: "#94a3b8" }}>
              {s === "All" ? "All specializations" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {!loading && <p className="text-xs text-slate-500 mb-4">{agents.length} agent{agents.length !== 1 ? "s" : ""} found</p>}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🧳</div>
          <h3 className="text-lg font-semibold text-white mb-2">No agents found</h3>
          <p className="text-sm text-slate-400 mb-4">Try adjusting your filters</p>
          <button
            onClick={() => { setSpecialization("All"); setLocation(""); setAgentType("All"); }}
            className="text-sm px-4 py-2 rounded-lg text-white" style={{ background: "#1e3a8a" }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(a => (
            <Link key={a.id} href={`/explore/agents/${a.slug}`}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-600 transition-all">
              <div className="flex items-center gap-3 mb-3">
                {a.logo_url
                  ? <img src={a.logo_url} alt={a.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  : <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-lg" style={{ background: "#1e3a8a" }}>
                      {a.name?.[0]?.toUpperCase() || "A"}
                    </div>
                }
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{a.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 capitalize">{a.agent_type || a.type}</span>
                    {a.is_verified && <span className="text-xs text-green-400">✓ Verified</span>}
                  </div>
                </div>
              </div>

              {a.location && <p className="text-xs text-slate-400 mb-2">📍 {a.location}</p>}

              {/* Specializations */}
              {a.specializations?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {a.specializations.slice(0, 3).map((s: string) => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-300 capitalize">{s}</span>
                  ))}
                  {a.specializations.length > 3 && (
                    <span className="text-xs text-slate-500">+{a.specializations.length - 3}</span>
                  )}
                </div>
              )}

              {/* Listing counts */}
              <div className="flex gap-3 text-xs text-slate-500">
                {(a.packages_count ?? a._packages_count) != null && <span>{a.packages_count ?? a._packages_count} packages</span>}
                {(a.tickets_count ?? a._tickets_count) != null && <span>{a.tickets_count ?? a._tickets_count} tickets</span>}
                {(a.visa_count ?? a._visa_count) != null && <span>{a.visa_count ?? a._visa_count} visa</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AgentsPage() {
  return (
    <Suspense fallback={<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}</div>}>
      <AgentsPageInner />
    </Suspense>
  );
}
