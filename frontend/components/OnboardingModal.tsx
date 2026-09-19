"use client";

import { useState } from "react";
import type { UserPreferences } from "@/hooks/useServerSync";

type Props = {
  onComplete: (prefs: UserPreferences) => void;
};

const COUNTRIES = [
  "India", "United States", "United Kingdom", "UAE", "Singapore", "Malaysia",
  "Australia", "Canada", "Germany", "France", "Japan", "Thailand", "Sri Lanka",
  "Bangladesh", "Nepal", "Pakistan", "Philippines", "Indonesia", "South Africa",
  "Kenya", "Nigeria", "Egypt", "Brazil", "Argentina", "Mexico", "New Zealand",
  "Ireland", "Italy", "Spain", "Portugal", "Netherlands", "Sweden", "Norway",
  "Denmark", "Finland", "Switzerland", "Austria", "Belgium", "Poland", "Russia",
  "China", "South Korea", "Taiwan", "Hong Kong", "Vietnam", "Cambodia", "Myanmar",
];

const HOME_AIRPORTS = [
  { iata: "BLR", city: "Bangalore" },
  { iata: "DEL", city: "Delhi" },
  { iata: "BOM", city: "Mumbai" },
  { iata: "HYD", city: "Hyderabad" },
  { iata: "MAA", city: "Chennai" },
  { iata: "CCU", city: "Kolkata" },
  { iata: "AMD", city: "Ahmedabad" },
  { iata: "COK", city: "Kochi" },
  { iata: "PNQ", city: "Pune" },
  { iata: "GOI", city: "Goa" },
  { iata: "JAI", city: "Jaipur" },
  { iata: "ATQ", city: "Amritsar" },
];

const CURRENCIES = [
  { code: "INR", symbol: "₹", flag: "🇮🇳", label: "INR" },
  { code: "USD", symbol: "$", flag: "🇺🇸", label: "USD" },
  { code: "EUR", symbol: "€", flag: "🇪🇺", label: "EUR" },
  { code: "GBP", symbol: "£", flag: "🇬🇧", label: "GBP" },
  { code: "AED", symbol: "د.إ", flag: "🇦🇪", label: "AED" },
  { code: "THB", symbol: "฿", flag: "🇹🇭", label: "THB" },
  { code: "SGD", symbol: "S$", flag: "🇸🇬", label: "SGD" },
  { code: "JPY", symbol: "¥", flag: "🇯🇵", label: "JPY" },
  { code: "AUD", symbol: "A$", flag: "🇦🇺", label: "AUD" },
  { code: "MYR", symbol: "RM", flag: "🇲🇾", label: "MYR" },
];

const TRAVEL_STYLES = [
  {
    value: "budget",
    emoji: "🎒",
    title: "Budget",
    description: "Hostels, local buses, street food. Every rupee counts.",
  },
  {
    value: "mid-range",
    emoji: "⭐",
    title: "Mid-range",
    description: "3-star hotels, comfort flights, good restaurants.",
  },
  {
    value: "luxury",
    emoji: "✨",
    title: "Luxury",
    description: "5-star stays, business class, fine dining.",
  },
];

const TOTAL_STEPS = 4;

const DEFAULT_PREFS: UserPreferences = {
  nationality: "India",
  home_city: "",
  home_iata: "",
  currency: "INR",
  travel_style: "",
  passport_expiry: "",
  onboarding_done: false,
};

export default function OnboardingModal({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<UserPreferences>({ ...DEFAULT_PREFS });

  const update = (patch: Partial<UserPreferences>) =>
    setPrefs((prev) => ({ ...prev, ...patch }));

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
    else onComplete({ ...prefs, onboarding_done: true });
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const handleSkip = () =>
    onComplete({ ...DEFAULT_PREFS, onboarding_done: true });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur">
      <div className="relative w-full max-w-md bg-slate-900 rounded-2xl shadow-2xl shadow-black/60 border border-slate-700/50 overflow-hidden">

        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-5 pb-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === step ? "bg-indigo-500 w-4" : i < step ? "bg-indigo-400" : "bg-slate-700"
              }`}
            />
          ))}
        </div>

        <div className="px-6 py-5">

          {/* ── Step 0: Welcome + Nationality ── */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-bold text-slate-100 mb-1">Welcome to Plan Advisor ✈️</h2>
              <p className="text-sm text-slate-400 mb-5">
                Let&apos;s personalise your experience in 4 quick steps.
              </p>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Your nationality
              </label>
              <select
                value={prefs.nationality}
                onChange={(e) => update({ nationality: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5
                  text-slate-200 text-sm outline-none focus:border-indigo-500 transition-colors"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Passport expiry (optional)
                </label>
                <input
                  type="date"
                  value={prefs.passport_expiry ?? ""}
                  onChange={(e) => update({ passport_expiry: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5
                    text-slate-200 text-sm outline-none focus:border-indigo-500 transition-colors"
                />
                <p className="text-xs text-slate-600 mt-1.5">We&apos;ll warn you before it expires</p>
              </div>
            </div>
          )}

          {/* ── Step 1: Home City ── */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-slate-100 mb-1">Where do you usually fly from?</h2>
              <p className="text-xs text-slate-500 mb-4">
                We&apos;ll use this as the default origin for flight searches.
              </p>
              <div className="flex gap-3 mb-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    City name
                  </label>
                  <input
                    type="text"
                    value={prefs.home_city}
                    onChange={(e) => update({ home_city: e.target.value })}
                    placeholder="e.g. Bangalore"
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5
                      text-slate-200 text-sm outline-none focus:border-indigo-500 transition-colors placeholder-slate-600"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    IATA
                  </label>
                  <input
                    type="text"
                    value={prefs.home_iata}
                    onChange={(e) => update({ home_iata: e.target.value.toUpperCase().slice(0, 3) })}
                    placeholder="BLR"
                    maxLength={3}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5
                      text-slate-200 text-sm font-mono uppercase outline-none focus:border-indigo-500 transition-colors placeholder-slate-600"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-600 mb-3">Common home airports:</p>
              <div className="flex flex-wrap gap-1.5">
                {HOME_AIRPORTS.map((ap) => (
                  <button
                    key={ap.iata}
                    onClick={() => update({ home_city: ap.city, home_iata: ap.iata })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                      prefs.home_iata === ap.iata
                        ? "bg-indigo-600/30 border-indigo-500 text-indigo-300"
                        : "border-slate-700 text-slate-400 hover:border-indigo-500/60 hover:text-slate-200"
                    }`}
                  >
                    {ap.iata}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Currency ── */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-slate-100 mb-1">Preferred currency for prices?</h2>
              <p className="text-xs text-slate-500 mb-4">
                All prices will be shown in your selected currency.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => update({ currency: c.code })}
                    className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border text-sm font-semibold transition-all ${
                      prefs.currency === c.code
                        ? "border-indigo-500 bg-indigo-600/20 text-indigo-200"
                        : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <span className="text-lg">{c.flag}</span>
                    <span>{c.symbol}</span>
                    <span className="text-slate-500 text-xs">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Travel Style ── */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-slate-100 mb-1">What&apos;s your travel style?</h2>
              <p className="text-xs text-slate-500 mb-4">
                We&apos;ll tailor recommendations to your preference.
              </p>
              <div className="space-y-3">
                {TRAVEL_STYLES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => update({ travel_style: s.value })}
                    className={`w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border text-left transition-all ${
                      prefs.travel_style === s.value
                        ? "border-indigo-500 bg-indigo-600/20"
                        : "border-slate-700 bg-slate-800/40 hover:border-slate-500"
                    }`}
                  >
                    <span className="text-2xl">{s.emoji}</span>
                    <div>
                      <p className={`text-sm font-bold ${
                        prefs.travel_style === s.value ? "text-indigo-200" : "text-slate-200"
                      }`}>
                        {s.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Navigation */}
        <div className="px-6 pb-4 flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={handleBack}
              className="px-4 py-2 rounded-xl border border-slate-600 text-slate-400
                hover:text-white hover:border-slate-400 text-sm font-medium transition-all"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500
              text-white text-sm font-bold transition-all shadow-lg shadow-indigo-900/30"
          >
            {step === TOTAL_STEPS - 1 ? "Done" : "Next"}
          </button>
        </div>

        {/* Skip link */}
        <div className="text-center pb-4">
          <button
            onClick={handleSkip}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            Skip for now
          </button>
        </div>

      </div>
    </div>
  );
}
