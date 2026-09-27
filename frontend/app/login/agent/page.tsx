"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function AgentLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneHint, setPhoneHint] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async () => {
    if (!email.trim()) { setError("Enter your registered email."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/agent/login-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "Failed to send OTP");
      setPhoneHint(d.phone_hint || "");
      setApprovalStatus(d.approval_status || "");
      if (d.dev_otp) setDevOtp(d.dev_otp);
      setStep("otp");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "An error occurred"); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { setError("Enter the 6-digit OTP."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/agent/verify-login-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "OTP verification failed");

      // Store agent session in localStorage
      try {
        localStorage.setItem("pa_agent_session", JSON.stringify({
          email:           d.email,
          name:            d.name,
          agent_type:      d.agent_type,
          approval_status: d.approval_status,
          is_admin:        d.is_admin,
        }));
      } catch {}

      // Pending agents see a holding screen instead of dashboard
      if (d.approval_status === "pending_review") {
        router.push("/register/agent/pending");
      } else {
        router.push("/agent/dashboard");
      }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "An error occurred"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: "#020817" }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl" style={{ background: "#1e3a8a", opacity: 0.25 }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl" style={{ background: "#d4a017", opacity: 0.15 }} />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-6">
          <Link href="/landing"><BrandLogo size={42} /></Link>
          <p className="text-sm" style={{ color: "#94a3b8" }}>Agent Sign In</p>
        </div>

        <div className="rounded-2xl p-7" style={{ background: "#0f172a", border: "1px solid #1e293b", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>

          {step === "email" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <h2 style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 18, marginBottom: 4 }}>Welcome back</h2>
                <p style={{ color: "#94a3b8", fontSize: 14 }}>Enter the email you registered with — we&apos;ll send an OTP to your phone.</p>
              </div>
              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Registered Email</label>
                <input
                  value={email} onChange={e => setEmail(e.target.value)} type="email"
                  placeholder="you@example.com"
                  onKeyDown={e => e.key === "Enter" && handleSendOtp()}
                  style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "10px 16px", fontSize: 14, color: "#e2e8f0", outline: "none", boxSizing: "border-box" }} />
              </div>
              {error && <p style={{ color: "#f87171", fontSize: 14, background: "#450a0a40", border: "1px solid #7f1d1d", borderRadius: 8, padding: "8px 12px" }}>{error}</p>}
              <button onClick={handleSendOtp} disabled={loading}
                style={{ width: "100%", padding: "12px 0", borderRadius: 12, fontWeight: 600, fontSize: 14, color: "#fff", background: "#1e3a8a", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1 }}>
                {loading ? "Sending OTP…" : "Send OTP →"}
              </button>
              <p style={{ textAlign: "center", fontSize: 12, color: "#64748b" }}>
                Not registered?{" "}
                <Link href="/register/agent" style={{ color: "#d4a017" }}>Create account →</Link>
              </p>
            </div>
          )}

          {step === "otp" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center" }}>
              <div style={{ fontSize: 40 }}>📱</div>
              <div>
                <p style={{ color: "#e2e8f0", fontWeight: 600 }}>Check your phone</p>
                <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 4 }}>
                  OTP sent to phone ending <span style={{ color: "#fff", fontWeight: 500 }}>{phoneHint}</span>
                </p>
                {devOtp && (
                  <p style={{ color: "#d4a017", fontSize: 12, marginTop: 8, background: "#451a0330", border: "1px solid #78350f60", borderRadius: 6, padding: "4px 10px" }}>
                    Dev OTP: <strong>{devOtp}</strong>
                  </p>
                )}
                {approvalStatus === "pending_review" && (
                  <p style={{ color: "#fbbf24", fontSize: 12, marginTop: 8, background: "#451a0330", border: "1px solid #78350f60", borderRadius: 6, padding: "4px 10px" }}>
                    Your account is pending admin approval
                  </p>
                )}
              </div>
              <input
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000" maxLength={6}
                onKeyDown={e => e.key === "Enter" && handleVerifyOtp()}
                style={{ textAlign: "center", fontSize: 24, fontWeight: 700, letterSpacing: "0.2em", width: 160, background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "12px 16px", color: "#fff", outline: "none" }} />
              {error && <p style={{ color: "#f87171", fontSize: 14 }}>{error}</p>}
              <button onClick={handleVerifyOtp} disabled={loading || otp.length !== 6}
                style={{ width: "100%", padding: "12px 0", borderRadius: 12, fontWeight: 600, fontSize: 14, color: "#fff", background: "#1e3a8a", border: "none", cursor: (loading || otp.length !== 6) ? "not-allowed" : "pointer", opacity: (loading || otp.length !== 6) ? 0.5 : 1 }}>
                {loading ? "Verifying…" : "Sign In →"}
              </button>
              <button onClick={() => { setStep("email"); setOtp(""); setError(""); }}
                style={{ fontSize: 12, color: "#64748b", background: "none", border: "none", cursor: "pointer" }}>
                ← Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
