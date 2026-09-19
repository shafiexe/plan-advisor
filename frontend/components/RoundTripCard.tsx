"use client";

import type { RoundTripResult } from "@/types/flights";

type AlertData = { origin: string; destination: string; departureDate: string; price: number };

type Props = {
  data: RoundTripResult;
  streaming?: boolean;
  onSetAlert?: (data: AlertData) => void;
};

function fmt(price: number, currency: string): string {
  if (currency === "INR") return "₹" + price.toLocaleString("en-IN");
  return "$" + price.toLocaleString();
}

function LegSection({ leg, label, onSetAlert }: {
  leg: RoundTripResult["outbound"];
  label: string;
  onSetAlert?: Props["onSetAlert"];
}) {
  const results = leg.results?.slice(0, 3) ?? [];
  const minPrice = Math.min(...results.map(r => r.price_number).filter(Boolean));
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        <span className="text-xs font-semibold text-slate-300">{leg.origin} → {leg.destination}</span>
      </div>
      <div className="space-y-1.5">
        {results.map((r, i) => {
          const seg = r.segments?.[0];
          const isLowest = r.price_number === minPrice && minPrice > 0;
          return (
            <div key={i} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-all
              ${isLowest ? "bg-emerald-950/30 border-emerald-500/30" : "bg-slate-800/40 border-slate-700/40"}`}>
              <div className="flex items-center gap-2 min-w-0">
                {isLowest && <span className="text-[9px] font-bold text-emerald-400 shrink-0">BEST</span>}
                <span className="text-xs font-medium text-slate-200 truncate">{r.airline}</span>
                {seg && (
                  <span className="text-[11px] text-slate-500 shrink-0">
                    {seg.departs?.split(" ")[1]?.slice(0,5)} · {r.total_duration}
                    {r.stops === 0 ? " · Direct" : ` · ${r.stops}stop`}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-sm font-bold tabular-nums ${isLowest ? "text-emerald-400" : "text-slate-200"}`}>
                  {fmt(r.price_number, r.currency)}
                </span>
                {onSetAlert && (
                  <button
                    onClick={() => onSetAlert({
                      origin: leg.origin,
                      destination: leg.destination,
                      departureDate: seg?.departs?.split(" ")[0] ?? "",
                      price: r.price_number,
                    })}
                    className="text-[10px] text-slate-500 hover:text-amber-400 transition-colors"
                    title="Set price alert"
                  >🔔</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RoundTripCard({ data, streaming, onSetAlert }: Props) {
  const { outbound, return_flight } = data;
  const outMin = Math.min(...(outbound.results ?? []).map(r => r.price_number).filter(Boolean));
  const retMin = Math.min(...(return_flight.results ?? []).map(r => r.price_number).filter(Boolean));
  const totalMin = outMin + retMin;
  const currency = outbound.results?.[0]?.currency ?? "INR";

  return (
    <div className={`w-full rounded-2xl border border-slate-700/60 bg-slate-900/80 overflow-hidden shadow-lg transition-opacity ${streaming ? "opacity-70" : ""}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">✈️</span>
          <span className="text-sm font-semibold text-slate-100">
            {outbound.origin} ↔ {outbound.destination} · Round Trip
          </span>
        </div>
        {totalMin > 0 && (
          <div className="text-right">
            <p className="text-[10px] text-slate-500">Total from</p>
            <p className="text-sm font-bold text-[#d4a017] tabular-nums">{fmt(totalMin, currency)}</p>
          </div>
        )}
      </div>

      {/* Legs */}
      <div className="p-4 space-y-4">
        <LegSection leg={outbound} label="Outbound" onSetAlert={onSetAlert} />
        <div className="border-t border-slate-700/40" />
        <LegSection leg={return_flight} label="Return" onSetAlert={onSetAlert} />
      </div>
    </div>
  );
}
