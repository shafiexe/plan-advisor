import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import LandingNav from "@/components/LandingNav";

export const metadata = {
  title: "PlanAdvisors — Verified Travel Agents & AI Planning",
  description:
    "Connect with Aadhaar-verified travel agents for tours, tickets and visa — or use our AI assistant to plan your trip in seconds.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <LandingNav />

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24 px-4 sm:px-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-56 -left-40 w-[520px] h-[520px] bg-[#1e3a8a]/10 rounded-full blur-3xl" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-[#d4a017]/6 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#1e3a8a]/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#1e3a8a]/10 border border-[#1e3a8a]/30 text-[#d4a017] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4a017] animate-pulse" />
            Trusted Travel Marketplace
          </span>

          <div className="flex justify-center mb-6">
            <BrandLogo size={56} />
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-slate-50 leading-tight mb-5">
            Verified Agents.{" "}
            <span style={{ background: "linear-gradient(to right, #1e3a8a, #d4a017)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Smarter Trips.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Connect with Aadhaar-verified travel agents for tours, tickets & visa — or let our AI assistant plan your entire journey in one conversation.
          </p>

          {/* ── Dual CTA ── */}
          <div className="flex flex-col sm:flex-row items-stretch justify-center gap-4 mb-14 max-w-lg mx-auto">
            <Link
              href="/login"
              className="flex-1 flex flex-col items-center gap-1 px-6 py-4 rounded-2xl text-white font-semibold text-sm transition-all duration-150 shadow-lg border border-[#1e3a8a]/40 hover:border-[#1e3a8a] text-center"
              style={{ background: "#1e3a8a" }}
            >
              <span className="text-2xl mb-1">🧳</span>
              <span>Plan Your Trip</span>
              <span className="text-xs font-normal text-blue-300/70">AI chat + explore marketplace</span>
            </Link>
            <Link
              href="/register/agent"
              className="flex-1 flex flex-col items-center gap-1 px-6 py-4 rounded-2xl font-semibold text-sm transition-all duration-150 border text-center hover:bg-white/5"
              style={{ borderColor: "#d4a017", color: "#d4a017" }}
            >
              <span className="text-2xl mb-1">🏢</span>
              <span>Register as Agent</span>
              <span className="text-xs font-normal text-slate-500">Publish packages, tickets & visa</span>
            </Link>
          </div>

          {/* ── Mockup: chat → agent card ── */}
          <div className="mx-auto max-w-xl bg-slate-900/70 border border-slate-800/60 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/60 bg-slate-900/50">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <span className="ml-2 text-xs text-slate-500 font-medium">PlanAdvisors</span>
            </div>

            <div className="p-4 space-y-4 text-left">
              <div className="flex justify-end">
                <div className="bg-[#1e3a8a]/20 border border-[#1e3a8a]/30 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">
                  <p className="text-sm text-blue-100">I need a Dubai family package for 4 people in December</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <svg className="w-3.5 h-3.5 text-[#d4a017] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
                Matching verified agents…
              </div>

              <div className="flex justify-start">
                <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[90%] space-y-3">
                  <p className="text-sm text-slate-200">Found 2 verified agents specialising in Dubai family tours:</p>

                  {/* Agent card mockup */}
                  <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-3">
                    <div className="flex items-start justify-between mb-1.5">
                      <div>
                        <p className="text-xs font-semibold text-slate-100">Al-Amin Tours & Travels</p>
                        <p className="text-xs text-slate-500">Kozhikode · 8 yrs exp</p>
                      </div>
                      <div className="flex gap-1">
                        <span className="text-[10px] bg-green-500/15 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-full">✓ Verified</span>
                        <span className="text-[10px] bg-[#d4a017]/10 text-[#d4a017] border border-[#d4a017]/20 px-1.5 py-0.5 rounded-full">Pro</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">Dubai 5N/6D package from ₹85,000 · includes visa & transfers</p>
                  </div>

                  <p className="text-xs text-slate-400">Want me to connect you with this agent?</p>
                </div>
              </div>
            </div>

            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5">
                <span className="text-sm text-slate-500 flex-1">Ask about visa, group tours, Hajj packages…</span>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#1e3a8a" }}>
                  <svg className="w-3.5 h-3.5 text-[#d4a017]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Two audiences ───────────────────────────────────────── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-50 text-center mb-3">Built for two journeys</h2>
          <p className="text-slate-400 text-center mb-10 max-w-xl mx-auto">Whether you travel or help others travel — PlanAdvisors has a place for you.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Travellers */}
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6 hover:border-[#1e3a8a]/50 transition-all">
              <div className="text-3xl mb-4">🧳</div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">For Travellers</h3>
              <ul className="space-y-2 mb-6">
                {[
                  "AI assistant — flights, hotels, visa info in one chat",
                  "Browse verified agent packages, tickets & visa",
                  "Contact agents via WhatsApp or enquiry form",
                  "Save trips, set price alerts, share itineraries",
                  "Works offline on poor mobile connections",
                ].map(t => (
                  <li key={t} className="flex items-start gap-2 text-sm text-slate-400">
                    <span className="text-green-400 mt-0.5 shrink-0">✓</span> {t}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#d4a017] hover:text-yellow-300 transition-colors">
                Start planning free →
              </Link>
            </div>

            {/* Agents */}
            <div className="bg-slate-900/60 border border-[#d4a017]/20 rounded-2xl p-6 hover:border-[#d4a017]/50 transition-all" style={{ background: "linear-gradient(135deg, #1e3a8a08, #d4a01708)" }}>
              <div className="text-3xl mb-4">🏢</div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">For Travel Agents</h3>
              <ul className="space-y-2 mb-6">
                {[
                  "Publish tour packages, ticket listings & visa services",
                  "Receive enquiries & leads from travellers",
                  "Aadhaar-verified badge builds instant trust",
                  "Free tier: 10 packages / 10 tickets / 5 visa",
                  "Pro plan: unlimited listings + priority ranking",
                ].map(t => (
                  <li key={t} className="flex items-start gap-2 text-sm text-slate-400">
                    <span className="mt-0.5 shrink-0" style={{ color: "#d4a017" }}>✓</span> {t}
                  </li>
                ))}
              </ul>
              <Link href="/register/agent" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-80 transition-opacity" style={{ color: "#d4a017" }}>
                Register your agency →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Verification trust block ─────────────────────────────── */}
      <div className="border-y border-slate-800/60 py-10 px-4 sm:px-6" style={{ background: "linear-gradient(to right, #1e3a8a08, #d4a01708, #1e3a8a08)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-6">How we verify every agent</p>
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
            {[
              { icon: "📱", label: "Phone OTP" },
              { icon: "🪪", label: "Aadhaar KYC" },
              { icon: "📄", label: "License Review" },
              { icon: "✅", label: "Admin Approved" },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-slate-300">
                <span className="text-lg">{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── AI features ──────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-50 text-center mb-3">
            AI assistant built for travel
          </h2>
          <p className="text-slate-400 text-center mb-10 max-w-xl mx-auto">
            One chat handles every part of your journey — search, compare, plan, pack.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: "✈️", title: "Flight Search", desc: "Live prices from Google Flights with fare calendars and price predictions." },
              { icon: "🏨", title: "Hotel Discovery", desc: "Top-rated hotels sorted by rating with instant availability." },
              { icon: "🗺️", title: "Group Tour Planner", desc: "Plan tours for 50+ members — timeline, catering, and cost breakdown." },
              { icon: "🛂", title: "Visa Info", desc: "Requirements, fee, and processing time for 150+ country pairs." },
              { icon: "🌤️", title: "Weather Forecast", desc: "7-day forecast with packing recommendations for your destination." },
              { icon: "📵", title: "Works Offline", desc: "Cached plans stay available on ghat roads with no signal." },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5 hover:border-[#1e3a8a]/40 hover:bg-slate-900/80 transition-all duration-200 group"
              >
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="text-sm font-semibold text-slate-100 mb-1.5 group-hover:text-[#d4a017] transition-colors">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <div className="border-y border-slate-800/60 bg-slate-900/30 py-5 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {[
            { stat: "Aadhaar", label: "verified agents" },
            { stat: "Real-time", label: "prices" },
            { stat: "15+", label: "planning tools" },
            { stat: "Free", label: "to get started" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5 text-sm">
              <span className="font-bold" style={{ color: "#d4a017" }}>{item.stat}</span>
              <span className="text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="py-16 sm:py-20 px-4 sm:px-6 scroll-mt-14">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-50 text-center mb-3">How it works</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 mt-10">
            {/* Traveller path */}
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-6 text-center">For Travellers</p>
              <div className="flex flex-col gap-5">
                {[
                  { step: "01", title: "Sign in", desc: "Google or GitHub — one click." },
                  { step: "02", title: "Ask anything", desc: "Chat with AI or browse agent listings." },
                  { step: "03", title: "Book or contact", desc: "Direct links to book or chat with an agent." },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-lg" style={{ background: "linear-gradient(135deg, #1e3a8a, #d4a017)" }}>
                      {s.step}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{s.title}</p>
                      <p className="text-sm text-slate-400">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent path */}
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-6 text-center">For Agents</p>
              <div className="flex flex-col gap-5">
                {[
                  { step: "01", title: "Register & verify", desc: "Complete Aadhaar KYC + license upload." },
                  { step: "02", title: "Admin approves", desc: "Usually within 24 hours." },
                  { step: "03", title: "Publish & receive leads", desc: "List packages, get enquiries, grow your business." },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-lg" style={{ background: "linear-gradient(135deg, #d4a017, #1e3a8a)" }}>
                      {s.step}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{s.title}</p>
                      <p className="text-sm text-slate-400">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Explore listings callout ─────────────────────────────── */}
      <section className="py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto bg-slate-900/60 border border-slate-800/60 rounded-2xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Browse verified agent listings</h3>
            <p className="text-sm text-slate-400">Tour packages, flight tickets & visa services — no sign-up needed.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/explore/packages" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors" style={{ background: "#1e3a8a" }}>
              🌍 Packages
            </Link>
            <Link href="/explore/tickets" className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white transition-all">
              🎫 Tickets
            </Link>
            <Link href="/explore/visa" className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white transition-all">
              🛂 Visa
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final dual CTA ───────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Traveller */}
          <div className="relative border border-[#1e3a8a]/30 rounded-3xl px-7 py-10 overflow-hidden text-center" style={{ background: "linear-gradient(135deg, #1e3a8a18, #1e3a8a08)" }}>
            <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl" style={{ background: "#1e3a8a25" }} />
            <div className="relative">
              <div className="text-4xl mb-3">🧳</div>
              <h2 className="text-xl font-bold text-slate-50 mb-2">Plan your trip</h2>
              <p className="text-slate-400 text-sm mb-6">Chat with AI or browse agent packages — free forever.</p>
              <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm transition-colors shadow-xl" style={{ background: "#1e3a8a" }}>
                Start for free →
              </Link>
            </div>
          </div>

          {/* Agent */}
          <div className="relative border border-[#d4a017]/20 rounded-3xl px-7 py-10 overflow-hidden text-center" style={{ background: "linear-gradient(135deg, #d4a01710, #d4a01705)" }}>
            <div className="pointer-events-none absolute -bottom-16 -left-16 w-48 h-48 rounded-full blur-3xl" style={{ background: "#d4a01718" }} />
            <div className="relative">
              <div className="text-4xl mb-3">🏢</div>
              <h2 className="text-xl font-bold text-slate-50 mb-2">Grow your agency</h2>
              <p className="text-slate-400 text-sm mb-6">Get verified, publish listings, and reach travellers across India.</p>
              <Link href="/register/agent" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all border" style={{ borderColor: "#d4a017", color: "#d4a017" }}>
                Register now →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/60 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <BrandLogo variant="icon" size={20} />
            <span>© 2026 PlanAdvisors · Verified Travel Marketplace</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
