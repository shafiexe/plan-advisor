"use client";

import type { TripBudget, BudgetItem } from "@/types/budget";

function currencySymbol(code: string): string {
  const map: Record<string, string> = {
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
  return map[code?.toUpperCase()] ?? code ?? "₹";
}

function fmt(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

const ITEM_COLORS: Record<string, string> = {
  Flights: "bg-indigo-500",
  Hotel: "bg-purple-500",
  Meals: "bg-emerald-500",
  Activities: "bg-amber-500",
  Misc: "bg-slate-400",
};

function itemColor(label: string): string {
  for (const key of Object.keys(ITEM_COLORS)) {
    if (label.toLowerCase().includes(key.toLowerCase())) return ITEM_COLORS[key];
  }
  return "bg-slate-500";
}

type Props = { data: TripBudget };

export default function TripBudgetCard({ data }: Props) {
  if (data.error || data.total <= 0) return null;

  const sym = currencySymbol(data.currency);
  const { items, total, per_person, num_people, destination, from_city, nights, days } = data;

  return (
    <div className="w-full rounded-2xl border border-slate-700/60 bg-slate-900 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700/60 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">💰</span>
            <span className="text-sm font-bold text-slate-100 tracking-wide">Trip Budget</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {from_city ? `${from_city} → ` : ""}{destination}
            {nights > 0 || days > 0 ? (
              <> &middot; {nights > 0 ? `${nights} night${nights !== 1 ? "s" : ""}` : ""}{nights > 0 && days > 0 ? " · " : ""}{days > 0 ? `${days} day${days !== 1 ? "s" : ""}` : ""}</>
            ) : null}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Total</div>
          <div className="text-lg font-bold text-emerald-400">{fmt(total, sym)}</div>
        </div>
      </div>

      {/* Stacked bar */}
      {items.length > 0 && (
        <div className="flex h-2 w-full overflow-hidden">
          {items.map((item) => (
            <div
              key={item.label}
              className={`${itemColor(item.label)} h-full transition-all`}
              style={{ width: `${(item.amount / total) * 100}%` }}
              title={`${item.label}: ${fmt(item.amount, sym)}`}
            />
          ))}
        </div>
      )}

      {/* Itemized rows */}
      <div className="divide-y divide-slate-700/40">
        {items.map((item: BudgetItem) => {
          const pct = total > 0 ? Math.round((item.amount / total) * 100) : 0;
          return (
            <div key={item.label} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-base w-6 text-center shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-200">{item.label.trim()}</div>
                <div className="text-xs text-slate-500 truncate">{item.detail}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-slate-100">{fmt(item.amount, sym)}</div>
                <div className="text-[11px] text-slate-500">{pct}%</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Divider + Total row */}
      <div className="border-t border-slate-700/60 bg-slate-800/40 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-200">Total</span>
        <span className="text-xl font-bold text-emerald-400">{fmt(total, sym)}</span>
      </div>

      {/* Per-person row */}
      {num_people > 1 && (
        <div className="border-t border-slate-700/40 px-4 py-2 flex items-center justify-between bg-slate-900/60">
          <span className="text-xs text-slate-500">Per person ({num_people} travellers)</span>
          <span className="text-sm font-semibold text-slate-300">{fmt(per_person, sym)}</span>
        </div>
      )}
    </div>
  );
}
