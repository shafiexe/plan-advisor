"use client";

import { useState } from "react";
import type { WeatherForecast, ForecastDay } from "@/types/weatherForecast";

type Props = { data: WeatherForecast };

function StatPill({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-slate-800 rounded-lg p-2 text-center flex-1 min-w-0">
      <div className="text-base leading-none mb-0.5">{icon}</div>
      <div className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="text-xs font-semibold text-slate-200 mt-0.5 truncate">{value}</div>
    </div>
  );
}

export default function WeatherForecastCard({ data }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const days: ForecastDay[] = data.days ?? [];
  const selected: ForecastDay | undefined = days[selectedIdx];

  const isBest  = (dayName: string) => (data.best_days ?? []).includes(dayName);
  const isWorst = (dayName: string) => (data.worst_days ?? []).includes(dayName);

  return (
    <div className="w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/50 shadow-xl">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-700/40 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">🌤️</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-100 leading-tight">7-Day Weather Forecast</p>
            <p className="text-xs text-slate-400 truncate">{data.destination}</p>
          </div>
        </div>
        {data.source === "estimate" ? (
          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-900/40 text-amber-300 border border-amber-700/40">
            AI estimate
          </span>
        ) : (
          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-900/40 text-emerald-300 border border-emerald-700/40">
            Live
          </span>
        )}
      </div>

      {/* Overall summary */}
      {data.overall_summary && (
        <div className="px-4 py-2 bg-indigo-950/30 border-b border-indigo-900/20">
          <p className="text-xs text-indigo-300">✨ {data.overall_summary}</p>
        </div>
      )}

      {/* Best / Worst day pills */}
      {((data.best_days?.length ?? 0) > 0 || (data.worst_days?.length ?? 0) > 0) && (
        <div className="flex flex-wrap gap-2 px-4 py-2 border-b border-slate-700/40">
          {(data.best_days?.length ?? 0) > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-900/30 text-emerald-300 border border-emerald-700/30">
              ☀️ Best: {data.best_days.join(", ")}
            </span>
          )}
          {(data.worst_days?.length ?? 0) > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-900/30 text-amber-300 border border-amber-700/30">
              🌧️ Avoid: {data.worst_days.join(", ")}
            </span>
          )}
        </div>
      )}

      {/* Horizontal day scroll */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 px-4 py-3 w-max">
          {days.map((day, idx) => {
            const isSelected = idx === selectedIdx;
            const best  = isBest(day.day_name);
            const worst = isWorst(day.day_name);
            const ringClass = isSelected
              ? "ring-1 ring-indigo-400"
              : best
              ? "ring-1 ring-emerald-500/60"
              : worst
              ? "ring-1 ring-amber-500/60"
              : "ring-1 ring-transparent";

            return (
              <button
                key={day.date}
                onClick={() => setSelectedIdx(idx)}
                className={`bg-slate-800 rounded-xl px-3 py-2 text-center shrink-0 w-[88px] cursor-pointer
                  transition-all hover:bg-slate-700/80 ${ringClass}`}
              >
                <p className="text-[10px] text-slate-400 uppercase tracking-wide leading-none mb-1">
                  {day.day_name.slice(0, 3)}
                </p>
                <div className="text-2xl leading-none my-1">{day.emoji}</div>
                <p className="text-sm font-bold text-slate-100 leading-none">{Math.round(day.temp_high)}°</p>
                <p className="text-xs text-slate-400 leading-none mt-0.5">{Math.round(day.temp_low)}°</p>
                {day.precip_chance > 20 && (
                  <p className="text-[10px] text-blue-400 mt-1 leading-none">💧{day.precip_chance}%</p>
                )}
                {day.uv_index >= 6 && (
                  <p className="text-[10px] text-amber-400 mt-0.5 leading-none">☀️UV{day.uv_index}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail panel for selected day */}
      {selected && (
        <div className="px-4 py-3 border-t border-slate-700/40 space-y-3">
          {/* Condition + travel note */}
          <div>
            <p className="text-xs font-semibold text-slate-200">
              {selected.emoji} {selected.condition} · {selected.day_name}
            </p>
            {selected.travel_note && (
              <p className="text-xs text-slate-400 mt-0.5">{selected.travel_note}</p>
            )}
          </div>

          {/* 4 stat pills */}
          <div className="flex gap-2">
            <StatPill icon="💧" label="Humidity" value={`${selected.humidity}%`} />
            <StatPill icon="💨" label="Wind"     value={`${Math.round(selected.wind_kph)} km/h`} />
            <StatPill icon="🌅" label="Sunrise"  value={selected.sunrise} />
            <StatPill icon="🌇" label="Sunset"   value={selected.sunset} />
          </div>
        </div>
      )}

      {/* Packing tip */}
      {data.packing_weather_tip && (
        <div className="px-4 py-3 border-t border-slate-700/40">
          <p className="text-xs italic text-slate-400">🧳 {data.packing_weather_tip}</p>
        </div>
      )}
    </div>
  );
}
