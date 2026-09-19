"use client";

import type { TripRecap } from "@/types/tripRecap";

type Props = { data: TripRecap };

function StarRating({ rating }: { rating: number }) {
  // Round to nearest 0.5
  const rounded = Math.round(rating * 2) / 2;
  const full = Math.floor(rounded);
  const half = rounded - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <span className="text-amber-400 text-base leading-none" title={`${rating} / 5`}>
      {"★".repeat(full)}
      {half ? "½" : ""}
      {"☆".repeat(empty)}
    </span>
  );
}

export default function TripRecapCard({ data }: Props) {
  const { destination, dates, duration_days, headline, narrative, stats, highlights, next_time, travel_style_label, mood_emoji, rating } = data;

  const statPills = [
    { icon: "📅", label: "Days", value: String(duration_days || stats?.days || "–") },
    ...(stats?.cities_visited?.length
      ? [{ icon: "🏙️", label: "Cities", value: stats.cities_visited.join(", ") }]
      : []),
    ...(stats?.places_count
      ? [{ icon: "📍", label: "Places", value: String(stats.places_count) }]
      : []),
    ...(stats?.total_spent
      ? [{ icon: "💰", label: "Spent", value: stats.total_spent }]
      : []),
  ];

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900 shadow-lg">

      {/* Header */}
      <div className="bg-slate-800/60 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-3xl shrink-0">{mood_emoji}</span>
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-100 truncate">{destination}</p>
            {dates && <p className="text-xs text-slate-400 truncate">{dates}</p>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <StarRating rating={rating} />
          <p className="text-[10px] text-slate-500 mt-0.5">{rating.toFixed(1)} / 5</p>
        </div>
      </div>

      {/* Headline */}
      {headline && (
        <p className="text-sm italic text-[#d4a017] px-4 pt-3 pb-1">✨ {headline}</p>
      )}

      {/* Stats pills */}
      {statPills.length > 0 && (
        <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-none">
          {statPills.map((pill) => (
            <div
              key={pill.label}
              className="bg-slate-800 rounded-lg px-3 py-2 text-center shrink-0 min-w-[72px]"
            >
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">{pill.label}</p>
              <p className="text-sm font-semibold text-slate-100 mt-0.5 whitespace-nowrap">{pill.icon} {pill.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Narrative */}
      {narrative && (
        <div className="border-t border-slate-700/40 px-4 py-3">
          <p className="text-sm text-slate-300 leading-relaxed">{narrative}</p>
        </div>
      )}

      {/* Highlights */}
      {highlights?.length > 0 && (
        <div className="border-t border-slate-700/40 px-4 py-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Highlights</p>
          <ul className="flex flex-col gap-1.5">
            {highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                <span className="shrink-0">⭐</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Travel style badge */}
      {travel_style_label && (
        <div className="border-t border-slate-700/40 px-4 py-3 flex justify-center">
          <span className="bg-amber-900/40 text-amber-300 text-xs px-3 py-1 rounded-full">
            {travel_style_label}
          </span>
        </div>
      )}

      {/* Next time */}
      {next_time?.length > 0 && (
        <div className="border-t border-slate-700/40 px-4 py-3 pb-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">🔮 Next visit</p>
          <ul className="flex flex-col gap-1.5">
            {next_time.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#d4a017]">
                <span className="shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
