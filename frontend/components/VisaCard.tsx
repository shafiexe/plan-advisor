"use client";

import type { VisaResult } from "@/types/visa";

const COLOR_MAP = {
  green: {
    badge: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    header: "from-emerald-950/40",
    icon: "bg-emerald-600/20 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  blue: {
    badge: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
    header: "from-sky-950/40",
    icon: "bg-sky-600/20 border-sky-500/30",
    dot: "bg-sky-400",
  },
  amber: {
    badge: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    header: "from-amber-950/40",
    icon: "bg-amber-600/20 border-amber-500/30",
    dot: "bg-amber-400",
  },
  red: {
    badge: "bg-red-500/20 text-red-300 border border-red-500/30",
    header: "from-red-950/40",
    icon: "bg-red-600/20 border-red-500/30",
    dot: "bg-red-400",
  },
  gray: {
    badge: "bg-slate-700/60 text-slate-400 border border-slate-600/40",
    header: "from-slate-800/40",
    icon: "bg-slate-700/40 border-slate-600/30",
    dot: "bg-slate-500",
  },
};

function embassySearchUrl(passport: string, destination: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${destination} embassy visa requirements for ${passport} citizens`)}`;
}

export default function VisaCard({ data }: { data: VisaResult }) {
  const c = COLOR_MAP[data.color] ?? COLOR_MAP.gray;

  return (
    <div className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/80 shadow-xl shadow-black/30 overflow-hidden">

      {/* Header */}
      <div className={`px-4 py-3 border-b border-slate-800 flex items-center gap-3 bg-gradient-to-r ${c.header} to-slate-900/40`}>
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-lg ${c.icon}`}>
          {data.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-200">
            {data.passport_country} → {data.destination_country}
          </p>
          <p className="text-[11px] text-slate-500">Visa & Entry Requirements</p>
        </div>
        {/* Visa type badge */}
        <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${c.badge}`}>
          {data.label}
        </span>
      </div>

      {/* Error state */}
      {data.error && (
        <div className="px-4 py-3 text-sm text-slate-400">
          {data.error} — check the official embassy website for current requirements.
        </div>
      )}

      {/* Main content */}
      {!data.error && (
        <div className="p-4 space-y-4">

          {/* Days allowed */}
          {data.days_allowed && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/40">
              <span className="text-2xl">📅</span>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  Up to {data.days_allowed} days
                </p>
                <p className="text-[11px] text-slate-500">Maximum stay per visit</p>
              </div>
            </div>
          )}

          {/* Notes */}
          {data.notes.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Entry Requirements
              </p>
              <ul className="space-y-2">
                {data.notes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${c.dot}`} />
                    <span className="text-sm text-slate-300 leading-relaxed">{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Embassy / official info link */}
          <div className="pt-1">
            <a
              href={embassySearchUrl(data.passport_country, data.destination_country)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#d4a017] hover:text-[#d4a017] transition-colors"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Official visa &amp; embassy information →
            </a>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="px-4 py-2 border-t border-slate-800 bg-slate-900/40">
        <p className="text-[10px] text-slate-600">
          Requirements change — always verify with the official embassy or consulate before travel.
        </p>
      </div>
    </div>
  );
}
