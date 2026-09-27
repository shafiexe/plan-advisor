"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

export default function PendingReviewPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pa_agent_session");
      if (raw) {
        const s = JSON.parse(raw);
        if (s.email) setEmail(s.email);
        if (s.name) setName(s.name);
      }
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-10">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-15" style={{ background: "#1e3a8a" }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-10" style={{ background: "#d4a017" }} />
      </div>

      <div className="relative w-full max-w-md text-center">
        <div className="flex flex-col items-center gap-2 mb-8">
          <Link href="/landing"><BrandLogo size={42} /></Link>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-amber-800/30 rounded-2xl p-8 shadow-2xl shadow-black/40">
          <div className="text-5xl mb-4">⏳</div>
          <h1 className="text-xl font-bold text-white mb-2">Application Under Review</h1>
          {name && <p className="text-slate-400 text-sm mb-1">Hello, <span className="text-white font-medium">{name}</span></p>}
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Your agent registration has been submitted and is currently being reviewed by our team.
            We verify every agent&apos;s credentials before granting access to the marketplace.
          </p>

          {/* Status steps */}
          <div className="flex flex-col gap-3 text-left mb-6">
            {[
              { label: "Registration submitted",   done: true },
              { label: "Phone number verified",    done: true },
              { label: "Documents under review",   done: false, active: true },
              { label: "Admin approval",           done: false },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  step.done   ? "bg-green-700 text-white" :
                  step.active ? "bg-amber-700/60 text-amber-300" :
                                "bg-slate-800 text-slate-600"
                }`}>
                  {step.done ? "✓" : step.active ? "…" : i + 1}
                </div>
                <span className={`text-sm ${
                  step.done ? "text-slate-300 line-through" :
                  step.active ? "text-amber-300 font-medium" :
                               "text-slate-600"
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-3 mb-6">
            <p className="text-amber-300 text-xs leading-relaxed">
              You&apos;ll be notified at <strong>{email || "your registered email"}</strong> once your account is approved. This usually takes 1–2 business days.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Link href="/landing"
              className="w-full py-2.5 rounded-xl text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-all text-center">
              Back to Home
            </Link>
            <Link href="/login/agent"
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
              Check status again →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
