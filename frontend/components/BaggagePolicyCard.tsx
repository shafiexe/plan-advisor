"use client";

import type { BaggagePolicy, BaggageAllowance } from "@/types/baggagePolicy";

function classLabel(c: string) {
  const map: Record<string, string> = {
    economy: "Economy",
    premium_economy: "Premium Economy",
    business: "Business",
    first: "First Class",
  };
  return map[c] ?? c;
}

function routeLabel(r: string) {
  return r === "domestic" ? "Domestic" : "International";
}

function AllowanceBlock({
  label,
  data,
  accent,
}: {
  label: string;
  data: BaggageAllowance;
  accent: "indigo" | "purple";
}) {
  const borderCls = accent === "indigo" ? "border-[#1e3a8a]/30" : "border-[#1e3a8a]/30";
  const bgCls     = accent === "indigo" ? "bg-[#172554]/40"     : "bg-purple-950/40";
  const textCls   = accent === "indigo" ? "text-[#d4a017]"       : "text-[#d4a017]";

  return (
    <div className={`rounded-xl p-3 border ${borderCls} ${bgCls} flex flex-col gap-1.5`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${textCls}`}>{label}</p>
      <p className="text-2xl font-bold text-white">{data.allowance}</p>
      <div className="flex flex-wrap gap-1.5">
        {data.dimensions && (
          <span className="text-[11px] bg-slate-700 text-slate-300 rounded px-2 py-0.5">{data.dimensions}</span>
        )}
        <span className="text-[11px] bg-slate-700 text-slate-300 rounded px-2 py-0.5">
          {data.pieces} piece{data.pieces !== 1 ? "s" : ""}
        </span>
      </div>
      {data.extra_piece_fee && (
        <p className="text-xs text-amber-400">Extra: {data.extra_piece_fee}</p>
      )}
      {data.note && (
        <p className="text-xs text-slate-400 italic">{data.note}</p>
      )}
    </div>
  );
}

export default function BaggagePolicyCard({ data }: { data: BaggagePolicy }) {
  return (
    <div className="w-full bg-slate-900 rounded-2xl border border-slate-700/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧳</span>
          <div>
            <p className="font-semibold text-sm text-white">Baggage Policy — {data.airline}</p>
            <p className="text-xs text-slate-500">
              {classLabel(data.travel_class)} · {routeLabel(data.route_type)}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <span className="text-[11px] bg-slate-800 border border-slate-600 text-slate-300 rounded-full px-2 py-0.5">
            {classLabel(data.travel_class)}
          </span>
          <span className="text-[11px] bg-slate-800 border border-slate-600 text-slate-300 rounded-full px-2 py-0.5">
            {routeLabel(data.route_type)}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Allowance columns */}
        {(data.cabin_baggage || data.checked_baggage) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.cabin_baggage && (
              <AllowanceBlock label="Cabin Bag" data={data.cabin_baggage} accent="indigo" />
            )}
            {data.checked_baggage && (
              <AllowanceBlock label="Checked Baggage" data={data.checked_baggage} accent="purple" />
            )}
          </div>
        )}

        {/* Liquid rule */}
        {data.liquid_rule && (
          <div className="flex items-start gap-2 bg-blue-950/30 border border-blue-700/30 rounded-xl px-3 py-2.5">
            <span className="text-base shrink-0 mt-0.5">💧</span>
            <p className="text-xs text-blue-200"><span className="font-semibold">Liquid rule:</span> {data.liquid_rule}</p>
          </div>
        )}

        {/* Prohibited items */}
        {data.prohibited_items && data.prohibited_items.length > 0 && (
          <div className="bg-red-950/30 border border-red-700/30 rounded-xl p-3">
            <p className="text-xs font-semibold text-red-400 mb-2">🚫 Not allowed</p>
            <div className="flex flex-wrap gap-1.5">
              {data.prohibited_items.map((item, i) => (
                <span key={i} className="text-[11px] bg-red-900/40 text-red-300 border border-red-700/30 rounded px-2 py-0.5">
                  ✕ {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Special items */}
        {data.special_items && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Special Items</p>
            <div className="flex flex-col gap-1">
              {data.special_items.laptop && (
                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <span>💻</span><span><span className="text-slate-400">Laptop:</span> {data.special_items.laptop}</span>
                </div>
              )}
              {data.special_items.medicines && (
                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <span>💊</span><span><span className="text-slate-400">Medicines:</span> {data.special_items.medicines}</span>
                </div>
              )}
              {data.special_items.sports_equipment && (
                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <span>🏋️</span><span><span className="text-slate-400">Sports equipment:</span> {data.special_items.sports_equipment}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tips */}
        {data.tips && data.tips.length > 0 && (
          <div className="bg-amber-950/30 border border-amber-700/30 rounded-xl p-3">
            <p className="text-xs font-semibold text-amber-400 mb-2">💡 Tips</p>
            <ul className="flex flex-col gap-1">
              {data.tips.map((tip, i) => (
                <li key={i} className="text-xs text-amber-200">• {tip}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Oversize fee */}
        {data.oversize_fee && (
          <p className="text-xs text-slate-500 text-center">Oversize fee: {data.oversize_fee}</p>
        )}
      </div>
    </div>
  );
}
