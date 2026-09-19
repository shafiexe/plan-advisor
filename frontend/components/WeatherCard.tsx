"use client";

import type { WeatherResult, WeatherForecastDay } from "@/types/weather";

function weatherEmoji(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes("thunder"))                        return "⛈️";
  if (d.includes("heavy rain") || d.includes("torrential")) return "🌧️";
  if (d.includes("drizzle") || d.includes("light rain"))   return "🌦️";
  if (d.includes("rain") || d.includes("shower"))          return "🌧️";
  if (d.includes("snow") || d.includes("blizzard"))        return "❄️";
  if (d.includes("mist") || d.includes("fog") || d.includes("haze")) return "🌫️";
  if (d.includes("overcast"))                       return "☁️";
  if (d.includes("cloudy"))                         return "⛅";
  if (d.includes("clear") || d.includes("sunny"))  return "☀️";
  if (d.includes("windy") || d.includes("breezy")) return "💨";
  return "🌤️";
}

function uvLabel(uv: number): { text: string; color: string } {
  if (uv <= 2)  return { text: "Low",       color: "text-emerald-400" };
  if (uv <= 5)  return { text: "Moderate",  color: "text-yellow-400" };
  if (uv <= 7)  return { text: "High",      color: "text-orange-400" };
  if (uv <= 10) return { text: "Very High", color: "text-red-400" };
  return          { text: "Extreme",   color: "text-[#d4a017]" };
}

function dayName(dateStr: string): string {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
  } catch { return dateStr; }
}

function monthDay(dateStr: string): string {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return ""; }
}

function ForecastDay({ day, isToday }: { day: WeatherForecastDay; isToday: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 flex-1 rounded-xl p-2.5 border transition-all
      ${isToday
        ? "bg-[#172554]/50 border-[#1e3a8a]/30"
        : "bg-slate-800/40 border-slate-700/30"}`}>
      <span className={`text-[11px] font-semibold ${isToday ? "text-[#d4a017]" : "text-slate-400"}`}>
        {isToday ? "Today" : dayName(day.date)}
      </span>
      <span className="text-[10px] text-slate-600">{monthDay(day.date)}</span>
      <span className="text-2xl leading-none my-1">{weatherEmoji(day.description)}</span>
      <span className="text-[10px] text-slate-400 text-center leading-tight min-h-[28px] flex items-center">
        {day.description}
      </span>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="text-[12px] font-bold text-slate-100">{day.max_temp_c}°</span>
        <span className="text-[11px] text-slate-500">{day.min_temp_c}°</span>
      </div>
      {day.rain_mm > 0 && (
        <span className="text-[10px] text-blue-400 font-medium">💧 {day.rain_mm}mm</span>
      )}
    </div>
  );
}

export default function WeatherCard({ data }: { data: WeatherResult }) {
  if (data.error) return null;

  const uv = uvLabel(data.uv_index);
  const todayIdx = 0;

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-700/50 shadow-xl shadow-black/30 bg-slate-900">

      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-br from-sky-950/60 to-slate-900/80 border-b border-slate-700/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-1">
              🌤️ &nbsp;Current Weather
            </p>
            <p className="text-sm font-semibold text-slate-200 leading-snug">{data.location}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-end gap-2">
              <span className="text-5xl leading-none">{weatherEmoji(data.description)}</span>
              <div>
                <p className="text-4xl font-bold text-slate-100 leading-none tabular-nums">{data.temp_c}°C</p>
                <p className="text-xs text-slate-500 mt-0.5">Feels {data.feels_like_c}°C</p>
              </div>
            </div>
            <p className="text-sm text-sky-300 mt-1.5 font-medium">{data.description}</p>
          </div>
        </div>

        {/* Conditions strip */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-700/40 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>💧</span>
            <span><span className="text-slate-200 font-semibold">{data.humidity}%</span> humidity</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>💨</span>
            <span><span className="text-slate-200 font-semibold">{data.wind_kmph} km/h</span> wind</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>👁️</span>
            <span><span className="text-slate-200 font-semibold">{data.visibility_km} km</span> visibility</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>☀️</span>
            <span>UV <span className={`font-semibold ${uv.color}`}>{data.uv_index} — {uv.text}</span></span>
          </div>
        </div>
      </div>

      {/* 3-day forecast */}
      {data.forecast.length > 0 && (
        <div className="p-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 mb-2">
            3-Day Forecast
          </p>
          <div className="flex gap-2">
            {data.forecast.map((day, i) => (
              <ForecastDay key={day.date || i} day={day} isToday={i === todayIdx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
