"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const RZP_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";

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

type SubStatus = { plan: string; status: string; ends_at?: string | null };

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

const FEATURES = {
  agent_pro: [
    "Unlimited tour packages",
    "Unlimited ticket listings",
    "Unlimited visa services",
    "Priority listing in search",
    "AI draft generation (unlimited)",
    "Real-time chat with travellers",
    "Enquiry SMS & email notifications",
  ],
  free: [
    "Up to 10 tour packages",
    "Up to 10 ticket listings",
    "Up to 5 visa services",
    "Standard listing position",
    "5 AI drafts per month",
  ],
};

export default function SubscriptionPage() {
  const agentEmail = useAgentEmail();
  const [sub, setSub] = useState<SubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!agentEmail) return;
    fetch(`${API}/api/subscription/status`, {
      headers: { "X-User-Email": agentEmail },
    })
      .then(r => r.json())
      .then(d => { setSub(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [agentEmail]);

  const handleUpgrade = async () => {
    if (!agentEmail) return;
    setUpgrading(true);
    setError("");
    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Could not load payment gateway. Please try again.");

      const res = await fetch(`${API}/api/subscription/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Email": agentEmail },
        body: JSON.stringify({ plan_type: "agent_pro" }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Failed to create subscription"); }
      const data = await res.json();

      const rzp = new window.Razorpay({
        key: RZP_KEY,
        subscription_id: data.subscription_id,
        name: "PlanAdvisors",
        description: "Agent Pro — ₹50/month",
        prefill: { email: agentEmail },
        theme: { color: "#d4a017" },
        handler: () => {
          setSuccess("Payment successful! Your Pro plan is being activated. Refresh in a moment.");
          setSub({ plan: "agent_pro", status: "active" });
        },
        modal: {
          ondismiss: () => setUpgrading(false),
        },
      });
      rzp.on("payment.failed", (resp: { error: { description: string } }) => {
        setError(resp.error.description || "Payment failed. Please try again.");
        setUpgrading(false);
      });
      rzp.open();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An error occurred");
      setUpgrading(false);
    }
  };

  const handleCancel = async () => {
    if (!agentEmail || !confirm("Cancel your Pro subscription? Your plan stays active until the end of the billing period.")) return;
    setCancelling(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/subscription/cancel`, {
        method: "POST",
        headers: { "X-User-Email": agentEmail },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Cancel failed"); }
      setSub({ plan: "free", status: "free" });
      setSuccess("Subscription cancelled. You'll retain Pro access until your billing period ends.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setCancelling(false);
    }
  };

  const isPro = sub?.plan === "agent_pro" && sub?.status === "active";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Subscription</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your PlanAdvisors plan</p>
      </div>

      {error && <p style={{ color: "#f87171", fontSize: 14, background: "#450a0a40", border: "1px solid #7f1d1d", borderRadius: 8, padding: "8px 12px", marginBottom: 16 }}>{error}</p>}
      {success && <p style={{ color: "#4ade80", fontSize: 14, background: "#14532d40", border: "1px solid #166534", borderRadius: 8, padding: "8px 12px", marginBottom: 16 }}>{success}</p>}

      {loading ? (
        <div className="text-slate-500 text-sm">Loading…</div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Current plan badge */}
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Current plan</p>
              <p className="text-xl font-bold text-white">{isPro ? "Agent Pro" : "Free"}</p>
              {isPro && sub?.ends_at && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Renews {new Date(sub.ends_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
            </div>
            {isPro ? (
              <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "#d4a01720", color: "#d4a017", border: "1px solid #d4a01740" }}>
                PRO
              </span>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 999, background: "#1e293b", color: "#94a3b8", border: "1px solid #334155" }}>
                FREE
              </span>
            )}
          </div>

          {/* Plan comparison */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Free */}
            <div style={{ background: "#0f172a", border: `1px solid ${!isPro ? "#1d4ed8" : "#1e293b"}`, borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <p style={{ color: "#f1f5f9", fontWeight: 600 }}>Free</p>
                <p style={{ color: "#94a3b8", fontWeight: 700, fontSize: 18 }}>₹0<span style={{ fontSize: 12, fontWeight: 400, color: "#64748b" }}>/mo</span></p>
              </div>
              <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {FEATURES.free.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, color: "#94a3b8" }}>
                    <span style={{ color: "#475569", marginTop: 2 }}>—</span> {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro */}
            <div style={{ background: "#0f172a", border: `1px solid ${isPro ? "#d4a017" : "#1e293b"}`, borderRadius: 16, padding: 20, boxShadow: isPro ? "0 0 0 1px #d4a01740" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <p style={{ color: "#f1f5f9", fontWeight: 600 }}>Agent Pro</p>
                <p style={{ color: "#d4a017", fontWeight: 700, fontSize: 18 }}>₹50<span style={{ fontSize: 12, fontWeight: 400, color: "#64748b" }}>/mo</span></p>
              </div>
              <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {FEATURES.agent_pro.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, color: "#cbd5e1" }}>
                    <span style={{ color: "#d4a017", marginTop: 2 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action */}
          <div className="flex justify-end gap-3">
            {isPro ? (
              <button onClick={handleCancel} disabled={cancelling}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-400 border border-slate-700 hover:border-red-800 hover:text-red-400 transition-all disabled:opacity-50">
                {cancelling ? "Cancelling…" : "Cancel Subscription"}
              </button>
            ) : (
              <button onClick={handleUpgrade} disabled={upgrading}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-black transition-all disabled:opacity-50"
                style={{ background: "#d4a017" }}>
                {upgrading ? "Opening payment…" : "Upgrade to Pro — ₹50/month"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
