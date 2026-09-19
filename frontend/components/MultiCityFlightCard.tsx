"use client";

import { useState } from "react";
import MarkdownBody from "./MarkdownBody";
import type { FlightSearchResult, FlightOffer, FlightSegment } from "@/types/flights";

/* ── Types ──────────────────────────────────────────────────────── */

// Backend tags each offer with the leg number (1-based) for multi-city results
type MultiOffer = FlightOffer & { leg?: number };

/* ── Constants ──────────────────────────────────────────────────── */

const INR_PER_USD = 84.5;
const MAX_VISIBLE = 3;

/* ── Helpers ─────────────────────────────────────────────────────── */

function timeOnly(dt: string) {
  return dt?.split(" ")[1] ?? dt ?? "";
}

function dateShort(dt: string) {
  const d = dt?.split(" ")[0];
  if (!d) return "";
  const [, m, day] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${parseInt(day)} ${months[parseInt(m) - 1]}`;
}

function dateMed(isoDate: string) {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(parts[1]) - 1]} ${parseInt(parts[2])}`;
}

function stopsLabel(stops: number) {
  if (stops === 0) return "Nonstop";
  return stops === 1 ? "1 stop" : `${stops} stops`;
}

function formatPrice(priceNumber: number, currency: string, showINR: boolean): string {
  if (showINR) {
    const inrAmt = currency === "INR" ? priceNumber : Math.round(priceNumber * INR_PER_USD);
    return `₹${inrAmt.toLocaleString("en-IN")}`;
  }
  const usdAmt = currency === "USD" ? priceNumber : Math.round(priceNumber / INR_PER_USD);
  return `$${usdAmt.toLocaleString()}`;
}

function googleFlightsUrl(origin: string, destination: string, date: string) {
  return `https://www.google.com/travel/flights?q=flights+from+${origin}+to+${destination}+on+${date}`;
}

function makemytripFlightUrl(origin: string, destination: string, date: string) {
  const parts = date.split("-");
  const d = parts.length === 3 ? `${parts[2]}${parts[1]}${parts[0].slice(2)}` : date;
  return `https://www.makemytrip.com/flight/search?itinerary=${origin}-${destination}-${d}&tripType=M&paxType=A-1_C-0_I-0&intl=false&cabinClass=E`;
}

function skyscannerFlightUrl(origin: string, destination: string, date: string) {
  const parts = date.split("-");
  const d = parts.length === 3 ? `${parts[0].slice(2)}${parts[1]}${parts[2]}` : date;
  return `https://www.skyscanner.co.in/transport/flights/${origin.toLowerCase()}/${destination.toLowerCase()}/${d}/`;
}

/* ── AirlineLogo ─────────────────────────────────────────────────── */
function AirlineLogo({ src, name, size = 40 }: { src: string; name: string; size?: number }) {
  const [errored, setErrored] = useState(false);
  if (src && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="object-contain rounded-lg bg-white p-1"
        style={{ width: size, height: size, minWidth: size }}
        onError={() => setErrored(true)}
      />
    );
  }
  return (
    <div
      className="rounded-lg bg-slate-700 flex items-center justify-center font-bold text-slate-300"
      style={{ width: size, height: size, minWidth: size, fontSize: size * 0.3 }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

/* ── DurationBar ─────────────────────────────────────────────────── */
function DurationBar({ duration, stops, layovers }: { duration: string; stops: number; layovers: string[] }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1 px-3">
      <span className="text-xs text-slate-400 font-medium">{duration}</span>
      <div className="relative flex items-center w-full h-5">
        <div className="h-px flex-1 bg-slate-500" />
        {stops > 0 && layovers.map((l, i) => (
          <span key={i} className="w-2 h-2 rounded-full bg-amber-400 mx-1 shrink-0 cursor-default" title={l} />
        ))}
        <div className="h-px flex-1 bg-slate-500" />
        <span className="text-slate-400 ml-1 text-sm">›</span>
      </div>
      <span className={`text-xs font-semibold ${stops === 0 ? "text-emerald-400" : "text-amber-400"}`}>
        {stopsLabel(stops)}
      </span>
    </div>
  );
}

/* ── SegmentDetail ───────────────────────────────────────────────── */
function SegmentDetail({ seg }: { seg: FlightSegment }) {
  return (
    <div className="flex gap-3 py-2">
      <div className="flex flex-col items-center pt-1 shrink-0 w-4">
        <div className="w-2 h-2 rounded-full bg-indigo-400" />
        <div className="w-px flex-1 bg-slate-600 my-1 min-h-[24px]" />
        <div className="w-2 h-2 rounded-full bg-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-slate-200">
              {timeOnly(seg.departs)}
              <span className="text-slate-500 font-normal ml-1">· {seg.from} — {seg.from_name}</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {seg.airline} · {seg.flight_number} · {seg.duration}
              {seg.airplane ? ` · ${seg.airplane}` : ""}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              {timeOnly(seg.arrives)}
              <span className="text-slate-500 font-normal ml-1">· {seg.to} — {seg.to_name}</span>
            </p>
          </div>
          <AirlineLogo src={seg.airline_logo} name={seg.airline} size={32} />
        </div>
      </div>
    </div>
  );
}

/* ── LegFlightRow ────────────────────────────────────────────────── */
function LegFlightRow({
  offer,
  isLowest,
  showINR,
}: {
  offer: FlightOffer;
  isLowest: boolean;
  showINR: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const first    = offer.segments[0];
  const last     = offer.segments[offer.segments.length - 1];
  const layovers = offer.segments.slice(0, -1).map(s => s.to);
  const price    = formatPrice(offer.price_number, offer.currency, showINR);

  return (
    <div
      className={`rounded-xl border transition-all duration-200
        ${offer.is_best
          ? "border-indigo-500/50 bg-indigo-950/30 shadow-md shadow-indigo-900/20"
          : "border-slate-700/60 bg-slate-800/40 hover:border-slate-600/80 hover:bg-slate-800/70"}`}
    >
      {offer.is_best && (
        <div className="px-3 pt-2 pb-0 flex gap-2 items-center">
          <span className="text-[11px] font-semibold text-indigo-300 bg-indigo-600/25 border border-indigo-500/40 px-2 py-0.5 rounded-full">
            ✦ Best deal
          </span>
        </div>
      )}

      {/* Main row */}
      <div className="flex items-center gap-1.5 px-3 py-3 md:gap-3 md:px-4">
        <div className="flex flex-col items-center gap-1.5 shrink-0 w-12">
          <AirlineLogo src={offer.airline_logo} name={offer.airline} size={40} />
          <span className="text-[10px] text-slate-400 text-center leading-tight max-w-12 truncate">
            {offer.airline}
          </span>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <span className="text-xl font-bold text-slate-100 tabular-nums leading-none">
            {timeOnly(first?.departs)}
          </span>
          <span className="text-xs text-slate-500 mt-0.5">{first?.from}</span>
          {first?.departs && (
            <span className="text-[11px] text-slate-600 mt-0.5">{dateShort(first.departs)}</span>
          )}
        </div>

        <DurationBar duration={offer.total_duration} stops={offer.stops} layovers={layovers} />

        <div className="flex flex-col items-start shrink-0">
          <span className="text-xl font-bold text-slate-100 tabular-nums leading-none">
            {timeOnly(last?.arrives)}
          </span>
          <span className="text-xs text-slate-500 mt-0.5">{last?.to}</span>
          {last?.arrives && (
            <span className="text-[11px] text-slate-600 mt-0.5">{dateShort(last.arrives)}</span>
          )}
        </div>

        {/* Price + details button */}
        <div className="flex flex-col items-end gap-2 ml-auto shrink-0">
          <div className="text-right">
            <span className={`text-base md:text-lg font-bold tabular-nums ${isLowest ? "text-emerald-400" : "text-slate-100"}`}>
              {price}
            </span>
            <p className="text-[10px] text-slate-500 mt-0.5">per person</p>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all
              bg-indigo-600/20 border-indigo-500/50 text-indigo-300
              hover:bg-indigo-600/40 hover:border-indigo-400/70 active:scale-95"
          >
            {expanded ? "Hide" : "Details"}
          </button>
        </div>
      </div>

      {/* Expanded segments */}
      {expanded && (
        <div className="mx-4 mb-4 px-4 py-3 rounded-lg bg-slate-900/60 border border-slate-700/40">
          <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium mb-2">Flight Segments</p>
          <div className="divide-y divide-slate-700/30">
            {offer.segments.map((seg, i) => (
              <SegmentDetail key={i} seg={seg} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── MultiCityFlightCard ─────────────────────────────────────────── */
export default function MultiCityFlightCard({
  data,
  analysis,
  streaming,
}: {
  data: FlightSearchResult;
  analysis?: string;
  streaming?: boolean;
}) {
  const [showINR, setShowINR] = useState(true);
  const [expandedLegs, setExpandedLegs] = useState<Record<number, boolean>>({});

  const { origin, destination, results, legs, route_label } = data;
  if (!results?.length) return null;

  // Cast results to include the backend-supplied leg field
  const multiResults = results as MultiOffer[];

  // Determine 1-based leg numbers to render
  const legNumbers: number[] = legs
    ? legs.map((_, i) => i + 1)
    : [...new Set(multiResults.map(o => o.leg ?? 1))].sort((a, b) => a - b);

  // Build the route chain: [BLR, DXB, LHR]
  const routeParts: string[] = legs
    ? [legs[0].origin, ...legs.map(l => l.destination)]
    : [origin, destination];

  // First leg departure date for booking strip links
  const firstLegDate = legs?.[0]?.departure_date ?? "";

  return (
    <div className="flight-card w-full rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-black/40 bg-slate-900">

      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/80 to-slate-900/80">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Multi-city badge */}
            <span className="text-[11px] font-semibold text-purple-300 bg-purple-600/20 border border-purple-500/40 px-2 py-0.5 rounded-full shrink-0">
              Multi-city
            </span>
            {/* Route chain with arrow separators */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {routeParts.map((code, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight">{code}</span>
                  {i < routeParts.length - 1 && (
                    <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Currency toggle */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => setShowINR(true)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${
                showINR ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ₹ INR
            </button>
            <button
              onClick={() => setShowINR(false)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${
                !showINR ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              $ USD
            </button>
          </div>
        </div>

        {/* Subtitle row */}
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
          {route_label && <span>{route_label}</span>}
          <span className={route_label ? "ml-auto" : ""}>
            {results.length} flight{results.length !== 1 ? "s" : ""} across {legNumbers.length} leg{legNumbers.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── Leg sections ── */}
      <div className="flex flex-col divide-y divide-slate-700/40">
        {legNumbers.map(legNum => {
          const legInfo = legs?.[legNum - 1];
          const legOffers = multiResults.filter(o => o.leg === legNum);
          if (!legOffers.length) return null;

          const prices = legOffers.map(o => o.price_number).filter(Boolean);
          const minPrice = prices.length ? Math.min(...prices) : 0;
          const currency = legOffers[0]?.currency ?? "INR";
          const isExpanded = expandedLegs[legNum] ?? false;
          const visible = isExpanded ? legOffers : legOffers.slice(0, MAX_VISIBLE);

          return (
            <div key={legNum} className="p-4">
              {/* Leg header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
                  {legNum}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Leg {legNum}
                    {legInfo && (
                      <>
                        <span className="text-slate-400">: </span>
                        <span>{legInfo.origin}</span>
                        <span className="mx-1 text-indigo-400">→</span>
                        <span>{legInfo.destination}</span>
                      </>
                    )}
                    {legInfo?.departure_date && (
                      <span className="text-slate-500 font-normal ml-2">· {dateMed(legInfo.departure_date)}</span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {minPrice > 0
                      ? `from ${formatPrice(minPrice, currency, showINR)} · `
                      : ""}
                    {legOffers.length} option{legOffers.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {/* Flight rows for this leg */}
              <div className="flex flex-col gap-2">
                {visible.map((offer, i) => (
                  <LegFlightRow
                    key={i}
                    offer={offer}
                    isLowest={offer.price_number === minPrice && minPrice > 0}
                    showINR={showINR}
                  />
                ))}
              </div>

              {/* Show more / show fewer */}
              {legOffers.length > MAX_VISIBLE && (
                <button
                  onClick={() => setExpandedLegs(prev => ({ ...prev, [legNum]: !isExpanded }))}
                  className="mt-2.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                >
                  {isExpanded
                    ? "Show fewer options"
                    : `Show ${legOffers.length - MAX_VISIBLE} more option${legOffers.length - MAX_VISIBLE !== 1 ? "s" : ""}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Compare & Book strip ── */}
      {(() => {
        const platforms = [
          {
            name: "Google Flights",
            icon: "✈️",
            url: googleFlightsUrl(origin, destination, firstLegDate),
            color: "hover:bg-blue-900/30 hover:border-blue-500/50 hover:text-blue-300",
          },
          {
            name: "MakeMyTrip",
            icon: "🛫",
            url: makemytripFlightUrl(origin, destination, firstLegDate),
            color: "hover:bg-red-900/20 hover:border-red-500/40 hover:text-red-300",
          },
          {
            name: "Skyscanner",
            icon: "🔍",
            url: skyscannerFlightUrl(origin, destination, firstLegDate),
            color: "hover:bg-cyan-900/20 hover:border-cyan-500/40 hover:text-cyan-300",
          },
        ];
        return (
          <div className="mx-4 mb-3 rounded-xl border border-slate-700/40 bg-slate-900/50 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-700/30">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Compare &amp; Book on
              </span>
            </div>
            <div className="flex divide-x divide-slate-700/40">
              {platforms.map(p => (
                <a
                  key={p.name}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex-1 flex flex-col items-center gap-1 py-3 text-slate-500 transition-all ${p.color}`}
                >
                  <span className="text-base">{p.icon}</span>
                  <span className="text-[11px] font-semibold">{p.name}</span>
                </a>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── AI Analysis ── */}
      {(analysis || streaming) && (
        <div className="mx-4 mb-4 p-4 rounded-xl bg-slate-800/50 border border-indigo-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-indigo-400 text-sm">✦</span>
            <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">
              AI Analysis
            </span>
          </div>
          <div className="text-sm text-slate-300 leading-relaxed">
            {analysis ? <MarkdownBody text={analysis} /> : null}
            {streaming && (
              <span className="inline-block w-0.5 h-4 bg-indigo-300 ml-1 align-middle rounded-sm animate-pulse" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
