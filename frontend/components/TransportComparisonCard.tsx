"use client";

import type { FlightSearchResult, FlightOffer } from "@/types/flights";
import type { TrainSearchResult, TrainResult } from "@/types/transport";
import type { BusSearchResult, BusResult } from "@/types/buses";
import MarkdownBody from "./MarkdownBody";

type Props = {
  flightData?: FlightSearchResult;
  trainData?: TrainSearchResult;
  busData?: BusSearchResult;
  analysis?: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number, cur: string) {
  const sym = cur === "INR" ? "₹" : cur;
  return `${sym}${n.toLocaleString("en-IN")}`;
}

// ── Flight section ─────────────────────────────────────────────────────────────

function FlightSection({ data }: { data: FlightSearchResult }) {
  const flights = (data.results ?? []).slice(0, 6);
  if (!flights.length) return null;

  const bestIdx = flights.reduce((bi, f, i) => f.price_number < flights[bi].price_number ? i : bi, 0);

  return (
    <div>
      <div className="px-4 py-2.5 bg-slate-800/50 border-b border-slate-700/40 flex items-center gap-2">
        <span className="text-base">✈️</span>
        <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">Flight Options</span>
        <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/20">Fastest</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-slate-800/30">
            <tr>
              {["Time", "Airline", "Stops", "Duration", "Price"].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {flights.map((f, i) => {
              const firstSeg = f.segments?.[0];
              const lastSeg  = f.segments?.slice(-1)[0];
              const dep = firstSeg?.departs?.slice(11, 16) ?? "—";
              const arr = lastSeg?.arrives?.slice(11, 16) ?? "—";
              const airline = f.airline ?? firstSeg?.airline ?? "—";
              const stops = f.stops ?? 0;
              const isBest = i === bestIdx;
              return (
                <tr key={i} className={`hover:bg-slate-800/40 transition-colors ${isBest ? "bg-amber-950/20" : ""}`}>
                  <td className="px-3 py-2.5 font-mono tabular-nums text-slate-200 whitespace-nowrap">
                    {dep} → {arr}
                  </td>
                  <td className="px-3 py-2.5 text-slate-300 whitespace-nowrap">{airline}</td>
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">
                    {stops === 0 ? <span className="text-emerald-400">Direct</span> : `${stops} stop${stops > 1 ? "s" : ""}`}
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{f.total_duration}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={`font-semibold ${isBest ? "text-amber-400" : "text-slate-200"}`}>
                      {fmt(f.price_number, f.currency ?? "INR")}
                    </span>
                    {isBest && <span className="ml-1.5 text-[9px] text-amber-400">★ Best Deal</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Train section ──────────────────────────────────────────────────────────────

type ParsedTrain = { name: string; number: string; departs: string; arrives: string; duration: string; fromPrice: string; cls: string; link: string; };

function parseTrain(r: TrainResult): ParsedTrain {
  const text = r.snippet || r.title || "";
  const nameMatch = r.title.match(/^(.+?)\s*[\(（](\d{4,5})[\)）]/);
  const name   = nameMatch ? nameMatch[1].trim() : r.title.replace(/\(.*\)/, "").trim();
  const number = nameMatch ? nameMatch[2] : (r.title.match(/\d{4,5}/) ?? [""])[0];

  const depMatch = text.match(/Departs?\s+(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i)
                ?? text.match(/(\d{1,2}:\d{2})\s*[-–,]/);
  const arrMatch = text.match(/arrives?\s+(\d{1,2}:\d{2}(?:[^|,)]*)?)/i);
  const durMatch = text.match(/~?(\d+h(?:\s*\d+m)?|\d+\s*hr[s]?\s*\d+\s*min[s]?)/i);
  const priceMatch = text.match(/(?:From\s*)?₹\s*(\d[\d,]+)/i);
  const clsMatch = text.match(/\(([^)]*(?:Sleeper|AC|class)[^)]*)\)/i)
                ?? text.match(/\b(Sleeper|2AC|3AC|1AC|CC|EC)\b/);

  return { name, number, departs: depMatch?.[1] ?? "—", arrives: arrMatch?.[1] ?? "—", duration: durMatch?.[1] ?? "—", fromPrice: priceMatch ? `₹${priceMatch[1]}` : "—", cls: clsMatch?.[1] ?? "Sleeper/AC", link: r.link };
}

function TrainSection({ data }: { data: TrainSearchResult }) {
  const trains = (data.results ?? []).map(parseTrain).filter(t => t.name).slice(0, 8);
  if (!trains.length) return null;

  return (
    <div>
      <div className="px-4 py-2.5 bg-slate-800/50 border-b border-slate-700/40 flex items-center gap-2">
        <span className="text-base">🚆</span>
        <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">Train Options</span>
        <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/20">Most Economical</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-slate-800/30">
            <tr>
              {["Train", "Departs", "Arrives", "Duration", "From", "Class", ""].map((h, i) => (
                <th key={i} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {trains.map((t, i) => (
              <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                <td className="px-3 py-2.5 align-middle">
                  <div className="font-medium text-slate-200 leading-tight">{t.name}</div>
                  {t.number && <div className="text-[10px] text-slate-500">#{t.number}</div>}
                </td>
                <td className="px-3 py-2.5 font-mono tabular-nums text-slate-300 whitespace-nowrap">{t.departs}</td>
                <td className="px-3 py-2.5 font-mono tabular-nums text-slate-300 whitespace-nowrap">{t.arrives}</td>
                <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{t.duration}</td>
                <td className="px-3 py-2.5 font-semibold text-emerald-400 whitespace-nowrap">{t.fromPrice}</td>
                <td className="px-3 py-2.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700/60 text-slate-300 whitespace-nowrap">{t.cls}</span>
                </td>
                <td className="px-3 py-2.5">
                  {t.link && (
                    <a href={t.link} target="_blank" rel="noopener noreferrer"
                      className="px-2 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-600/30 hover:bg-indigo-600/40 transition-colors text-[10px] font-medium whitespace-nowrap">
                      Book →
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.book_at?.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-800/40 flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Book on</span>
          {data.book_at.map((b, i) => (
            <a key={i} href={b.url} target="_blank" rel="noopener noreferrer"
              className="px-2 py-0.5 rounded-full bg-slate-700/60 border border-slate-600/40 text-slate-300 text-[10px] hover:bg-slate-600/60 transition-colors">
              {b.name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Bus section ────────────────────────────────────────────────────────────────

function BusSection({ data }: { data: BusSearchResult }) {
  const buses = (data.results ?? []).slice(0, 8);
  if (!buses.length) {
    // No structured bus results — show booking links only
    return (
      <div>
        <div className="px-4 py-2.5 bg-slate-800/50 border-b border-slate-700/40 flex items-center gap-2">
          <span className="text-base">🚌</span>
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">Bus Options</span>
          <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/20">Good Balance</span>
        </div>
        {data.book_at?.length > 0 && (
          <div className="px-4 py-3 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-400">Search live availability on:</span>
            {data.book_at.map((b, i) => (
              <a key={i} href={b.url} target="_blank" rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-full bg-slate-700/60 border border-slate-600/40 text-indigo-300 text-xs hover:bg-slate-600/60 transition-colors">
                {b.name}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  const cheapestIdx = buses.reduce((bi, b, i) => (b.fare ?? Infinity) < (buses[bi].fare ?? Infinity) ? i : bi, 0);

  return (
    <div>
      <div className="px-4 py-2.5 bg-slate-800/50 border-b border-slate-700/40 flex items-center gap-2">
        <span className="text-base">🚌</span>
        <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">Bus Options</span>
        <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/20">Good Balance</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-slate-800/30">
            <tr>
              {["Operator", "Type", "Departs", "Duration", "Price", "Seats", ""].map((h, i) => (
                <th key={i} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {buses.map((b, i) => {
              const isCheapest = i === cheapestIdx;
              const fareStr = b.fare ? `₹${b.fare.toLocaleString("en-IN")}` : "—";
              return (
                <tr key={i} className={`hover:bg-slate-800/40 transition-colors ${isCheapest ? "bg-emerald-950/20" : ""}`}>
                  <td className="px-3 py-2.5 align-middle">
                    <div className="font-medium text-slate-200 leading-tight whitespace-nowrap">{b.operator ?? "—"}</div>
                    {b.rating > 0 && <div className="text-[10px] text-amber-400">★ {b.rating.toFixed(1)}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{b.bus_type ?? "—"}</td>
                  <td className="px-3 py-2.5 font-mono tabular-nums text-slate-300 whitespace-nowrap">{b.departure ?? "—"}</td>
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{b.duration ?? "—"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={`font-semibold ${isCheapest ? "text-emerald-400" : "text-slate-200"}`}>{fareStr}</span>
                    {isCheapest && <span className="ml-1 text-[9px] text-emerald-400">Cheapest</span>}
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">
                    {b.available_seats != null ? (
                      <span className={b.available_seats < 5 ? "text-red-400" : "text-slate-400"}>
                        {b.available_seats} left
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    {b.booking_link && (
                      <a href={b.booking_link} target="_blank" rel="noopener noreferrer"
                        className="px-2 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-600/30 hover:bg-indigo-600/40 transition-colors text-[10px] font-medium whitespace-nowrap">
                        Book →
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.book_at?.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-800/40 flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Book on</span>
          {data.book_at.map((b, i) => (
            <a key={i} href={b.url} target="_blank" rel="noopener noreferrer"
              className="px-2 py-0.5 rounded-full bg-slate-700/60 border border-slate-600/40 text-slate-300 text-[10px] hover:bg-slate-600/60 transition-colors">
              {b.name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function TransportComparisonCard({ flightData, trainData, busData, analysis }: Props) {
  const origin      = flightData?.origin ?? trainData?.origin ?? busData?.origin ?? "";
  const destination = flightData?.destination ?? trainData?.destination ?? busData?.destination ?? "";
  const date        = flightData?.legs?.[0]?.departure_date ?? trainData?.date ?? busData?.date ?? "";

  if (!flightData && !trainData && !busData) return null;

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/80 shadow-lg divide-y divide-slate-700/40">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-800/60 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-indigo-600/30 flex items-center justify-center text-sm">🗺️</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            Transport Comparison
            {origin && destination && (
              <span className="font-normal text-slate-400"> · {origin} → {destination}</span>
            )}
          </p>
          {date && <p className="text-[11px] text-slate-400 mt-0.5">{date}</p>}
        </div>
      </div>

      {/* Each mode section */}
      {flightData && <FlightSection data={flightData} />}
      {trainData && <TrainSection data={trainData} />}
      {busData && <BusSection data={busData} />}

      {/* Analysis */}
      {analysis && (
        <div className="px-4 py-3 text-sm text-slate-300 leading-relaxed">
          <MarkdownBody text={analysis} />
        </div>
      )}
    </div>
  );
}
