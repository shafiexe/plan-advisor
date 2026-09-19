"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SPECIALIZATIONS = ["Pilgrimage", "Adventure", "Family", "Honeymoon", "Beach", "Wildlife", "Cultural", "Budget", "Trekking", "Corporate"];
const LANGUAGES = ["Malayalam", "Tamil", "Hindi", "English", "Arabic", "Urdu", "Telugu", "Kannada"];

export default function AgentRegisterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tab, setTab] = useState<"agency" | "individual">("agency");
  const [step, setStep] = useState<"form" | "phone-otp" | "done">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState(0);
  const [agencyCode, setAgencyCode] = useState("");

  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");

  if (status === "loading") return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="text-slate-400">Loading…</div></div>;
  if (!session) { router.push("/login?callbackUrl=/register/agent"); return null; }

  const toggleSpec = (s: string) => setSpecializations(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  const toggleLang = (l: string) => setLanguages(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) { setError("Name and phone are required."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/agent/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Email": session.user?.email! },
        body: JSON.stringify({
          agent_type: tab, name, phone, location, website, description,
          specializations, languages, experience_years: experienceYears, agency_code: agencyCode,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Registration failed"); }

      const otpRes = await fetch(`${API}/api/agent/phone-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Email": session.user?.email! },
        body: JSON.stringify({ phone }),
      });
      const otpData = await otpRes.json();
      if (otpData.dev_otp) setDevOtp(otpData.dev_otp);
      setStep("phone-otp");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { setError("Enter the 6-digit OTP."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/agent/verify-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Email": session.user?.email! },
        body: JSON.stringify({ phone, otp }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "OTP verification failed"); }
      setStep("done");
      setTimeout(() => router.push("/agent/dashboard"), 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl" style={{ background: "#1e3a8a15" }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl" style={{ background: "#d4a01710" }} />
      </div>

      <div className="relative w-full max-w-lg">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-8 shadow-2xl shadow-black/40">
          <div className="flex flex-col items-center gap-2 mb-8">
            <BrandLogo size={48} />
            <p className="text-slate-400 text-sm">Register as a Travel Agent</p>
          </div>

          {step === "form" && (
            <>
              <div className="flex gap-0 mb-6 border border-slate-700 rounded-xl overflow-hidden">
                {(["agency", "individual"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-all ${tab === t ? "text-white" : "text-slate-400 hover:text-slate-200"}`}
                    style={tab === t ? { background: "#1e3a8a" } : {}}>
                    {t === "agency" ? "🏢 Agency" : "👤 Individual Agent"}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5 block">
                    {tab === "agency" ? "Agency Name" : "Full Name"} *
                  </label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder={tab === "agency" ? "e.g. Al-Amin Tours & Travels" : "e.g. Mohammed Shafi"} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017]" />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5 block">Phone Number *</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017]" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5 block">Location</label>
                    <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, State" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017]" />
                  </div>
                  {tab === "agency" ? (
                    <div>
                      <label className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5 block">Website</label>
                      <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://youragency.com" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017]" />
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5 block">Experience (yrs)</label>
                      <input type="number" value={experienceYears} onChange={e => setExperienceYears(Number(e.target.value))} min={0} max={50} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#d4a017]" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5 block">About / Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Brief description of your services..." className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017] resize-none" />
                </div>

                {tab === "individual" && (
                  <div>
                    <label className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5 block">Agency Code (optional)</label>
                    <input value={agencyCode} onChange={e => setAgencyCode(e.target.value)} placeholder="Link to an existing agency" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017]" />
                  </div>
                )}

                <div>
                  <label className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2 block">Specializations</label>
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

                {tab === "individual" && (
                  <div>
                    <label className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2 block">Languages Spoken</label>
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
                )}

                {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>}

                <button onClick={handleSubmit} disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 mt-2"
                  style={{ background: "#1e3a8a" }}>
                  {loading ? "Submitting…" : "Register & Verify Phone →"}
                </button>
              </div>
            </>
          )}

          {step === "phone-otp" && (
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="text-4xl">📱</div>
              <div>
                <p className="text-slate-200 font-semibold">Verify your phone</p>
                <p className="text-slate-400 text-sm mt-1">Enter the 6-digit OTP sent to <span className="text-white">{phone}</span></p>
                {devOtp && <p className="text-[#d4a017] text-xs mt-2 bg-yellow-900/20 border border-yellow-800/40 rounded px-2 py-1">Dev OTP: <strong>{devOtp}</strong></p>}
              </div>
              <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000" maxLength={6}
                className="text-center text-2xl font-bold tracking-widest w-40 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4a017]" />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={handleVerifyOtp} disabled={loading || otp.length !== 6}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50"
                style={{ background: "#1e3a8a" }}>
                {loading ? "Verifying…" : "Verify OTP →"}
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-4 text-center py-6">
              <div className="text-5xl">🎉</div>
              <p className="text-slate-200 font-semibold text-lg">Registration complete!</p>
              <p className="text-slate-400 text-sm">Redirecting to your dashboard…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
