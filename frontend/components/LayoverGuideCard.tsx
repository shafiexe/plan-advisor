"use client";

import { useState } from "react";
import type { LayoverGuide } from "@/types/layoverGuide";

type Props = { data: LayoverGuide };

type Tab = "city" | "airside" | "timeplan";

export default function LayoverGuideCard({ data }: Props) {
  const defaultTab: Tab = data.city_options && data.city_options.length > 0 ? "city" : "airside";
  const [tab, setTab] = useState<Tab>(defaultTab);

  const verdictStyle =
    data.verdict === "Worth leaving the airport"
      ? "bg-emerald-900/40 text-emerald-300"
      : data.verdict === "Short city hop possible"
      ? "bg-amber-900/40 text-amber-300"
      : "bg-slate-800 text-slate-300";

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900 text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/60 border-b border-slate-700/40">
        <span className="text-base">✈️</span>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-slate-200 truncate">Layover Guide</span>
          <span className="ml-2 text-slate-400 text-xs">{data.airport}</span>
        </div>
        <span className="text-slate-400 text-xs shrink-0">{data.layover_hours}h layover</span>
      </div>

      {/* Verdict banner */}
      <div className={`px-4 py-3 ${verdictStyle}`}>
        <p className="font-semibold">{data.verdict}</p>
        {data.verdict_reason && (
          <p className="text-xs mt-0.5 opacity-80">{data.verdict_reason}</p>
        )}
      </div>

      {/* Visa note */}
      {data.visa_note && (
        <div className="flex items-start gap-2 px-4 py-2.5 bg-[#172554]/30 border-b border-slate-700/30">
          <span className="text-[#d4a017] shrink-0 mt-0.5">ℹ️</span>
          <span className="text-[#d4a017] text-xs">{data.visa_note}</span>
        </div>
      )}

      {/* Warning */}
      {data.warning && (
        <div className="flex items-start gap-2 px-4 py-2.5 bg-amber-950/30 border-b border-slate-700/30">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <span className="text-amber-300 text-xs">{data.warning}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-700/40 bg-slate-900">
        {data.city_options && data.city_options.length > 0 && (
          <button
            onClick={() => setTab("city")}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              tab === "city"
                ? "border-[#1e3a8a] text-[#d4a017]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            🏙️ City
          </button>
        )}
        <button
          onClick={() => setTab("airside")}
          className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            tab === "airside"
              ? "border-[#1e3a8a] text-[#d4a017]"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          🛋️ Airside
        </button>
        <button
          onClick={() => setTab("timeplan")}
          className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            tab === "timeplan"
              ? "border-[#1e3a8a] text-[#d4a017]"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          ⏱️ Time Plan
        </button>
      </div>

      {/* Tab content */}
      <div className="px-4 py-3 space-y-2">
        {/* City tab */}
        {tab === "city" && data.city_options && data.city_options.length > 0 && (
          <>
            {data.city_options.map((opt, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-800 last:border-0">
                <span className="text-lg shrink-0 mt-0.5">{opt.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-200">{opt.name}</span>
                    {opt.recommended && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-900/40 text-emerald-300 font-medium">
                        ⭐ Recommended
                      </span>
                    )}
                    {opt.distance && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                        {opt.distance}
                      </span>
                    )}
                    {opt.duration && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                        {opt.duration}
                      </span>
                    )}
                  </div>
                  {opt.description && (
                    <p className="text-xs text-slate-400 mt-0.5">{opt.description}</p>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Airside tab */}
        {tab === "airside" && data.airside_options && data.airside_options.length > 0 && (
          <>
            {data.airside_options.map((opt, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-800 last:border-0">
                <span className="text-lg shrink-0 mt-0.5">{opt.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-200">{opt.name}</span>
                    {opt.duration && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                        {opt.duration}
                      </span>
                    )}
                  </div>
                  {opt.description && (
                    <p className="text-xs text-slate-400 mt-0.5">{opt.description}</p>
                  )}
                  {opt.tip && (
                    <p className="text-xs text-slate-500 italic mt-0.5">{opt.tip}</p>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Time Plan tab */}
        {tab === "timeplan" && data.time_plan && data.time_plan.length > 0 && (
          <div className="pl-1 space-y-0">
            {data.time_plan.map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[#d4a017] text-xs min-w-[40px] pt-1.5">{item.time}</span>
                  {i < data.time_plan.length - 1 && (
                    <div className="w-px flex-1 bg-indigo-800/50 mt-1 mb-0 min-h-[16px]" />
                  )}
                </div>
                <p className="text-sm text-slate-200 py-1.5">{item.activity}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lounges — always visible */}
      {data.lounges && data.lounges.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-700/40">
          <p className="text-xs font-semibold text-slate-300 mb-2">🛋️ Airport Lounges</p>
          <div className="space-y-2">
            {data.lounges.map((lounge, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-200 text-xs">{lounge.name}</span>
                    {lounge.terminal && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                        {lounge.terminal}
                      </span>
                    )}
                    {lounge.access && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        lounge.access.includes("Priority Pass")
                          ? "bg-[#1e3a8a]/40 text-[#d4a017]"
                          : lounge.access.includes("Pay")
                          ? "bg-amber-900/30 text-amber-300"
                          : "bg-slate-800 text-slate-400"
                      }`}>
                        {lounge.access}
                      </span>
                    )}
                  </div>
                  {lounge.highlight && (
                    <p className="text-[11px] text-slate-500 mt-0.5">{lounge.highlight}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips — always visible */}
      {data.tips && data.tips.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-700/40 bg-slate-800/20">
          <p className="text-xs font-semibold text-slate-300 mb-2">💡 Quick Tips</p>
          <ul className="space-y-1">
            {data.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                <span className="shrink-0 mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
