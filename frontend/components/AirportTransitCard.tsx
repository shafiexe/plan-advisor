"use client";

import { useState } from "react";
import type { AirportTransit, TransitOption } from "@/types/transit";

type Props = { data: AirportTransit };

function OptionRow({ option, defaultOpen }: { option: TransitOption; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-700/50 last:border-0">
      {/* Header row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/40 transition-colors"
      >
        {/* Left: emoji + mode + recommended badge */}
        <span className="text-xl shrink-0">{option.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-200 text-sm">{option.mode}</span>
            {option.recommended && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Recommended ✓
              </span>
            )}
          </div>
        </div>
        {/* Middle: duration + cost */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 text-xs">
            {option.duration}
          </span>
          <span className="text-emerald-400 text-xs font-medium">{option.cost}</span>
        </div>
        {/* Right: frequency */}
        {option.frequency && (
          <span className="text-slate-500 text-xs shrink-0 hidden sm:block">{option.frequency}</span>
        )}
        {/* Chevron */}
        <span className={`text-slate-500 text-xs shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {/* Expandable content */}
      {open && (
        <div className="px-4 pb-3 pl-12">
          {option.steps.length > 0 && (
            <ol className="flex flex-col gap-1 mb-2">
              {option.steps.map((step, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-300">
                  <span className="text-[#d4a017] font-bold shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
          {option.tip && (
            <p className="text-xs text-slate-400 italic mt-1">{option.tip}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AirportTransitCard({ data }: Props) {
  if (data.error) return null;

  const recommendedIdx = data.options.findIndex((o) => o.recommended);
  const defaultOpenIdx = recommendedIdx >= 0 ? recommendedIdx : 0;

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900 shadow-lg">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-700/50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚌</span>
          <span className="font-semibold text-slate-200 text-sm">Airport Transfer Options</span>
        </div>
        <span className="text-xs text-slate-400">
          {data.airport_iata} → {data.destination}
        </span>
      </div>

      {/* Options */}
      <div className="divide-y divide-slate-700/30">
        {data.options.map((opt, i) => (
          <OptionRow key={i} option={opt} defaultOpen={i === defaultOpenIdx} />
        ))}
      </div>

      {/* Overall tip */}
      {data.tip && (
        <div className="px-4 py-2.5 bg-slate-800/30 border-t border-slate-700/40">
          <p className="text-xs text-slate-400 italic">💡 {data.tip}</p>
        </div>
      )}
    </div>
  );
}
