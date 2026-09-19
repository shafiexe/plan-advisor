"use client";

import type { HotelComparison, HotelComparisonItem } from "@/types/hotelComparison";

type Props = {
  data: HotelComparison;
};

function scoreColor(score: number): string {
  if (score >= 9) return "bg-emerald-500 text-white";
  if (score >= 7) return "bg-amber-500 text-white";
  return "bg-red-500 text-white";
}

function HotelCard({ hotel, isWinner }: { hotel: HotelComparisonItem; isWinner: boolean }) {
  return (
    <div
      className={`relative flex flex-col gap-3 p-4 rounded-xl bg-slate-800 min-w-[220px] max-w-xs flex-shrink-0
        ${isWinner ? "border-2 border-[#1e3a8a]" : "border border-slate-700"}`}
    >
      {/* Winner badge */}
      {isWinner && (
        <div className="absolute -top-3 right-3 bg-[#1e3a8a] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          🏆 Best Pick
        </div>
      )}

      {/* Name + score row */}
      <div className="flex items-start justify-between gap-2 pt-1">
        <p className="font-bold text-slate-100 text-sm leading-tight truncate flex-1">{hotel.name}</p>
        <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${scoreColor(hotel.value_score)}`}>
          {hotel.value_score}<span className="text-[9px] font-normal">/10</span>
        </span>
      </div>

      {/* Best for */}
      <p className="text-[11px] text-[#d4a017] font-medium">Best for: {hotel.best_for}</p>

      {/* Pros */}
      {hotel.pros.length > 0 && (
        <ul className="flex flex-col gap-1">
          {hotel.pros.map((pro, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] text-emerald-400">
              <span className="shrink-0 mt-px">✓</span>
              <span>{pro}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Cons */}
      {hotel.cons.length > 0 && (
        <ul className="flex flex-col gap-1">
          {hotel.cons.map((con, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-400">
              <span className="shrink-0 mt-px text-red-400">✗</span>
              <span>{con}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Summary */}
      <p className="text-[10px] italic text-slate-500 mt-auto leading-relaxed">{hotel.summary}</p>
    </div>
  );
}

export default function HotelComparisonCard({ data }: Props) {
  const { hotels, winner, winner_reason, budget_pick, luxury_pick } = data;

  const isSameAsWinner = budget_pick === winner && luxury_pick === winner;

  return (
    <div className="w-full rounded-2xl bg-slate-900 border border-slate-700/60 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 border-b border-slate-700/50">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">🏨 Hotel Comparison</p>
      </div>

      {/* Winner banner */}
      {winner && (
        <div className="px-5 py-3 bg-gradient-to-r from-indigo-700/60 to-[#1e3a8a]/40 border-b border-[#1e3a8a]/30">
          <p className="text-sm font-bold text-blue-100">🏆 Best Pick: {winner}</p>
          {winner_reason && (
            <p className="text-xs text-[#d4a017]/80 mt-0.5">{winner_reason}</p>
          )}
        </div>
      )}

      {/* Hotel columns — horizontal scroll */}
      <div className="px-4 py-4 overflow-x-auto">
        <div className={`flex gap-3 ${hotels.length <= 2 ? "flex-wrap" : ""}`}>
          {hotels.map((hotel) => (
            <HotelCard key={hotel.name} hotel={hotel} isWinner={hotel.name === winner} />
          ))}
        </div>
      </div>

      {/* Budget / Luxury pills */}
      <div className="px-5 pb-4 flex flex-wrap gap-2">
        {isSameAsWinner ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1e3a8a]/20 border border-[#1e3a8a]/40 text-[#d4a017] text-xs font-medium">
            🏆 Best all-round: {winner}
          </span>
        ) : (
          <>
            {budget_pick && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
                💰 Best value: {budget_pick}
              </span>
            )}
            {luxury_pick && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1e3a8a]/20 border border-[#1e3a8a]/40 text-[#d4a017] text-xs font-medium">
                ✨ Best quality: {luxury_pick}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
