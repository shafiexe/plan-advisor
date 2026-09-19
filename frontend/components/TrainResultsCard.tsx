"use client";

import type { TrainSearchResult, TrainResult } from "@/types/transport";
import MarkdownBody from "./MarkdownBody";

type Props = {
  data: TrainSearchResult;
  analysis?: string;
  streaming?: boolean;
};

type ParsedTrain = {
  name: string;
  number: string;
  departs: string;
  arrives: string;
  duration: string;
  fromPrice: string;
  classes: string;
  link: string;
};

function parseTrain(r: TrainResult): ParsedTrain {
  const text = r.snippet || r.title || "";

  const nameMatch = r.title.match(/^(.+?)\s*[\(（](\d{4,5})[\)）]/);
  const name   = nameMatch ? nameMatch[1].trim() : r.title.replace(/\(.*\)/, "").trim();
  const number = nameMatch ? nameMatch[2] : (r.title.match(/\d{4,5}/) ?? [""])[0];

  const depMatch = text.match(/Departs?\s+(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i)
                ?? text.match(/(\d{1,2}:\d{2})\s*[-–→]/);
  const arrMatch = text.match(/arrives?\s+(\d{1,2}:\d{2}(?:\s*[AP]M)?(?:\s*\(\+\d+\s*day[s]?\))?)/i)
                ?? text.match(/[-–→]\s*(\d{1,2}:\d{2}(?:\s*\(\+\d+\s*day[s]?\))?)/);
  const durMatch = text.match(/~?(\d+h(?:\s*\d+m)?|\d+\s*hr[s]?\s*\d+\s*min[s]?)/i)
                ?? text.match(/\|\s*(~?\d[\dh m]+)\s*\|/);
  const priceMatch = text.match(/(?:From\s*)?₹\s*(\d[\d,]+)/i);
  const classMatch = text.match(/\(([^)]+class[^)]*|Sleeper[^)]*|AC[^)]*)\)/i)
                  ?? text.match(/\b(Sleeper|2AC|3AC|1AC|CC|EC)\b/);

  return {
    name,
    number,
    departs:   depMatch?.[1] ?? "—",
    arrives:   arrMatch?.[1] ?? "—",
    duration:  durMatch?.[1] ?? "—",
    fromPrice: priceMatch ? `₹${priceMatch[1]}` : "—",
    classes:   classMatch?.[1] ?? "Sleeper / AC",
    link:      r.link,
  };
}

const CLASS_COLORS: Record<string, string> = {
  Sleeper: "bg-emerald-900/40 text-emerald-300",
  "3AC":   "bg-blue-900/40 text-blue-300",
  "2AC":   "bg-[#1e3a8a]/40 text-[#d4a017]",
  "1AC":   "bg-purple-900/40 text-[#d4a017]",
};
function classBadge(cls: string) {
  const key = Object.keys(CLASS_COLORS).find(k => cls.includes(k)) ?? "";
  return CLASS_COLORS[key] ?? "bg-slate-700/60 text-slate-300";
}

export default function TrainResultsCard({ data, analysis, streaming }: Props) {
  const trains = (data.results ?? []).map(parseTrain).filter(t => t.name);

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/80 shadow-lg">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-800/60">
        <span className="text-xl">🚆</span>
        <div>
          <div className="text-sm font-semibold text-slate-100">Train Options</div>
          <div className="text-[11px] text-slate-400">
            {data.origin} → {data.destination}
            {data.date ? ` · ${data.date}` : ""}
          </div>
        </div>
        <div className="ml-auto text-[11px] text-slate-500 font-medium">
          {trains.length} train{trains.length !== 1 ? "s" : ""} found
        </div>
      </div>

      {/* Table */}
      {trains.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-slate-800/50">
              <tr>
                {["Train", "Departs", "Arrives", "Duration", "From", "Class", ""].map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {trains.map((t, i) => (
                <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-3 py-2.5 align-middle">
                    <div className="font-medium text-slate-200 leading-tight">{t.name}</div>
                    {t.number && (
                      <div className="text-[10px] text-slate-500 mt-0.5">#{t.number}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-slate-300 font-mono tabular-nums whitespace-nowrap">{t.departs}</td>
                  <td className="px-3 py-2.5 align-middle text-slate-300 font-mono tabular-nums whitespace-nowrap">{t.arrives}</td>
                  <td className="px-3 py-2.5 align-middle text-slate-400 whitespace-nowrap">{t.duration}</td>
                  <td className="px-3 py-2.5 align-middle">
                    <span className="font-semibold text-emerald-400 whitespace-nowrap">{t.fromPrice}</span>
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${classBadge(t.classes)}`}>
                      {t.classes}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    {t.link && (
                      <a href={t.link} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1e3a8a]/20 text-[#d4a017] border border-[#1e3a8a]/30 hover:bg-[#1e3a8a]/40 transition-colors text-[10px] font-medium whitespace-nowrap">
                        Book →
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Booking links */}
      {data.book_at && data.book_at.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-800/60 flex flex-wrap gap-2 items-center">
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Book on</span>
          {data.book_at.map((b, i) => (
            <a key={i} href={b.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-700/60 border border-slate-600/40 text-slate-300 text-[11px] hover:bg-slate-600/60 hover:text-white transition-colors">
              {b.name}
            </a>
          ))}
        </div>
      )}

      {/* Analysis */}
      {(analysis || streaming) && (
        <div className="px-4 py-3 border-t border-slate-800">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Plan Advisor Recommendation
          </p>
          <div className="text-sm text-slate-300 leading-relaxed">
            <MarkdownBody text={analysis ?? ""} />
            {streaming && (
              <span className="inline-block w-0.5 h-4 bg-indigo-300 ml-1 cursor-blink rounded-sm align-middle" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
