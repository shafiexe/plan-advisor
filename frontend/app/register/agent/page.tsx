"use client";
import { useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SPECIALIZATIONS = ["Pilgrimage", "Adventure", "Family", "Honeymoon", "Beach", "Wildlife", "Cultural", "Budget", "Trekking", "Corporate"];
const LANGUAGES = ["Malayalam", "Tamil", "Hindi", "English", "Arabic", "Urdu", "Telugu", "Kannada"];
const SERVICES = [
  { id: "packages",    label: "Tour Packages",   icon: "🌍" },
  { id: "tickets",     label: "Ticket Sales",     icon: "🎫" },
  { id: "visa",        label: "Visa Processing",  icon: "🛂" },
  { id: "hajj_umra",  label: "Hajj / Umra",      icon: "🕌" },
  { id: "recruitment", label: "Recruitment Visa", icon: "💼" },
];

type Step = "form" | "phone-otp" | "aadhaar-otp" | "license" | "done";
const STEP_LABELS: Record<string, string> = {
  form: "Basic Info", "phone-otp": "Phone OTP", "aadhaar-otp": "Aadhaar", license: "License", done: "Submitted",
};

export default function AgentRegisterPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"agency" | "individual">("agency");
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail]             = useState("");
  const [name, setName]               = useState("");
  const [phone, setPhone]             = useState("");
  const [location, setLocation]       = useState("");
  const [website, setWebsite]         = useState("");
  const [description, setDescription] = useState("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [languages, setLanguages]     = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState(0);
  const [services, setServices]       = useState<string[]>([]);
  const [phoneOtp, setPhoneOtp]       = useState("");
  const [devOtp, setDevOtp]           = useState("");
  const [aadhaarNum, setAadhaarNum]   = useState("");
  const [aadhaarOtp, setAadhaarOtp]   = useState("");
  const [aadhaarHint, setAadhaarHint] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);

  const toggle = <T extends string>(arr: T[], val: T, setter: (v: T[]) => void) =>
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const hdr = () => ({ "X-User-Email": email.trim().toLowerCase(), "Content-Type": "application/json" });
  const uploadHdr = () => ({ "X-User-Email": email.trim().toLowerCase() });

  const stepOrder = (tab === "agency"
    ? ["form", "phone-otp", "aadhaar-otp", "license"]
    : ["form", "phone-otp", "aadhaar-otp"]) as Step[];
  const stepIndex = stepOrder.indexOf(step);

  const inputSty: CSSProperties = { width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "10px 16px", fontSize: 14, color: "#e2e8f0", outline: "none", boxSizing: "border-box" };

  const handleRegister = async () => {
    if (!email.trim() || !name.trim() || !phone.trim()) { setError("Email, name and phone are required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Enter a valid email address."); return; }
    setLoading(true); setError("");
    try {
      const reg = await fetch(`${API}/api/agent/register`, {
        method: "POST", headers: hdr(),
        body: JSON.stringify({ agent_type: tab, name, phone, location, website, description, specializations, languages, experience_years: experienceYears, services_offered: services }),
      });
      if (!reg.ok) { const d = await reg.json(); throw new Error(d.detail || "Registration failed"); }
      const otpRes = await fetch(`${API}/api/agent/phone-otp`, { method: "POST", headers: hdr(), body: JSON.stringify({ phone }) });
      const otpData = await otpRes.json();
      if (otpData.dev_otp) setDevOtp(otpData.dev_otp);
      setStep("phone-otp");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "An error occurred"); }
    finally { setLoading(false); }
  };

  const handleVerifyPhone = async () => {
    if (phoneOtp.length !== 6) { setError("Enter the 6-digit OTP."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/agent/verify-phone`, { method: "POST", headers: hdr(), body: JSON.stringify({ phone, otp: phoneOtp }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "OTP verification failed"); }
      setStep("aadhaar-otp");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "An error occurred"); }
    finally { setLoading(false); }
  };

  const handleAadhaarOtp = async () => {
    const num = aadhaarNum.replace(/\s/g, "");
    if (num.length !== 12) { setError("Enter your 12-digit Aadhaar number."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/agent/aadhaar-otp`, { method: "POST", headers: hdr(), body: JSON.stringify({ aadhaar_number: num }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "Failed to send Aadhaar OTP");
      setAadhaarHint(d.mobile_hint || "");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "An error occurred"); }
    finally { setLoading(false); }
  };

  const handleVerifyAadhaar = async () => {
    if (aadhaarOtp.length !== 6) { setError("Enter the 6-digit OTP."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/agent/verify-aadhaar`, { method: "POST", headers: hdr(), body: JSON.stringify({ otp: aadhaarOtp }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Aadhaar verification failed"); }
      setStep(tab === "agency" ? "license" : "done");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "An error occurred"); }
    finally { setLoading(false); }
  };

  const handleUploadLicense = async () => {
    if (!licenseFile) { setError("Please select a file."); return; }
    setLoading(true); setError("");
    try {
      const fd = new FormData(); fd.append("file", licenseFile);
      const res = await fetch(`${API}/api/agent/upload-license`, { method: "POST", headers: uploadHdr(), body: fd });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Upload failed"); }
      setStep("done");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "An error occurred"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ flex: "1 1 0", overflowY: "auto", background: "#020817" }}>
      <div style={{ maxWidth: 544, margin: "0 auto", padding: "40px 16px 64px" }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: "#1e3a8a" }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-15" style={{ background: "#d4a017" }} />
      </div>

      <div className="relative">
        <div className="flex flex-col items-center gap-2 mb-6">
          <Link href="/landing"><BrandLogo size={42} /></Link>
          <p className="text-slate-400 text-sm">Register as a Travel Agent</p>
          {step !== "done" && (
            <>
              <div className="flex items-center gap-1 mt-2">
                {stepOrder.map((s, i) => {
                  const active = s === step;
                  const done = i < stepIndex;
                  return (
                    <div key={s} className="flex items-center gap-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${done ? "bg-green-600 text-white" : active ? "text-white" : "bg-slate-800 text-slate-600"}`}
                        style={active ? { background: "#1e3a8a" } : {}}>
                        {done ? "✓" : i + 1}
                      </div>
                      {i < stepOrder.length - 1 && <div className={`w-5 h-px ${done ? "bg-green-600" : "bg-slate-800"}`} />}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500">{STEP_LABELS[step]}</p>
            </>
          )}
        </div>

        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: 24, boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>

          {step === "form" && (
            <>
              <div className="flex gap-0 mb-5 border border-slate-700 rounded-xl overflow-hidden">
                {(["agency", "individual"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-all ${tab === t ? "text-white" : "text-slate-400 hover:text-slate-200"}`}
                    style={tab === t ? { background: "#1e3a8a" } : {}}>
                    {t === "agency" ? "🏢 Agency" : "👤 Individual"}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5 block">Email *</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" style={inputSty} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5 block">{tab === "agency" ? "Agency Name" : "Full Name"} *</label>
                  <input value={name} onChange={e => setName(e.target.value)}
                    placeholder={tab === "agency" ? "e.g. Al-Amin Tours & Travels" : "e.g. Mohammed Shafi"} style={inputSty} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5 block">Phone *</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" style={inputSty} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5 block">Location</label>
                    <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, State" style={inputSty} />
                  </div>
                  {tab === "agency" ? (
                    <div>
                      <label className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5 block">Website</label>
                      <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://…" style={inputSty} />
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5 block">Experience (yrs)</label>
                      <input type="number" value={experienceYears} onChange={e => setExperienceYears(Number(e.target.value))} min={0} max={50} style={inputSty} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5 block">About</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Brief description of your services…"
                    style={{ ...inputSty, resize: "none" }} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2 block">Services You Offer</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SERVICES.map(s => (
                      <button key={s.id} onClick={() => toggle(services, s.id, setServices)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all text-left ${services.includes(s.id) ? "border-[#d4a017] text-[#d4a017]" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
                        style={services.includes(s.id) ? { background: "#d4a01712" } : {}}>
                        <span>{s.icon}</span>{s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2 block">Specializations</label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALIZATIONS.map(s => (
                      <button key={s} onClick={() => toggle(specializations, s, setSpecializations)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${specializations.includes(s) ? "border-[#d4a017] text-[#d4a017]" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
                        style={specializations.includes(s) ? { background: "#d4a01712" } : {}}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                {tab === "individual" && (
                  <div>
                    <label className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2 block">Languages</label>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES.map(l => (
                        <button key={l} onClick={() => toggle(languages, l, setLanguages)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${languages.includes(l) ? "border-blue-600 text-blue-300" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
                          style={languages.includes(l) ? { background: "#1e3a8a20" } : {}}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {error && <p style={{ color: "#f87171", fontSize: 14, background: "#450a0a40", border: "1px solid #7f1d1d", borderRadius: 8, padding: "8px 12px" }}>{error}</p>}
                <button onClick={handleRegister} disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50" style={{ background: "#1e3a8a" }}>
                  {loading ? "Registering…" : "Register & Verify Phone →"}
                </button>
                <p className="text-center text-xs text-slate-500">
                  Already registered?{" "}
                  <Link href="/login/agent" className="text-[#d4a017] hover:text-yellow-300 transition-colors">Sign in →</Link>
                </p>
              </div>
            </>
          )}

          {step === "phone-otp" && (
            <div className="flex flex-col items-center gap-5 text-center">
              <div className="text-4xl">📱</div>
              <div>
                <p className="text-slate-200 font-semibold">Verify your phone</p>
                <p className="text-slate-400 text-sm mt-1">OTP sent to <span className="text-white">{phone}</span></p>
                {devOtp && <p className="text-[#d4a017] text-xs mt-2 bg-yellow-900/20 border border-yellow-800/40 rounded px-2 py-1">Dev OTP: <strong>{devOtp}</strong></p>}
              </div>
              <input value={phoneOtp} onChange={e => setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6}
                className="text-center text-2xl font-bold tracking-widest w-40 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4a017]" />
              {error && <p style={{ color: "#f87171", fontSize: 14 }}>{error}</p>}
              <button onClick={handleVerifyPhone} disabled={loading || phoneOtp.length !== 6}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50" style={{ background: "#1e3a8a" }}>
                {loading ? "Verifying…" : "Verify Phone →"}
              </button>
            </div>
          )}

          {step === "aadhaar-otp" && (
            <div className="flex flex-col gap-5">
              <div className="text-center">
                <div className="text-4xl mb-2">🪪</div>
                <p className="text-slate-200 font-semibold">Aadhaar Verification</p>
                <p className="text-slate-400 text-sm mt-1">Enter your 12-digit Aadhaar to receive an OTP on your registered mobile</p>
              </div>
              {!aadhaarHint ? (
                <>
                  <div>
                    <label className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5 block">Aadhaar Number</label>
                    <input value={aadhaarNum} onChange={e => setAadhaarNum(e.target.value.replace(/\D/g, "").slice(0, 12))}
                      placeholder="xxxx xxxx xxxx" maxLength={12} style={{ ...inputSty, letterSpacing: "0.15em" }} />
                    <p className="text-xs text-slate-600 mt-1">Only the last 4 digits are stored for display.</p>
                  </div>
                  {error && <p style={{ color: "#f87171", fontSize: 14, background: "#450a0a40", border: "1px solid #7f1d1d", borderRadius: 8, padding: "8px 12px" }}>{error}</p>}
                  <button onClick={handleAadhaarOtp} disabled={loading || aadhaarNum.length !== 12}
                    className="w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50" style={{ background: "#1e3a8a" }}>
                    {loading ? "Sending OTP…" : "Send Aadhaar OTP →"}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-slate-400 text-sm text-center">OTP sent to mobile ending <span className="text-white font-medium">{aadhaarHint}</span></p>
                  <input value={aadhaarOtp} onChange={e => setAadhaarOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6}
                    className="text-center text-2xl font-bold tracking-widest bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4a017] mx-auto w-40 block" />
                  {error && <p style={{ color: "#f87171", fontSize: 14, background: "#450a0a40", border: "1px solid #7f1d1d", borderRadius: 8, padding: "8px 12px" }}>{error}</p>}
                  <button onClick={handleVerifyAadhaar} disabled={loading || aadhaarOtp.length !== 6}
                    className="w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50" style={{ background: "#1e3a8a" }}>
                    {loading ? "Verifying…" : "Verify Aadhaar →"}
                  </button>
                </>
              )}
            </div>
          )}

          {step === "license" && (
            <div className="flex flex-col gap-5">
              <div className="text-center">
                <div className="text-4xl mb-2">📄</div>
                <p className="text-slate-200 font-semibold">Upload Travel License</p>
                <p className="text-slate-400 text-sm mt-1">Agency license or registration certificate (PDF, JPG, PNG — max 10 MB)</p>
              </div>
              <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-slate-500 transition-all"
                onClick={() => fileRef.current?.click()}>
                {licenseFile
                  ? <div><div className="text-2xl mb-1">✅</div><p className="text-slate-200 text-sm font-medium">{licenseFile.name}</p><p className="text-slate-500 text-xs mt-0.5">{(licenseFile.size / 1024 / 1024).toFixed(1)} MB</p></div>
                  : <div><div className="text-3xl mb-2">📤</div><p className="text-slate-400 text-sm">Click to choose file</p></div>}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setLicenseFile(e.target.files?.[0] ?? null)} />
              {error && <p style={{ color: "#f87171", fontSize: 14, background: "#450a0a40", border: "1px solid #7f1d1d", borderRadius: 8, padding: "8px 12px" }}>{error}</p>}
              <button onClick={handleUploadLicense} disabled={loading || !licenseFile}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50" style={{ background: "#1e3a8a" }}>
                {loading ? "Uploading…" : "Upload & Submit →"}
              </button>
              <button onClick={() => setStep("done")} className="text-xs text-slate-500 hover:text-slate-300 text-center transition-colors">
                Skip for now (upload later from profile)
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-5 text-center py-2">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl" style={{ background: "#1e3a8a30" }}>⏳</div>
              <div>
                <p className="text-slate-200 font-semibold text-lg">Application submitted!</p>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed max-w-xs">
                  Your registration is under review. We&apos;ll notify you at <span className="text-white">{email}</span> once approved — usually within 24 hours.
                </p>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 text-left w-full">
                <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wide">What happens next</p>
                <div className="flex flex-col gap-2">
                  {["Admin reviews your Aadhaar and license", "You get an email when approved", "Sign in to access your agent dashboard"].map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                      <span className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "#1e3a8a" }}>{i + 1}</span>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/login/agent" className="w-full py-3 rounded-xl font-semibold text-sm text-center transition-all border block"
                style={{ borderColor: "#d4a017", color: "#d4a017" }}>
                Sign In to Dashboard →
              </Link>
              <Link href="/landing" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">← Back to home</Link>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
