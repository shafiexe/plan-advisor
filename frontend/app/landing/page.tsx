import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import LandingNav from "@/components/LandingNav";

export const metadata = {
  title: "planadviros — Tours and Guidance",
  description:
    "Search flights, compare hotels, plan group tours — all in one conversation.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* ── Navbar ───────────────────────────────────────────── */}
      <LandingNav />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24 px-4 sm:px-6">
        {/* Background glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-56 -left-40 w-[520px] h-[520px] bg-[#1e3a8a]/10 rounded-full blur-3xl" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-[#d4a017]/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge — no AI mention */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
            bg-[#1e3a8a]/10 border border-[#1e3a8a]/30 text-[#d4a017] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4a017] animate-pulse" />
            Smart Travel Planning
          </span>

          {/* Hero logo */}
          <div className="flex justify-center mb-6">
            <BrandLogo size={56} />
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-slate-50 leading-tight mb-5">
            Your{" "}
            <span style={{ background: "linear-gradient(to right, #1e3a8a, #d4a017)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Plan Advisors
            </span>{" "}
            for Every Journey
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            Search flights, compare hotels, plan group tours — all in one conversation.
            Real-time prices, offline support, and multi-language guidance.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-white font-semibold text-sm
                transition-colors duration-150 shadow-lg text-center"
              style={{ background: "#1e3a8a" }}
            >
              Get Started Free →
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-300
                hover:text-slate-100 font-medium text-sm transition-colors duration-150 text-center"
            >
              See how it works
            </a>
          </div>

          {/* ── Fake chat mockup ─── */}
          <div className="mx-auto max-w-xl bg-slate-900/70 border border-slate-800/60 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/60 bg-slate-900/50">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <span className="ml-2 text-xs text-slate-500 font-medium">planadviros</span>
            </div>

            <div className="p-4 space-y-4 text-left">
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-[#1e3a8a]/20 border border-[#1e3a8a]/30 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">
                  <p className="text-sm text-blue-100">Flights from BLR to DXB next week, cheapest option</p>
                </div>
              </div>

              {/* Tool call indicator */}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <svg className="w-3.5 h-3.5 text-[#d4a017] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
                Searching Google Flights…
              </div>

              {/* Response */}
              <div className="flex justify-start">
                <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[90%] space-y-3">
                  <p className="text-sm text-slate-200">Found 3 flights for BLR → DXB. Here&apos;s the best deal:</p>

                  {/* Flight card mockup */}
                  <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-blue-300">IndiGo · 6E 1462</span>
                      <span className="text-xs bg-green-500/15 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-medium">Best price</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-base font-bold text-slate-100">06:15</p>
                        <p className="text-xs text-slate-500">BLR</p>
                      </div>
                      <div className="flex-1 flex flex-col items-center gap-0.5">
                        <p className="text-xs text-slate-500">4h 30m · Non-stop</p>
                        <div className="w-full border-t border-slate-700/60 relative">
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-slate-500" />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-base font-bold text-slate-100">08:45</p>
                        <p className="text-xs text-slate-500">DXB</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-lg font-bold text-slate-50">₹8,450</span>
                      <span className="text-xs text-slate-500">per person</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">Want me to check hotels in Dubai too?</p>
                </div>
              </div>
            </div>

            {/* Input bar mockup */}
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5">
                <span className="text-sm text-slate-500 flex-1">Ask about hotels, restaurants, trains…</span>
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

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-50 text-center mb-3">
            Everything you need to travel smarter
          </h2>
          <p className="text-slate-400 text-center mb-10 max-w-xl mx-auto">
            One assistant that handles every part of your trip — from search to booking.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: "✈️", title: "Smart Flight Search", desc: "Compare flights across airlines with filters, bank offers, and price calendars." },
              { icon: "🏨", title: "Hotel Discovery", desc: "Find top-rated hotels sorted by rating with instant availability." },
              { icon: "🗺️", title: "Group Trip Planner", desc: "Plan tours for 50+ members — timeline, Namaz stops, catering, and cost breakdown." },
              { icon: "🌤️", title: "Weather Forecast", desc: "7-day forecast for your destination with packing suggestions." },
              { icon: "📋", title: "Travel Checklist", desc: "Deadline-aware pre-departure checklist — passport, visa, insurance and more." },
              { icon: "📵", title: "Works Offline", desc: "Cached trips and plans stay available on ghat roads with no signal." },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5 hover:border-[#1e3a8a]/40
                  hover:bg-slate-900/80 transition-all duration-200 group"
              >
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="text-sm font-semibold text-slate-100 mb-1.5 group-hover:text-[#d4a017] transition-colors">
                  {f.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────── */}
      <div className="border-y border-slate-800/60 bg-slate-900/30 py-5 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {[
            { stat: "15+", label: "planning tools" },
            { stat: "Real-time", label: "prices" },
            { stat: "Google Flights", label: "data" },
            { stat: "Free", label: "to use" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5 text-sm">
              <span className="font-bold" style={{ color: "#d4a017" }}>{item.stat}</span>
              <span className="text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-16 sm:py-20 px-4 sm:px-6 scroll-mt-14">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-50 text-center mb-3">
            How it works
          </h2>
          <p className="text-slate-400 text-center mb-12 max-w-md mx-auto">
            Up and running in seconds. No setup required.
          </p>

          <div className="relative flex flex-col sm:flex-row items-start sm:items-stretch gap-8 sm:gap-0">
            <div className="hidden sm:block absolute top-8 left-[calc(16.66%+16px)] right-[calc(16.66%+16px)] h-px"
              style={{ background: "linear-gradient(to right, #1e3a8a40, #d4a01730, #1e3a8a40)" }} />

            {[
              { step: "01", title: "Sign in", desc: "Use your Google or GitHub account — one click, no passwords." },
              { step: "02", title: "Ask anything", desc: "Type or speak your travel query. Understands natural language." },
              { step: "03", title: "Get results", desc: "Instant flights, hotels, and prices. Click any result to book." },
            ].map((s) => (
              <div key={s.step} className="flex-1 flex flex-col items-center text-center px-4">
                <div
                  className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-xl mb-4"
                  style={{ background: "linear-gradient(135deg, #1e3a8a, #d4a017)" }}
                >
                  {s.step}
                </div>
                <h3 className="text-base font-semibold text-slate-100 mb-1.5">{s.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="relative border border-[#1e3a8a]/20 rounded-3xl px-8 py-12 overflow-hidden"
            style={{ background: "linear-gradient(135deg, #1e3a8a15, #d4a01710)" }}>
            <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl"
              style={{ background: "#1e3a8a20" }} />
            <div className="pointer-events-none absolute -bottom-16 -left-16 w-48 h-48 rounded-full blur-3xl"
              style={{ background: "#d4a01710" }} />

            <div className="relative flex justify-center mb-4">
              <BrandLogo size={48} />
            </div>
            <h2 className="relative text-2xl sm:text-3xl font-bold text-slate-50 mb-3">
              Ready to plan your next trip?
            </h2>
            <p className="relative text-slate-400 mb-8 text-sm sm:text-base">
              Join thousands of travellers who use planadviros to find the best deals.
            </p>
            <Link
              href="/login"
              className="relative inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-semibold text-sm transition-colors duration-150 shadow-xl"
              style={{ background: "#1e3a8a" }}
            >
              Start Planning Free →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Explore listings callout ─────────────────────────── */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto bg-slate-900/60 border border-slate-800/60 rounded-2xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Browse Tour Packages, Tickets & Visa</h3>
            <p className="text-sm text-slate-400">View listings from verified agents across India — no sign-up needed.</p>
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

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/60 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <BrandLogo variant="icon" size={20} />
            <span>© 2026 planadviros · Tours and Guidance</span>
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
