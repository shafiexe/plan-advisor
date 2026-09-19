"use client";

import { useState } from "react";
import type { LocalEvents, LocalEvent } from "@/types/localEvents";

const TYPE_BADGE: Record<LocalEvent["type"], string> = {
  festival:   "bg-purple-900/60 text-[#d4a017] border-purple-700/50",
  concert:    "bg-pink-900/60 text-pink-300 border-pink-700/50",
  sports:     "bg-blue-900/60 text-blue-300 border-blue-700/50",
  holiday:    "bg-amber-900/60 text-amber-300 border-amber-700/50",
  exhibition: "bg-teal-900/60 text-teal-300 border-teal-700/50",
  market:     "bg-emerald-900/60 text-emerald-300 border-emerald-700/50",
  cultural:   "bg-[#1e3a8a]/60 text-[#d4a017] border-indigo-700/50",
  food:       "bg-orange-900/60 text-orange-300 border-orange-700/50",
};

export default function LocalEventsCard({ data }: { data: LocalEvents }) {
  const [showAll, setShowAll] = useState(false);
  const events = data.events ?? [];
  const visible = showAll ? events : events.slice(0, 6);

  return (
    <div className="w-full rounded-2xl bg-slate-900 border border-slate-700/60 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-indigo-900/40 to-purple-900/30 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎉</span>
          <div>
            <h2 className="font-bold text-white text-base">
              What&apos;s On in {data.destination}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{data.travel_dates}</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">
        {/* Season note */}
        {data.season_note && (
          <p className="text-xs italic text-[#d4a017]/90">
            ✨ {data.season_note}
          </p>
        )}

        {/* Holiday pills */}
        {data.holidays && data.holidays.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.holidays.map((h, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs
                  bg-amber-900/40 text-amber-300 border border-amber-700/40"
              >
                🏖️ {h}
              </span>
            ))}
          </div>
        )}

        {/* Busy periods warning */}
        {data.busy_periods && (
          <p className="text-xs text-amber-400/90 flex items-center gap-1.5">
            <span>⚠️</span>
            <span>{data.busy_periods}</span>
          </p>
        )}

        {/* Error state */}
        {data.error && (
          <p className="text-xs text-red-400">{data.error}</p>
        )}

        {/* Events list */}
        {visible.length > 0 ? (
          <div className="flex flex-col gap-3">
            {visible.map((ev, i) => (
              <div
                key={i}
                className="flex gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 hover:border-slate-600/60 transition-colors"
              >
                {/* Emoji badge */}
                <div className="w-10 h-10 shrink-0 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-xl">
                  {ev.emoji || "🎪"}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-white truncate">{ev.name}</span>
                    <span
                      className={`shrink-0 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border capitalize ${TYPE_BADGE[ev.type] ?? TYPE_BADGE.cultural}`}
                    >
                      {ev.type}
                    </span>
                    {ev.free && (
                      <span className="shrink-0 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-900/50 text-emerald-400 border border-emerald-700/50">
                        FREE
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 mb-1">{ev.date_range}</p>
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 mb-1.5">
                    {ev.description}
                  </p>

                  {/* Highlights */}
                  {ev.highlights && ev.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-1.5">
                      {ev.highlights.map((h, j) => (
                        <span key={j} className="text-[11px] text-[#d4a017]/80 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-[#1e40af]/60 inline-block" />
                          {h}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Tip */}
                  {ev.tips && (
                    <p className="text-[11px] italic text-slate-500">
                      {ev.tips}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          !data.error && (
            <p className="text-xs text-slate-500 italic">No specific events found for these dates.</p>
          )
        )}

        {/* Show more / less toggle */}
        {events.length > 6 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-xs text-[#d4a017] hover:text-[#d4a017] transition-colors self-start"
          >
            {showAll ? "Show less ▲" : `Show ${events.length - 6} more ▼`}
          </button>
        )}
      </div>
    </div>
  );
}
