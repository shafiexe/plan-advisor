"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SPECIALIZATIONS = ["Pilgrimage", "Adventure", "Family", "Honeymoon", "Beach", "Wildlife", "Cultural", "Budget", "Trekking", "Corporate"];
const LANGUAGES = ["Malayalam", "Tamil", "Hindi", "English", "Arabic", "Urdu", "Telugu", "Kannada"];

const SECTION_LABEL = "text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5 block";
const INPUT_CLASS = "w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017]";

export default function AgentProfilePage() {
  const { data: session } = useSession();
  const [fetchLoading, setFetchLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState(0);
  const [agentType, setAgentType] = useState("");

  // OTP re-verify
  const [reverifyStep, setReverifyStep] = useState<"idle" | "otp">("idle");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");

  useEffect(() => {
    if (!session?.user?.email) return;
    fetch(`${API}/api/agent/profile`, { headers: { "X-User-Email": session.user.email } })
      .then(r => r.json())
      .then(d => {
        setName(d.name ?? "");
        setPhone(d.phone ?? "");
        setPhoneVerified(d.phone_verified ?? false);
        setLocation(d.location ?? "");
        setWebsite(d.website ?? "");
        setDescription(d.description ?? "");
        setSpecializations(d.specializations ?? []);
        setLanguages(d.languages ?? []);
        setExperienceYears(d.experience_years ?? 0);
        setAgentType(d.agent_type ?? "individual");
      })
      .catch(console.error)
      .finally(() => setFetchLoading(false));
  }, [session]);

  const toggleSpec = (s: string) => setSpecializations(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  const toggleLang = (l: string) => setLanguages(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);

  const handleSave = async () => {
    setLoading(true); setError(""); setSuccess(false);
    try {
      const res = await fetch(`${API}/api/agent/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-User-Email": session!.user!.email! },
        body: JSON.stringify({ name, phone, location, website, description, specializations, languages, experience_years: experienceYears }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Save failed"); }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally { setLoading(false); }
  };

  const sendReverifyOtp = async () => {
    setOtpLoading(true); setOtpError("");
    try {
      const res = await fetch(`${API}/api/agent/phone-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Email": session!.user!.email! },
        body: JSON.stringify({ phone }),
      });
      const d = await res.json();
      if (d.dev_otp) setDevOtp(d.dev_otp);
      setReverifyStep("otp");
    } catch (e: unknown) {
      setOtpError(e instanceof Error ? e.message : "Failed to send OTP");
    } finally { setOtpLoading(false); }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) { setOtpError("Enter 6-digit OTP"); return; }
    setOtpLoading(true); setOtpError("");
    try {
      const res = await fetch(`${API}/api/agent/verify-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Email": session!.user!.email! },
        body: JSON.stringify({ phone, otp }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Verification failed"); }
      setPhoneVerified(true);
      setReverifyStep("idle");
      setOtp("");
      setDevOtp("");
    } catch (e: unknown) {
      setOtpError(e instanceof Error ? e.message : "Verification failed");
    } finally { setOtpLoading(false); }
  };

  if (fetchLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex flex-col gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-900 rounded-2xl animate-pulse border border-slate-800" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">My Profile</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your agent profile and contact details</p>
      </div>

      {success && (
        <div className="text-green-400 text-sm bg-green-900/20 border border-green-800 rounded-lg px-3 py-2 mb-4">
          Profile saved successfully!
        </div>
      )}
      {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 mb-4">{error}</p>}

      <div className="flex flex-col gap-6">
        {/* Account Info (read-only) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">👤 Account Info</p>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-slate-400">Email</span>
              <span className="text-white">{session?.user?.email}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400">Agent Type</span>
              <span className="text-white capitalize">{agentType}</span>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">📋 Basic Information</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className={SECTION_LABEL}>Name / Agency Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className={INPUT_CLASS} />
            </div>

            {/* Phone with verification status */}
            <div>
              <label className={SECTION_LABEL}>Phone Number</label>
              <div className="flex gap-2 items-center">
                <input value={phone} onChange={e => setPhone(e.target.value)} className={INPUT_CLASS} />
                {phoneVerified ? (
                  <span className="text-xs font-semibold text-green-400 bg-green-900/30 border border-green-800/40 px-2 py-1.5 rounded-lg flex-shrink-0">✓ Verified</span>
                ) : (
                  <button onClick={reverifyStep === "idle" ? sendReverifyOtp : undefined}
                    disabled={otpLoading}
                    className="text-xs font-semibold text-amber-400 bg-amber-900/30 border border-amber-800/40 px-2 py-1.5 rounded-lg flex-shrink-0 hover:bg-amber-900/50 transition-all disabled:opacity-50">
                    {otpLoading ? "…" : "Verify"}
                  </button>
                )}
              </div>

              {/* OTP verification inline */}
              {reverifyStep === "otp" && (
                <div className="mt-3 p-3 bg-slate-800 border border-slate-700 rounded-xl">
                  <p className="text-xs text-slate-400 mb-2">Enter the 6-digit OTP sent to {phone}</p>
                  {devOtp && <p className="text-[#d4a017] text-xs mb-2 bg-yellow-900/20 border border-yellow-800/40 rounded px-2 py-1">Dev OTP: <strong>{devOtp}</strong></p>}
                  <div className="flex gap-2">
                    <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000" maxLength={6}
                      className="flex-1 text-center text-lg font-bold tracking-widest bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#d4a017]" />
                    <button onClick={verifyOtp} disabled={otpLoading || otp.length !== 6}
                      className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
                      style={{ background: "#1e3a8a" }}>
                      {otpLoading ? "…" : "Verify"}
                    </button>
                  </div>
                  {otpError && <p className="text-red-400 text-xs mt-2">{otpError}</p>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={SECTION_LABEL}>Location</label>
                <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, State" className={INPUT_CLASS} />
              </div>
              <div>
                <label className={SECTION_LABEL}>Experience (years)</label>
                <input type="number" value={experienceYears} onChange={e => setExperienceYears(Number(e.target.value))} min={0} max={50} className={INPUT_CLASS} />
              </div>
            </div>

            {agentType === "agency" && (
              <div>
                <label className={SECTION_LABEL}>Website</label>
                <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://youragency.com" className={INPUT_CLASS} />
              </div>
            )}

            <div>
              <label className={SECTION_LABEL}>About / Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                placeholder="Brief description of your services…"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017] resize-none" />
            </div>
          </div>
        </div>

        {/* Specializations */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className="text-sm font-semibold text-slate-300 mb-4">⭐ Specializations</p>
          <div className="flex flex-wrap gap-2">
            {SPECIALIZATIONS.map(s => (
              <button key={s} onClick={() => toggleSpec(s)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${specializations.includes(s) ? "border-[#d4a017] text-[#d4a017]" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
                style={specializations.includes(s) ? { background: "#d4a01712" } : {}}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className="text-sm font-semibold text-slate-300 mb-4">🗣️ Languages Spoken</p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(l => (
              <button key={l} onClick={() => toggleLang(l)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${languages.includes(l) ? "border-[#1e3a8a] text-[#93c5fd]" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
                style={languages.includes(l) ? { background: "#1e3a8a20" } : {}}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button onClick={handleSave} disabled={loading}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: "#1e3a8a" }}>
          {loading ? "Saving…" : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
