"use client";

import type { TravelInsurance } from "@/types/insurance";

export default function TravelInsuranceCard({ data }: { data: TravelInsurance }) {
  if (data.error && (!data.coverage_types || data.coverage_types.length === 0)) {
    return (
      <div className="w-full rounded-2xl bg-slate-900 border border-slate-700/60 p-4 text-slate-400 text-sm">
        Could not load insurance info: {data.error}
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl bg-slate-900 border border-slate-700/60 shadow-xl overflow-hidden">

      {/* Header */}
      <div className="px-5 pt-5 pb-4 bg-gradient-to-br from-indigo-950/60 to-slate-900 border-b border-slate-700/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">
              Travel Insurance
            </h2>
            <p className="text-sm text-indigo-300/80 mt-0.5">{data.destination}</p>
          </div>
          <span className="text-2xl shrink-0">🛡️</span>
        </div>

        {/* Visa requirement warning banner */}
        {data.visa_requirement && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-900/30 border border-amber-700/50 text-amber-300 text-xs font-medium">
            <span>⚠️</span>
            <span>Insurance required for visa to this destination</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">

        {/* Recommendation */}
        {data.recommendation && (
          <div className="px-4 py-3 rounded-xl bg-indigo-950/40 border border-indigo-700/40 text-sm text-indigo-200 leading-relaxed">
            {data.recommendation}
          </div>
        )}

        {/* Coverage types */}
        {data.coverage_types && data.coverage_types.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Coverage Types
            </h3>
            <div className="space-y-2">
              {data.coverage_types.map((c, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base shrink-0">{c.emoji}</span>
                      <span className="text-sm font-semibold text-slate-100">{c.type}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                        c.essential
                          ? "bg-red-900/40 border-red-700/40 text-red-300"
                          : "bg-slate-800 border-slate-600 text-slate-400"
                      }`}>
                        {c.essential ? "Essential" : "Optional"}
                      </span>
                      {c.recommended_minimum && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/40 border border-indigo-700/40 text-indigo-300">
                          {c.recommended_minimum}
                        </span>
                      )}
                    </div>
                  </div>
                  {c.why && (
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{c.why}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Cost estimate */}
        {data.cost_estimate && (
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Estimated Cost
            </h3>
            <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-4 text-center">
              <p className="text-2xl font-bold text-white">{data.cost_estimate.range}</p>
              <p className="text-xs text-indigo-300/80 mt-1">{data.cost_estimate.per}</p>
              {data.cost_estimate.note && (
                <p className="text-xs text-slate-500 mt-1">{data.cost_estimate.note}</p>
              )}
            </div>
          </section>
        )}

        {/* Providers */}
        {data.providers && data.providers.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Recommended Providers
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {data.providers.map((p, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-3"
                >
                  <p className="text-sm font-semibold text-slate-100">{p.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{p.note}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tips */}
        {data.tips && data.tips.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tips</h3>
            <ul className="space-y-1.5">
              {data.tips.map((t, i) => (
                <li key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                  <span className="text-indigo-400 shrink-0">•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

      </div>
    </div>
  );
}
