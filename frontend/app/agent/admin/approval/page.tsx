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

interface AgentRow {
  id: number;
  user_email: string;
  agent_type: string;
  name: string;
  phone: string;
  phone_verified: boolean;
  location: string;
  description: string;
  specializations: string[];
  services_offered: string[];
  aadhaar_verified: boolean;
  aadhaar_last4: string;
  license_url: string;
  license_filename: string;
  approval_status: string;
  approval_note: string;
  approved_at: string | null;
  approved_by: string;
  created_at: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending_review: "bg-amber-900/30 text-amber-400 border-amber-700/40",
  approved:       "bg-green-900/30 text-green-400 border-green-700/40",
  rejected:       "bg-red-900/30 text-red-400 border-red-700/40",
};
const STATUS_LABEL: Record<string, string> = {
  pending_review: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export default function ApprovalQueuePage() {
  const agentEmail = useAgentEmail();
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState<Record<number, string>>({});
  const [processing, setProcessing] = useState<number | null>(null);

  const fetchAgents = async () => {
    if (!agentEmail) return;
    setLoading(true);
    try {
      const endpoint = tab === "pending" ? "/api/admin/agents/pending" : "/api/admin/agents/all";
      const res = await fetch(`${API}${endpoint}`, {
        headers: { "X-User-Email": agentEmail },
      });
      const data = await res.json();
      setAgents(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAgents(); }, [agentEmail, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const decide = async (id: number, action: "approve" | "reject") => {
    if (!agentEmail) return;
    setProcessing(id);
    try {
      const url = `${API}/api/admin/agents/${id}/${action}`;
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Email": agentEmail },
        body: JSON.stringify({ note: rejectNote[id] || "" }),
      });
      fetchAgents();
      setExpanded(null);
    } catch (e) { console.error(e); }
    finally { setProcessing(false as unknown as number); }
  };

  const pendingCount = agents.filter(a => a.approval_status === "pending_review").length;

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Agent Approval Queue</h1>
        <p className="text-slate-400 text-sm mt-0.5">Review and approve new travel agent registrations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-900 p-1 rounded-xl w-fit">
        <button onClick={() => setTab("pending")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${tab === "pending" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}>
          Pending
          {pendingCount > 0 && tab !== "pending" && (
            <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center" style={{ background: "#d4a017", color: "#000" }}>{pendingCount}</span>
          )}
        </button>
        <button onClick={() => setTab("all")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === "all" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}>
          All Agents
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-slate-300 font-semibold">
            {tab === "pending" ? "No agents pending review" : "No agents registered yet"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {agents.map(agent => {
            const isOpen = expanded === agent.id;
            const isPending = agent.approval_status === "pending_review";
            return (
              <div key={agent.id} className={`bg-slate-900 border rounded-xl transition-all ${isPending ? "border-amber-800/40" : "border-slate-800"}`}>
                {/* Header */}
                <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpanded(isOpen ? null : agent.id)}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0" style={{ background: "#1e3a8a" }}>
                    {agent.agent_type === "agency" ? "🏢" : "👤"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-semibold text-white">{agent.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[agent.approval_status] || STATUS_STYLES.pending_review}`}>
                        {STATUS_LABEL[agent.approval_status] || agent.approval_status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {agent.user_email} · {agent.location || "Location not set"}
                    </p>
                  </div>

                  {/* Verification badges */}
                  <div className="flex gap-1 shrink-0">
                    <span title="Phone verified" className={`text-xs px-1.5 py-0.5 rounded ${agent.phone_verified ? "bg-green-900/40 text-green-400" : "bg-slate-800 text-slate-600"}`}>
                      📱
                    </span>
                    <span title="Aadhaar verified" className={`text-xs px-1.5 py-0.5 rounded ${agent.aadhaar_verified ? "bg-green-900/40 text-green-400" : "bg-slate-800 text-slate-600"}`}>
                      🪪
                    </span>
                    <span title="License uploaded" className={`text-xs px-1.5 py-0.5 rounded ${agent.license_url ? "bg-green-900/40 text-green-400" : "bg-slate-800 text-slate-600"}`}>
                      📄
                    </span>
                  </div>

                  <span className="text-slate-600 text-xs ml-1">{isOpen ? "▲" : "▼"}</span>
                </div>

                {/* Expanded */}
                {isOpen && (
                  <div className="border-t border-slate-800 p-4 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      <div><p className="text-xs text-slate-500">Phone</p><p className="text-slate-200">{agent.phone}</p></div>
                      <div><p className="text-xs text-slate-500">Agent type</p><p className="text-slate-200 capitalize">{agent.agent_type}</p></div>
                      {agent.aadhaar_last4 && (
                        <div><p className="text-xs text-slate-500">Aadhaar</p><p className="text-slate-200">xxxx xxxx {agent.aadhaar_last4}</p></div>
                      )}
                      <div>
                        <p className="text-xs text-slate-500">Registered</p>
                        <p className="text-slate-200">{agent.created_at ? new Date(agent.created_at).toLocaleDateString("en-IN") : "—"}</p>
                      </div>
                    </div>

                    {/* Services */}
                    {agent.services_offered?.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1.5">Services offered</p>
                        <div className="flex flex-wrap gap-1.5">
                          {agent.services_offered.map(s => (
                            <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Specializations */}
                    {agent.specializations?.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1.5">Specializations</p>
                        <div className="flex flex-wrap gap-1.5">
                          {agent.specializations.map(s => (
                            <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-300">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {agent.description && (
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <p className="text-xs text-slate-400 leading-relaxed">{agent.description}</p>
                      </div>
                    )}

                    {/* License */}
                    {agent.license_url && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Travel License</p>
                        <a href={agent.license_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all">
                          📄 {agent.license_filename || "View license"}
                        </a>
                      </div>
                    )}

                    {/* Rejection note on rejected agents */}
                    {agent.approval_status === "rejected" && agent.approval_note && (
                      <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-3">
                        <p className="text-xs text-red-400 font-medium mb-1">Rejection reason</p>
                        <p className="text-xs text-red-300">{agent.approval_note}</p>
                      </div>
                    )}

                    {/* Action buttons for pending */}
                    {isPending && (
                      <div className="flex flex-col gap-3 pt-2 border-t border-slate-800">
                        <div className="flex gap-2">
                          <button onClick={() => decide(agent.id, "approve")}
                            disabled={processing === agent.id}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-700 hover:bg-green-600 transition-all disabled:opacity-50">
                            {processing === agent.id ? "Processing…" : "✓ Approve"}
                          </button>
                          <button onClick={() => decide(agent.id, "reject")}
                            disabled={processing === agent.id}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-800 hover:bg-red-700 transition-all disabled:opacity-50">
                            ✕ Reject
                          </button>
                        </div>
                        <textarea
                          value={rejectNote[agent.id] || ""}
                          onChange={e => setRejectNote(prev => ({ ...prev, [agent.id]: e.target.value }))}
                          placeholder="Rejection reason (required if rejecting)…"
                          rows={2}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-none" />
                      </div>
                    )}

                    {/* Re-decide buttons for already-decided agents */}
                    {!isPending && (
                      <div className="flex gap-2 pt-2 border-t border-slate-800">
                        {agent.approval_status !== "approved" && (
                          <button onClick={() => decide(agent.id, "approve")}
                            disabled={processing === agent.id}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-green-700/60 hover:bg-green-700 transition-all disabled:opacity-50">
                            ✓ Approve
                          </button>
                        )}
                        {agent.approval_status !== "rejected" && (
                          <button onClick={() => decide(agent.id, "reject")}
                            disabled={processing === agent.id}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-800/60 hover:bg-red-800 transition-all disabled:opacity-50">
                            ✕ Reject
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
