"use client";

import { useState } from "react";
import type { DestinationGuide } from "@/types/destination";
import { useDestinationTime } from "@/hooks/useDestinationTime";

type Props = { data: DestinationGuide };

type Tab = "explore" | "food" | "practical" | "pack";

const SAFETY_STYLES: Record<string, string> = {
  "Very Safe": "bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
  "Safe":      "bg-green-900/40 text-green-300 border-green-700/50",
  "Moderate":  "bg-amber-900/40 text-amber-300 border-amber-700/50",
  "Exercise Caution": "bg-red-900/40 text-red-300 border-red-700/50",
};

export default function DestinationGuideCard({ data }: Props) {
  const [tab, setTab] = useState<Tab>("explore");
  const { time, offset } = useDestinationTime(data.destination);

  const tabs: { key: Tab; label: string }[] = [
    { key: "explore",   label: "Explore" },
    { key: "food",      label: "Food" },
    { key: "practical", label: "Practical" },
    { key: "pack",      label: "Pack" },
  ];

  const safetyStyle = data.practical?.safety
    ? SAFETY_STYLES[data.practical.safety] ?? "bg-slate-800 text-slate-300 border-slate-600"
    : null;

  return (
    <div className="w-full rounded-2xl bg-slate-900 border border-slate-700/60 shadow-xl overflow-hidden">

      {/* Header */}
      <div className="px-5 pt-5 pb-4 bg-gradient-to-br from-indigo-950/60 to-slate-900 border-b border-slate-700/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">{data.destination}</h2>
            {data.tagline && (
              <p className="text-sm text-indigo-300/80 mt-0.5 italic">{data.tagline}</p>
            )}
            {time && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                <span className="text-slate-500">🕐</span>
                <span className="font-mono text-slate-300">{time}</span>
                <span className="text-slate-500">({offset})</span>
              </div>
            )}
          </div>
          <span className="text-2xl shrink-0">🗺️</span>
        </div>
        {data.best_time && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-900/40 border border-indigo-700/40 text-xs text-indigo-200">
            <span>🗓️</span>
            <span><strong>Best time:</strong> {data.best_time}</span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-700/40 bg-slate-900/80">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors
              ${tab === key
                ? "text-indigo-300 border-b-2 border-indigo-400 bg-indigo-950/30"
                : "text-slate-500 hover:text-slate-300 border-b-2 border-transparent"
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">

        {/* ── Explore tab ── */}
        {tab === "explore" && (
          <div className="space-y-5">
            {data.top_attractions.length > 0 && (
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Top Attractions
                </h3>
                <div className="space-y-2.5">
                  {data.top_attractions.map((a, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-3"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold text-white">{a.name}</span>
                        {a.duration && (
                          <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/50 border border-indigo-700/40 text-indigo-300">
                            {a.duration}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{a.description}</p>
                      {a.tip && (
                        <p className="mt-1.5 text-xs text-amber-300/80">
                          💡 {a.tip}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {data.neighbourhoods.length > 0 && (
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Neighbourhoods
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {data.neighbourhoods.map((n, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-3"
                    >
                      <p className="text-sm font-semibold text-white">{n.name}</p>
                      <p className="text-xs text-indigo-300/70 mt-0.5">{n.vibe}</p>
                      <p className="text-xs text-slate-500 mt-1">Best for: {n.best_for}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ── Food tab ── */}
        {tab === "food" && (
          <div className="space-y-2">
            {data.food.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No food info available.</p>
            ) : (
              data.food.map((f, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl bg-slate-800/60 border border-slate-700/40 p-3"
                >
                  <span className="text-base shrink-0 mt-0.5">{f.must_try ? "⭐" : "🍴"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{f.name}</span>
                      {f.must_try && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-900/50 border border-amber-700/40 text-amber-300 shrink-0">
                          Must try
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{f.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Practical tab ── */}
        {tab === "practical" && (
          <div className="space-y-4">
            {data.practical && (
              <div className="space-y-2.5">
                {data.practical.safety && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-28 shrink-0">Safety</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${safetyStyle}`}>
                      {data.practical.safety}
                    </span>
                  </div>
                )}
                {data.practical.local_transport && (
                  <div className="flex gap-2">
                    <span className="text-xs text-slate-500 w-28 shrink-0 pt-0.5">Local transport</span>
                    <p className="text-xs text-slate-300 leading-relaxed">{data.practical.local_transport}</p>
                  </div>
                )}
                {data.practical.tipping && (
                  <div className="flex gap-2">
                    <span className="text-xs text-slate-500 w-28 shrink-0 pt-0.5">Tipping</span>
                    <p className="text-xs text-slate-300 leading-relaxed">{data.practical.tipping}</p>
                  </div>
                )}
                {data.practical.language_tip && (
                  <div className="flex gap-2">
                    <span className="text-xs text-slate-500 w-28 shrink-0 pt-0.5">Language</span>
                    <p className="text-xs text-slate-300 leading-relaxed">{data.practical.language_tip}</p>
                  </div>
                )}
                {data.practical.currency_tip && (
                  <div className="flex gap-2">
                    <span className="text-xs text-slate-500 w-28 shrink-0 pt-0.5">Currency</span>
                    <p className="text-xs text-slate-300 leading-relaxed">{data.practical.currency_tip}</p>
                  </div>
                )}
              </div>
            )}

            {data.tips.length > 0 && (
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tips</h3>
                <ul className="space-y-1.5">
                  {data.tips.map((t, i) => (
                    <li key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                      <span className="text-indigo-400 shrink-0">•</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data.avoid.length > 0 && (
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">What to Avoid</h3>
                <ul className="space-y-1.5">
                  {data.avoid.map((a, i) => (
                    <li key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                      <span className="text-red-400 shrink-0">✗</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {/* ── Pack tab ── */}
        {tab === "pack" && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Packing List</h3>
            {data.pack.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No packing info available.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {data.pack.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg bg-slate-800/50 border border-slate-700/40 px-3 py-2"
                  >
                    <span className="w-4 h-4 rounded border border-slate-600 flex-shrink-0" />
                    <span className="text-xs text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
