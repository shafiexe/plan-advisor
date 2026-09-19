import Link from "next/link";

export const metadata = {
  title: "Plan Advisor — AI Travel Advisor",
  description:
    "Search flights, compare hotels, set price alerts — all in one conversation. Powered by Claude AI.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* ── Navbar ───────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md border-b border-slate-800/60 bg-slate-950/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <span className="text-lg font-semibold tracking-tight text-slate-100 select-none">
            ✦ Plan Advisor
          </span>
          <Link
            href="/login"
            className="px-4 py-1.5 rounded-lg border border-indigo-500/70 text-indigo-400 text-sm font-medium
              hover:bg-indigo-500/10 hover:border-indigo-400 transition-colors duration-150"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24 px-4 sm:px-6">
        {/* Background glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-56 -left-40 w-[520px] h-[520px] bg-indigo-600/10 rounded-full blur-3xl" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-purple-600/8 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
            bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Powered by Claude AI
          </span>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-slate-50 leading-tight mb-5">
            Your{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              AI Travel
            </span>{" "}
            Advisor
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            Search flights, compare hotels, set price alerts — all in one conversation.
            Powered by Claude AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm
                transition-colors duration-150 shadow-lg shadow-indigo-900/40 text-center"
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
              <span className="ml-2 text-xs text-slate-500 font-medium">Plan Advisor</span>
            </div>

            <div className="p-4 space-y-4 text-left">
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">
                  <p className="text-sm text-indigo-100">Flights from BLR to DXB next week, cheapest option</p>
                </div>
              </div>

              {/* Tool call indicator */}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
                Searching Google Flights…
              </div>

              {/* AI response */}
              <div className="flex justify-start">
                <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[90%] space-y-3">
                  <p className="text-sm text-slate-200">Found 3 flights for BLR → DXB. Here&apos;s the best deal:</p>

                  {/* Flight card mockup */}
                  <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-indigo-300">IndiGo · 6E 1462</span>
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
                <div className="w-7 h-7 rounded-lg bg-indigo-600/30 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
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
            One AI assistant that handles every part of your trip — from search to booking.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: "✈️",
                title: "Smart Flight Search",
                desc: "Compare flights across airlines with filters, bank offers, and price calendars.",
              },
              {
                icon: "🏨",
                title: "Hotel Discovery",
                desc: "Find top-rated hotels sorted by rating with instant availability.",
              },
              {
                icon: "🔔",
                title: "Price Alerts",
                desc: "Set a target price. Get emailed the moment fares drop below your threshold.",
              },
              {
                icon: "🗺️",
                title: "Trip Itinerary",
                desc: "Your full trip summary — flights, hotels, restaurants — in one collapsible panel.",
              },
              {
                icon: "🎙️",
                title: "Voice Input",
                desc: "Speak your travel query. The app transcribes and searches instantly.",
              },
              {
                icon: "🌍",
                title: "Location-Aware",
                desc: "Auto-detects your city and uses it as your default departure airport.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5 hover:border-indigo-500/30
                  hover:bg-slate-900/80 transition-all duration-200 group"
              >
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="text-sm font-semibold text-slate-100 mb-1.5 group-hover:text-indigo-300 transition-colors">
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
            { stat: "5+", label: "tools" },
            { stat: "Real-time", label: "prices" },
            { stat: "Google Flights", label: "data" },
            { stat: "Free", label: "to use" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5 text-sm">
              <span className="font-bold text-indigo-300">{item.stat}</span>
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
            {/* Connector line — hidden on mobile */}
            <div className="hidden sm:block absolute top-8 left-[calc(16.66%+16px)] right-[calc(16.66%+16px)] h-px bg-gradient-to-r from-indigo-500/40 via-purple-500/30 to-indigo-500/40" />

            {[
              {
                step: "01",
                title: "Sign in",
                desc: "Use your Google or GitHub account — one click, no passwords.",
              },
              {
                step: "02",
                title: "Ask anything",
                desc: "Type or speak your travel query. The AI understands natural language.",
              },
              {
                step: "03",
                title: "Get results",
                desc: "Instant flights, hotels, and prices. Click any result to book.",
              },
            ].map((s) => (
              <div key={s.step} className="flex-1 flex flex-col items-center text-center px-4">
                <div className="relative z-10 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600
                  flex items-center justify-center text-white font-bold text-sm shadow-xl shadow-indigo-900/40 mb-4">
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
          <div className="relative bg-gradient-to-br from-indigo-900/30 to-purple-900/20 border border-indigo-500/20 rounded-3xl px-8 py-12 overflow-hidden">
            <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl" />

            <h2 className="relative text-2xl sm:text-3xl font-bold text-slate-50 mb-3">
              Ready to plan your next trip?
            </h2>
            <p className="relative text-slate-400 mb-8 text-sm sm:text-base">
              Join thousands of travellers who use Plan Advisor to find the best deals.
            </p>
            <Link
              href="/login"
              className="relative inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600
                hover:bg-indigo-500 text-white font-semibold text-sm transition-colors duration-150
                shadow-xl shadow-indigo-900/50"
            >
              Start Planning Free →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/60 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <span>© 2026 Plan Advisor · planadvisors.in</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
