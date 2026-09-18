"use client";

import type { PriceCalendarResult, CalendarPrice } from "@/types/flights";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function parseYearMonth(ym: string): { year: number; month: number } {
  const [y, m] = ym.split("-").map(Number);
  return { year: y, month: m };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function firstDayOfWeek(year: number, month: number): number {
  // 0=Sun → convert to Mon-based (Mon=0, Sun=6)
  const d = new Date(year, month - 1, 1).getDay();
  return (d + 6) % 7;
}

function priceColor(price: number, min: number, max: number): string {
  if (max === min) return "bg-emerald-600/30 text-emerald-300 border-emerald-500/40";
  const pct = (price - min) / (max - min);
  if (pct < 0.33) return "bg-emerald-900/50 text-emerald-300 border-emerald-500/40";
  if (pct < 0.66) return "bg-amber-900/50 text-amber-300 border-amber-500/40";
  return "bg-rose-900/50 text-rose-300 border-rose-500/40";
}

function formatINR(n: number, currency: string): string {
  if (currency === "INR") return `₹${Math.round(n).toLocaleString("en-IN")}`;
  return `$${Math.round(n).toLocaleString()}`;
}

export default function PriceCalendarCard({
  data,
  onSelectDate,
}: {
  data: PriceCalendarResult;
  onSelectDate?: (date: string) => void;
}) {
  const { origin, destination, year_month, currency, prices } = data;
  if (!prices?.length) return null;

  const { year, month } = parseYearMonth(year_month);
  const total = daysInMonth(year, month);
  const startDow = firstDayOfWeek(year, month); // 0=Mon

  // Build lookup: day number → CalendarPrice
  const byDay: Record<number, CalendarPrice> = {};
  for (const p of prices) {
    const day = parseInt(p.date.split("-")[2]);
    byDay[day] = p;
  }

  const priceValues = prices.map(p => p.price);
  const minPrice = Math.min(...priceValues);
  const maxPrice = Math.max(...priceValues);
  const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;

  // Build calendar cells: leading blanks + day numbers
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];

  const monthLabel = `${MONTHS[month - 1]} ${year}`;
  const cheapestDay = prices.reduce((a, b) => a.price < b.price ? a : b);

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-black/40 bg-slate-900">

      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/80 to-slate-900/80">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-slate-100">{origin}</span>
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <span className="text-xl font-bold text-slate-100">{destination}</span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">Price calendar · {monthLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Cheapest day</p>
            <p className="text-lg font-bold text-emerald-400">
              {formatINR(cheapestDay.price, currency)}
            </p>
            <p className="text-[11px] text-slate-500">{cheapestDay.date} · {cheapestDay.airline}</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-3 text-[10px]">
          <span className="flex items-center gap-1 text-slate-500">Legend:</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-600/50" /> Cheap</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-600/50" /> Average</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-600/50" /> Expensive</span>
          <span className="ml-auto text-slate-600">{prices.length} days with prices</span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="p-4">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-slate-500 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (!day) {
              return <div key={`blank-${idx}`} />;
            }
            const priceData = byDay[day];
            if (!priceData) {
              return (
                <div key={day} className="aspect-square flex flex-col items-center justify-center rounded-lg bg-slate-800/30 border border-slate-700/20">
                  <span className="text-[11px] text-slate-600 font-medium">{day}</span>
                  <span className="text-[9px] text-slate-700 mt-0.5">—</span>
                </div>
              );
            }
            const color = priceColor(priceData.price, minPrice, maxPrice);
            const isCheapest = priceData.price === minPrice;
            return (
              <button
                key={day}
                onClick={() => onSelectDate?.(priceData.date)}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg border text-left
                  transition-all active:scale-95 hover:brightness-125 ${color}
                  ${isCheapest ? "ring-1 ring-emerald-400/50" : ""}`}
                title={`${priceData.date} · ${priceData.airline} · ${formatINR(priceData.price, currency)}`}
              >
                <span className="text-[11px] font-semibold">{day}</span>
                <span className="text-[9px] font-bold tabular-nums leading-tight">
                  {currency === "INR"
                    ? `₹${(priceData.price / 1000).toFixed(1)}k`
                    : `$${Math.round(priceData.price)}`}
                </span>
                {isCheapest && <span className="text-[7px] leading-none mt-0.5">★</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer note */}
      <div className="px-5 pb-4 text-[11px] text-slate-600">
        Tap any date to search flights for that day. Prices via Travelpayouts — may vary at booking.
      </div>
    </div>
  );
}
