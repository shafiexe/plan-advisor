"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const RZP_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";

const TRAVEL_STYLES = ["budget", "mid-range", "luxury", "backpacker", "adventure", "family"];
const CURRENCIES = ["INR", "USD", "AED", "EUR", "GBP", "SAR", "QAR", "KWD", "OMR", "SGD", "MYR", "THB"];

const inputSty = {
  width: "100%", background: "#1e293b", border: "1px solid #334155",
  borderRadius: 12, padding: "10px 16px", fontSize: 14, color: "#e2e8f0",
  outline: "none", boxSizing: "border-box" as const,
};
const labelSty = {
  display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 500,
  textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global { interface Window { Razorpay: any } }

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

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [upgradeError, setUpgradeError] = useState("");

  const [nationality, setNationality] = useState("India");
  const [homeCity, setHomeCity] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [travelStyle, setTravelStyle] = useState("");
  const [passportExpiry, setPassportExpiry] = useState("");
  const [subPlan, setSubPlan] = useState("free");

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (!session?.user?.email) return;
    const headers = { "X-User-Email": session.user.email };
    Promise.all([
      fetch(`${API}/api/user/preferences`, { headers }).then(r => r.json()),
      fetch(`${API}/api/subscription/status`, { headers }).then(r => r.json()),
    ]).then(([prefs, sub]) => {
      setNationality(prefs.nationality || "India");
      setHomeCity(prefs.home_city || "");
      setCurrency(prefs.currency || "INR");
      setTravelStyle(prefs.travel_style || "");
      setPassportExpiry(prefs.passport_expiry || "");
      setSubPlan(sub.plan || "free");
    }).catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, [session, status, router]);

  const handleUpgrade = async () => {
    if (!session?.user?.email) return;
    setUpgrading(true); setUpgradeError("");
    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Could not load payment gateway. Please try again.");

      const res = await fetch(`${API}/api/subscription/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Email": session.user.email },
        body: JSON.stringify({ plan_type: "traveller_pro" }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to create subscription");
      }
      const data = await res.json();

      const rzp = new window.Razorpay({
        key: RZP_KEY,
        subscription_id: data.subscription_id,
        name: "PlanAdvisors",
        description: "Traveller Pro — ₹50/month",
        prefill: { email: session.user.email },
        theme: { color: "#d4a017" },
        handler: () => {
          setSubPlan("traveller_pro");
          setUpgradeError("");
        },
        modal: { ondismiss: () => setUpgrading(false) },
      });
      rzp.on("payment.failed", (resp: { error?: { description?: string } }) => {
        setUpgradeError(resp?.error?.description || "Payment failed. Please try again.");
        setUpgrading(false);
      });
      rzp.open();
    } catch (e: unknown) {
      setUpgradeError(e instanceof Error ? e.message : "An error occurred");
      setUpgrading(false);
    }
  };

  const save = async () => {
    if (!session?.user?.email) return;
    setSaving(true); setError(""); setSuccess(false);
    try {
      const res = await fetch(`${API}/api/user/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-User-Email": session.user.email },
        body: JSON.stringify({ nationality, home_city: homeCity, currency, travel_style: travelStyle, passport_expiry: passportExpiry }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally { setSaving(false); }
  };

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#020817", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="w-8 h-8 border-2 border-[#d4a017] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#020817", color: "#e2e8f0" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 16px 64px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <button onClick={() => router.push("/")} style={{ color: "#64748b", fontSize: 14, background: "none", border: "none", cursor: "pointer" }}>← Back</button>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: "#f1f5f9", fontSize: 24, fontWeight: 700, margin: 0 }}>Your Profile</h1>
            <p style={{ color: "#64748b", fontSize: 13, margin: "2px 0 0" }}>{session?.user?.email}</p>
          </div>
        </div>

        {error && <p style={{ color: "#f87171", fontSize: 14, background: "#450a0a40", border: "1px solid #7f1d1d", borderRadius: 8, padding: "8px 12px", marginBottom: 16 }}>{error}</p>}
        {success && <p style={{ color: "#4ade80", fontSize: 14, background: "#14532d40", border: "1px solid #166534", borderRadius: 8, padding: "8px 12px", marginBottom: 16 }}>Profile saved!</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Subscription */}
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: upgradeError ? 12 : 0 }}>
              <div>
                <p style={{ color: "#64748b", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Plan</p>
                <p style={{ color: "#f1f5f9", fontWeight: 600 }}>{subPlan === "traveller_pro" ? "Traveller Pro" : "Free"}</p>
              </div>
              {subPlan !== "traveller_pro" ? (
                <button onClick={handleUpgrade} disabled={upgrading}
                  style={{ padding: "8px 16px", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "#000", background: upgrading ? "#a07810" : "#d4a017", border: "none", cursor: upgrading ? "not-allowed" : "pointer", opacity: upgrading ? 0.7 : 1 }}>
                  {upgrading ? "Opening…" : "Upgrade — ₹50/mo"}
                </button>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 999, background: "#d4a01720", color: "#d4a017", border: "1px solid #d4a01740" }}>PRO</span>
              )}
            </div>
            {upgradeError && (
              <p style={{ color: "#f87171", fontSize: 13, background: "#450a0a40", border: "1px solid #7f1d1d", borderRadius: 8, padding: "8px 12px", margin: 0 }}>{upgradeError}</p>
            )}
          </div>

          {/* Travel preferences */}
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ color: "#cbd5e1", fontWeight: 600, fontSize: 14, margin: 0 }}>Travel Preferences</p>

            <div>
              <label style={labelSty}>Nationality</label>
              <input value={nationality} onChange={e => setNationality(e.target.value)} placeholder="e.g. India" style={inputSty} />
            </div>
            <div>
              <label style={labelSty}>Home City</label>
              <input value={homeCity} onChange={e => setHomeCity(e.target.value)} placeholder="e.g. Kochi" style={inputSty} />
            </div>
            <div>
              <label style={labelSty}>Preferred Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} style={inputSty}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelSty}>Travel Style</label>
              <select value={travelStyle} onChange={e => setTravelStyle(e.target.value)} style={inputSty}>
                <option value="">Not specified</option>
                {TRAVEL_STYLES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={labelSty}>Passport Expiry</label>
              <input type="date" value={passportExpiry} onChange={e => setPassportExpiry(e.target.value)} style={inputSty} />
            </div>
          </div>

          <button onClick={save} disabled={saving}
            style={{ width: "100%", padding: "12px 0", borderRadius: 12, fontWeight: 600, fontSize: 14, color: "#000", background: "#d4a017", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
