"use client";

import type { CurrencyRate, CurrencyResult } from "@/types/currency";

function formatAmount(amount: number, symbol: string): string {
  if (amount >= 1_000_000) {
    return `${symbol}${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `${symbol}${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  }
  return `${symbol}${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function RateRow({ rate, isHighlighted }: { rate: CurrencyRate; isHighlighted: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all
        ${isHighlighted
          ? "bg-indigo-950/40 border-indigo-500/30"
          : "bg-slate-800/40 border-slate-700/30 hover:border-slate-600/60"}`}
    >
      {/* Flag + name */}
      <span className="text-xl leading-none shrink-0">{rate.flag}</span>
      <div className="flex flex-col min-w-0 flex-1">
        <span className={`text-xs font-medium leading-tight truncate ${isHighlighted ? "text-indigo-200" : "text-slate-300"}`}>
          {rate.currency}
        </span>
        <span className="text-[10px] text-slate-500 leading-tight">{rate.code}</span>
      </div>

      {/* Converted amount */}
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold tabular-nums ${isHighlighted ? "text-indigo-300" : "text-emerald-400"}`}>
          {formatAmount(rate.converted, rate.symbol)}
        </p>
        <p className="text-[10px] text-slate-500 tabular-nums">
          1 = {rate.symbol}{rate.rate.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
        </p>
      </div>
    </div>
  );
}

export default function CurrencyCard({ data }: { data: CurrencyResult }) {
  if (data.error) return null;
  if (!data.rates?.length) return null;

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-700/50 shadow-xl shadow-black/30 bg-slate-900">

      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-br from-emerald-950/50 to-slate-900/80 border-b border-slate-700/50">
        <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-1">
          💱 &nbsp;Currency Conversion
        </p>
        <p className="text-xl font-bold text-slate-100 tabular-nums leading-snug">
          {data.amount.toLocaleString("en", { maximumFractionDigits: 2 })}{" "}
          <span className="text-slate-400 font-semibold">{data.base_currency}</span>
        </p>
      </div>

      {/* Rate grid */}
      <div className="p-3 flex flex-col gap-1.5">
        {data.rates.map((rate) => (
          <RateRow
            key={rate.code}
            rate={rate}
            isHighlighted={rate.code === "INR"}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-slate-700/40">
        <p className="text-[10px] text-slate-600">
          Rates from open.er-api.com · updated hourly
        </p>
      </div>
    </div>
  );
}
