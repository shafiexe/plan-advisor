"use client";

import type { PricePrediction } from "@/types/prediction";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "د.إ",
  SGD: "S$",
  THB: "฿",
  JPY: "¥",
  AUD: "A$",
  MYR: "RM",
};

function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code?.toUpperCase()] ?? code ?? "";
}

function fmt(n: number | null, sym: string): string {
  if (n == null) return "—";
  return `${sym}${n.toLocaleString("en-IN")}`;
}

const VERDICT_STYLES: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  great:      { border: "border-emerald-500/40", bg: "bg-emerald-900/20", text: "text-emerald-400", badge: "bg-emerald-900/40 text-emerald-300" },
  good:       { border: "border-sky-500/40",     bg: "bg-sky-900/20",     text: "text-sky-400",     badge: "bg-sky-900/40 text-sky-300" },
  fair:       { border: "border-amber-500/40",   bg: "bg-amber-900/20",   text: "text-amber-400",   badge: "bg-amber-900/40 text-amber-300" },
  expensive:  { border: "border-orange-500/40",  bg: "bg-orange-900/20",  text: "text-orange-400",  badge: "bg-orange-900/40 text-orange-300" },
  overpriced: { border: "border-red-500/40",     bg: "bg-red-900/20",     text: "text-red-400",     badge: "bg-red-900/40 text-red-300" },
};

type Props = { data: PricePrediction };

export default function PricePredictionCard({ data }: Props) {
  const {
    origin, destination, departure_date,
    price, currency,
    verdict, verdict_label, verdict_emoji,
    min_price, avg_price, max_price,
    percentile, tip, has_data,
  } = data;

  const style = VERDICT_STYLES[verdict] ?? VERDICT_STYLES.fair;
  const sym   = currencySymbol(currency);

  // Gauge position: clamp price within min–max range, map to 0–100%
  let gaugePos = 50;
  if (has_data && min_price != null && max_price != null && max_price > min_price) {
    gaugePos = Math.round(((price - min_price) / (max_price - min_price)) * 100);
    gaugePos = Math.max(2, Math.min(98, gaugePos));
  }
  const gaugeLeft = verdict === "great" || verdict === "good";

  return (
    <div className={`w-full rounded-2xl border ${style.border} ${style.bg} bg-slate-900/80 overflow-hidden shadow-lg`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40">
        <div className="flex items-center gap-2">
          <span className="text-base">✈️</span>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Price Analysis</span>
        </div>
        <span className="text-xs text-slate-500">
          {origin} → {destination} · {departure_date}
        </span>
      </div>

      {/* Verdict section */}
      <div className="flex items-center gap-4 px-5 py-4">
        <span className="text-4xl leading-none">{verdict_emoji}</span>
        <div>
          <p className={`text-2xl font-extrabold leading-tight ${style.text}`}>{verdict_label}</p>
          <p className="text-slate-400 text-sm mt-0.5">
            Your price: <span className="font-semibold text-slate-200">{sym}{price.toLocaleString("en-IN")}</span>
          </p>
        </div>
      </div>

      {/* Gauge bar */}
      {has_data && (
        <div className="px-5 pb-3">
          <div className="relative h-3 rounded-full bg-slate-700/60 overflow-visible mb-1">
            {/* Gradient fill */}
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${gaugePos}%`,
                background: gaugeLeft
                  ? "linear-gradient(to right, #10b981, #34d399)"
                  : "linear-gradient(to right, #f59e0b, #ef4444)",
              }}
            />
            {/* Avg marker */}
            {avg_price != null && max_price != null && min_price != null && max_price > min_price && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-slate-400/60 rounded-full"
                style={{
                  left: `${Math.round(((avg_price - min_price) / (max_price - min_price)) * 100)}%`,
                }}
              />
            )}
            {/* Price marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${gaugePos}%` }}
            >
              <div className={`w-4 h-4 rounded-full border-2 border-slate-900 shadow ${gaugeLeft ? "bg-emerald-400" : "bg-red-400"}`} />
            </div>
          </div>
          {/* Axis labels */}
          <div className="flex justify-between text-[11px] text-slate-500 mt-1.5">
            <span>{fmt(min_price, sym)}</span>
            <span className="text-slate-400">{fmt(avg_price, sym)} avg</span>
            <span>{fmt(max_price, sym)}</span>
          </div>
        </div>
      )}

      {/* Stats pills */}
      {has_data && (
        <div className="flex gap-2 px-5 pb-3 flex-wrap">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${style.badge}`}>
            Min {fmt(min_price, sym)}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${style.badge}`}>
            Avg {fmt(avg_price, sym)}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${style.badge}`}>
            Max {fmt(max_price, sym)}
          </span>
        </div>
      )}

      {/* Percentile */}
      {has_data && percentile != null && (
        <p className="px-5 pb-2 text-xs text-slate-400">
          Cheaper than <span className="font-semibold text-slate-200">{percentile}%</span> of flights this month
        </p>
      )}

      {/* Tip */}
      <div className="px-5 py-3 border-t border-slate-700/40">
        <p className="text-xs text-slate-400 italic leading-relaxed">{tip}</p>
      </div>
    </div>
  );
}
