"use client";

import type { RestaurantSearchResult, Restaurant } from "@/types/places";
import MarkdownBody from "./MarkdownBody";

type Props = {
  data: RestaurantSearchResult;
  analysis?: string;
  streaming?: boolean;
};

const PRICE_COLORS: Record<string, string> = {
  "$":    "text-emerald-400",
  "$$":   "text-emerald-300",
  "$$$":  "text-amber-300",
  "$$$$": "text-red-400",
};

function StarRating({ n }: { n: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`text-xs ${i < Math.round(n) ? "text-amber-400" : "text-slate-700"}`}>★</span>
      ))}
      <span className="ml-1 text-[11px] text-slate-400">{n > 0 ? n.toFixed(1) : ""}</span>
    </span>
  );
}

function RestaurantRow({ r }: { r: Restaurant }) {
  return (
    <div className="flex gap-3 p-3 rounded-xl border border-slate-700/50 bg-slate-800/40
      hover:border-amber-500/20 hover:bg-slate-800/70 transition-all">

      {/* Thumbnail */}
      <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-slate-700/60 flex items-center justify-center">
        {r.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.thumbnail} alt={r.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl">🍽️</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-semibold text-slate-200 truncate">{r.name}</p>
          {r.price && (
            <span className={`shrink-0 text-xs font-bold ${PRICE_COLORS[r.price] ?? "text-slate-400"}`}>
              {r.price}
            </span>
          )}
        </div>

        {r.type && (
          <p className="text-[11px] text-slate-500 truncate">{r.type}</p>
        )}

        {r.rating > 0 && (
          <div className="flex items-center gap-2 mt-0.5">
            <StarRating n={r.rating} />
            {r.reviews > 0 && (
              <span className="text-[10px] text-slate-600">
                ({r.reviews.toLocaleString()})
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
          {r.address && (
            <span className="text-[10px] text-slate-600 truncate">📍 {r.address}</span>
          )}
          {r.hours && (
            <span className="text-[10px] text-slate-600">🕐 {r.hours}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RestaurantCard({ data, analysis, streaming }: Props) {
  const { location, cuisine_filter, restaurants_found, results } = data;

  const headerLabel = cuisine_filter
    ? `${cuisine_filter} restaurants in ${location}`
    : `Restaurants in ${location}`;

  return (
    <div className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/80
      shadow-xl shadow-black/30 overflow-hidden">

      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-3
        bg-gradient-to-r from-amber-950/30 to-slate-900/40">
        <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/30
          flex items-center justify-center text-lg">
          🍽️
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-200 truncate">{headerLabel}</p>
          <p className="text-[11px] text-slate-500">Real ratings from Google Local</p>
        </div>
        <span className="text-xs text-slate-500 shrink-0">{restaurants_found} found</span>
      </div>

      {/* Restaurant list */}
      <div className="p-3 space-y-2">
        {results.map((r, i) => (
          <RestaurantRow key={i} r={r} />
        ))}
        {results.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-4">No restaurants found for this area.</p>
        )}
      </div>

      {/* Claude's commentary */}
      {(analysis || streaming) && (
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/40">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Plan Advisor Picks
          </p>
          <div className="text-sm text-slate-300 leading-relaxed">
            <MarkdownBody text={analysis ?? ""} />
            {streaming && (
              <span className="inline-block w-0.5 h-4 bg-indigo-300 ml-1 cursor-blink rounded-sm align-middle" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
