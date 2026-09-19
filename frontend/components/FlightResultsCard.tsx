"use client";

import { useState, useCallback } from "react";
import MarkdownBody from "./MarkdownBody";
import type { FlightSearchResult, FlightOffer, FlightSegment } from "@/types/flights";
import PassengerFormModal from "./PassengerFormModal";

/* ── Constants ──────────────────────────────────────────────── */

const INR_PER_USD = 84.5; // approximate; shown as ~estimate when converting

type BankOfferDef = {
  bank: string;
  cardType: string;
  rate?: number;         // percentage e.g. 0.10
  flatOff?: number;      // fixed INR discount
  maxDiscount?: number;  // cap on percentage-based discount
  minBooking?: number;   // minimum fare to qualify
  color: string;
  icon: string;
};

const BANK_OFFER_DEFS: BankOfferDef[] = [
  {
    bank: "HDFC", cardType: "Credit & Debit",
    rate: 0.10, maxDiscount: 1500,
    color: "border-blue-500/40 bg-blue-950/60 text-blue-200",
    icon: "🏦",
  },
  {
    bank: "ICICI", cardType: "Credit Card",
    rate: 0.08, maxDiscount: 1200,
    color: "border-orange-500/40 bg-orange-950/60 text-orange-200",
    icon: "💳",
  },
  {
    bank: "SBI", cardType: "Credit Card",
    rate: 0.05, maxDiscount: 1000,
    color: "border-emerald-500/40 bg-emerald-950/60 text-emerald-200",
    icon: "🏛️",
  },
  {
    bank: "Axis", cardType: "All Cards",
    flatOff: 500, minBooking: 5000,
    color: "border-[#1e3a8a]/40 bg-purple-950/60 text-[#d4a017]",
    icon: "✦",
  },
];

const SOURCE_STYLE: Record<string, string> = {
  "Google Flights": "bg-blue-900/40 text-blue-300 border-blue-500/30",
  "Travelpayouts":  "bg-green-900/40 text-green-300 border-green-500/30",
};

/* ── Helpers ─────────────────────────────────────────────────── */

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

function stopsLabel(stops: number) {
  if (stops === 0) return "Nonstop";
  return stops === 1 ? "1 stop" : `${stops} stops`;
}

function cheapestPrice(results: FlightOffer[]) {
  const prices = results.map(r => r.price_number).filter(Boolean);
  return prices.length ? Math.min(...prices) : 0;
}

function formatPrice(priceNumber: number, currency: string, showINR: boolean): string {
  if (showINR) {
    const inrAmt = currency === "INR" ? priceNumber : Math.round(priceNumber * INR_PER_USD);
    return `₹${inrAmt.toLocaleString("en-IN")}`;
  }
  const usdAmt = currency === "USD" ? priceNumber : Math.round(priceNumber / INR_PER_USD);
  return `$${usdAmt.toLocaleString()}`;
}

function bookingUrl(offer: FlightOffer, origin: string, destination: string): string {
  if (offer.booking_link) return offer.booking_link;
  const seg = offer.segments[0];
  const date = seg?.departs?.split(" ")[0] ?? "";
  return `https://www.google.com/travel/flights?q=flights+from+${origin}+to+${destination}+on+${date}`;
}

function googleFlightsUrl(origin: string, destination: string, date: string) {
  return `https://www.google.com/travel/flights?q=flights+from+${origin}+to+${destination}+on+${date}`;
}

function makemytripFlightUrl(origin: string, destination: string, date: string) {
  const parts = date.split("-");
  const d = parts.length === 3 ? `${parts[2]}${parts[1]}${parts[0].slice(2)}` : date;
  return `https://www.makemytrip.com/flight/search?itinerary=${origin}-${destination}-${d}&tripType=O&paxType=A-1_C-0_I-0&intl=false&cabinClass=E`;
}

function skyscannerFlightUrl(origin: string, destination: string, date: string) {
  const parts = date.split("-");
  const d = parts.length === 3 ? `${parts[0].slice(2)}${parts[1]}${parts[2]}` : date;
  return `https://www.skyscanner.co.in/transport/flights/${origin.toLowerCase()}/${destination.toLowerCase()}/${d}/`;
}

/* ── AirlineLogo ─────────────────────────────────────────────── */
function AirlineLogo({ src, name, size = 48 }: { src: string; name: string; size?: number }) {
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

/* ── DurationBar ─────────────────────────────────────────────── */
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

/* ── SegmentDetail ───────────────────────────────────────────── */
function SegmentDetail({ seg }: { seg: FlightSegment }) {
  return (
    <div className="flex gap-3 py-2">
      <div className="flex flex-col items-center pt-1 shrink-0 w-4">
        <div className="w-2 h-2 rounded-full bg-[#1e40af]" />
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

/* ── SourceBadge ─────────────────────────────────────────────── */
function SourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  const style = SOURCE_STYLE[source] ?? "bg-slate-800 text-slate-400 border-slate-600";
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${style}`}>
      {source}
    </span>
  );
}

/* ── BankOffers ──────────────────────────────────────────────── */
function calcSavings(def: BankOfferDef, priceINR: number): number {
  if (def.minBooking && priceINR < def.minBooking) return 0;
  if (def.flatOff) return def.flatOff;
  const raw = priceINR * (def.rate ?? 0);
  return Math.min(raw, def.maxDiscount ?? raw);
}

function BankOffers({
  priceNumber,
  currency,
  onSelectOffer,
  selectedOffer,
}: {
  priceNumber: number;
  currency: string;
  onSelectOffer: (bank: string | null) => void;
  selectedOffer: string | null;
}) {
  const priceINR = currency === "INR" ? priceNumber : Math.round(priceNumber * INR_PER_USD);

  const offers = BANK_OFFER_DEFS.map(def => {
    const savings = Math.round(calcSavings(def, priceINR));
    const finalPrice = priceINR - savings;
    const eligible = savings > 0;
    return { ...def, savings, finalPrice, eligible };
  });

  const bestSavings = Math.max(...offers.map(o => o.savings));

  return (
    <div className="mx-4 mb-3 rounded-xl border border-amber-500/25 bg-slate-900/70 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-900/20 border-b border-amber-500/20">
        <span className="text-amber-400 text-sm">💳</span>
        <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
          Bank Card Offers
        </span>
        <span className="text-[10px] text-slate-500 ml-auto">tap to apply</span>
      </div>

      {/* Offer grid */}
      <div className="grid grid-cols-2 gap-2 p-3">
        {offers.map(o => {
          const isSelected = selectedOffer === o.bank;
          const isBest = o.savings === bestSavings && o.savings > 0;
          return (
            <button
              key={o.bank}
              onClick={() => o.eligible && onSelectOffer(isSelected ? null : o.bank)}
              disabled={!o.eligible}
              className={`relative text-left rounded-xl border p-3 transition-all
                ${isSelected
                  ? `${o.color} ring-2 ring-white/20 shadow-lg`
                  : o.eligible
                    ? `${o.color} hover:brightness-110 active:scale-[0.98]`
                    : "border-slate-700/40 bg-slate-800/30 text-slate-600 cursor-not-allowed opacity-50"
                }`}
            >
              {isBest && !isSelected && (
                <span className="absolute -top-2 right-2 text-[9px] font-bold bg-amber-500 text-black px-1.5 py-0.5 rounded-full">
                  BEST
                </span>
              )}
              {isSelected && (
                <span className="absolute -top-2 right-2 text-[9px] font-bold bg-white text-black px-1.5 py-0.5 rounded-full">
                  ✓ APPLIED
                </span>
              )}
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-base">{o.icon}</span>
                <span className="text-[11px] font-bold">{o.bank} {o.cardType}</span>
              </div>
              {o.eligible ? (
                <>
                  <p className="text-xl font-bold tabular-nums">
                    ₹{o.finalPrice.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] font-semibold text-emerald-400 mt-0.5">
                    You save ₹{o.savings.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] opacity-60 mt-0.5">
                    {o.rate ? `${(o.rate * 100).toFixed(0)}% off` : `₹${o.flatOff} flat off`}
                    {o.maxDiscount ? ` · max ₹${o.maxDiscount.toLocaleString("en-IN")}` : ""}
                  </p>
                </>
              ) : (
                <p className="text-[11px] mt-1">
                  Min. ₹{(o.minBooking ?? 0).toLocaleString("en-IN")} required
                </p>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-600 px-4 pb-2.5">
        * Offers applied at checkout. Verify eligibility on the booking site.
      </p>
    </div>
  );
}

/* ── FlightCard ──────────────────────────────────────────────── */
function FlightCard({
  offer,
  isLowest,
  isSelected,
  onSelect,
  showINR,
  onSetAlert,
}: {
  offer: FlightOffer;
  isLowest: boolean;
  isSelected: boolean;
  onSelect: () => void;
  showINR: boolean;
  onSetAlert?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const first    = offer.segments[0];
  const last     = offer.segments[offer.segments.length - 1];
  const layovers = offer.segments.slice(0, -1).map(s => s.to);
  const price    = formatPrice(offer.price_number, offer.currency, showINR);

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border transition-all duration-200 cursor-pointer
        ${isSelected
          ? "border-[#1e40af]/70 bg-[#172554]/50 shadow-lg shadow-[#0f172a]/30 ring-1 ring-[#1e3a8a]/30"
          : offer.is_best
            ? "border-[#1e3a8a]/50 bg-[#172554]/30 shadow-md shadow-[#0f172a]/20"
            : "border-slate-700/60 bg-slate-800/40 hover:border-slate-600/80 hover:bg-slate-800/70"}`}
    >
      {/* Selection indicator + best badge */}
      <div className="px-3 pt-2 pb-0 flex gap-2 items-center md:px-4 md:pt-2.5">
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
          ${isSelected ? "border-[#1e40af] bg-[#1e40af]" : "border-slate-600"}`}
        >
          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
        {offer.is_best && !isSelected && (
          <span className="text-[11px] font-semibold text-[#d4a017] bg-[#1e3a8a]/25 border border-[#1e3a8a]/40 px-2 py-0.5 rounded-full">
            ✦ Best deal
          </span>
        )}
        {isSelected && (
          <span className="text-[11px] font-semibold text-[#d4a017] bg-[#1e3a8a]/25 border border-[#1e40af]/50 px-2 py-0.5 rounded-full">
            ✓ Selected
          </span>
        )}
      </div>

      {/* Main row */}
      <div className="flex items-center gap-1.5 px-3 py-3 md:gap-4 md:px-4 md:py-4">
        <div className="flex flex-col items-center gap-1.5 shrink-0 w-12 md:w-16">
          <AirlineLogo src={offer.airline_logo} name={offer.airline} size={48} />
          <span className="text-[10px] text-slate-400 text-center leading-tight max-w-12 md:max-w-16 truncate">
            {offer.airline}
          </span>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <span className="text-xl md:text-2xl font-bold text-slate-100 tabular-nums leading-none">
            {timeOnly(first?.departs)}
          </span>
          <span className="text-xs text-slate-500 mt-0.5">{first?.from}</span>
          {first?.departs && (
            <span className="text-[11px] text-slate-600 mt-0.5">{dateShort(first.departs)}</span>
          )}
        </div>

        <DurationBar duration={offer.total_duration} stops={offer.stops} layovers={layovers} />

        <div className="flex flex-col items-start shrink-0">
          <span className="text-xl md:text-2xl font-bold text-slate-100 tabular-nums leading-none">
            {timeOnly(last?.arrives)}
          </span>
          <span className="text-xs text-slate-500 mt-0.5">{last?.to}</span>
          {last?.arrives && (
            <span className="text-[11px] text-slate-600 mt-0.5">{dateShort(last.arrives)}</span>
          )}
        </div>

        {/* Price + CTAs */}
        <div className="flex flex-col items-end gap-2 ml-auto shrink-0">
          <div className="text-right">
            <span className={`text-base md:text-xl font-bold tabular-nums ${isLowest ? "text-emerald-400" : "text-slate-100"}`}>
              {price}
            </span>
            <p className="text-[10px] text-slate-500 mt-0.5">per person</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap justify-end" onClick={e => e.stopPropagation()}>
            <SourceBadge source={offer.source} />
            {offer.stops === 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 font-medium">
                Direct
              </span>
            )}
            {onSetAlert && (
              <button
                onClick={onSetAlert}
                className="text-xs text-slate-500 hover:text-amber-400 transition-colors flex items-center gap-1"
              >
                🔔 Alert
              </button>
            )}
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all
                bg-[#1e3a8a]/20 border-[#1e3a8a]/50 text-[#d4a017]
                hover:bg-[#1e3a8a]/40 hover:border-[#1e40af]/70 active:scale-95"
            >
              {expanded ? "Hide" : "Details"}
            </button>
          </div>
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

/* ── Main Card ────────────────────────────────────────────────── */
export default function FlightResultsCard({
  data,
  analysis,
  streaming,
  onSetAlert,
}: {
  data: FlightSearchResult;
  analysis?: string;
  streaming?: boolean;
  onSetAlert?: (data: { origin: string; destination: string; departureDate: string; price: number }) => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showINR, setShowINR] = useState(true);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [filterStops, setFilterStops] = useState<"all" | 0 | 1>("all");
  const [filterAirline, setFilterAirline] = useState<string>("all");
  const [filterTime, setFilterTime] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"price" | "duration" | "depart">("price");
  const [showPassengerModal, setShowPassengerModal] = useState(false);

  const { origin, destination, results, price_level, typical_range, sources_checked, sources_succeeded } = data;
  if (!results?.length) return null;

  const isComparison = !!sources_checked?.length;
  const firstSeg  = results[0]?.segments[0];
  const depDate   = dateShort(firstSeg?.departs ?? "");
  const currency  = results[0]?.currency ?? "INR";

  // Unique airlines for filter dropdown
  const airlines = [...new Set(results.map(r => r.airline).filter(Boolean))];

  // Filtered + sorted results
  const durToMin = (s: string) => {
    const m = s?.match(/(\d+)h\s*(\d+)?m?/);
    return m ? parseInt(m[1]) * 60 + parseInt(m[2] ?? "0") : 0;
  };
  const departHour = (r: FlightOffer) =>
    parseInt(r.segments[0]?.departs?.split(" ")[1]?.split(":")[0] ?? "0");

  const filteredResults = results
    .filter(r => filterStops === "all" || r.stops === filterStops)
    .filter(r => filterAirline === "all" || r.airline === filterAirline)
    .filter(r => {
      if (filterTime === "all") return true;
      const h = departHour(r);
      if (filterTime === "morning")   return h >= 6  && h < 12;
      if (filterTime === "afternoon") return h >= 12 && h < 17;
      if (filterTime === "evening")   return h >= 17 && h < 21;
      if (filterTime === "night")     return h >= 21 || h < 6;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "price")    return (a.price_number || 0) - (b.price_number || 0);
      if (sortBy === "duration") return durToMin(a.total_duration) - durToMin(b.total_duration);
      return (a.segments[0]?.departs ?? "") < (b.segments[0]?.departs ?? "") ? -1 : 1;
    });

  const minPrice  = cheapestPrice(filteredResults.length ? filteredResults : results);
  const maxPrice  = Math.max(...results.map(r => r.price_number).filter(Boolean));

  const priceLevelConfig = {
    low:     { label: "Low prices",     color: "text-emerald-400", dot: "bg-emerald-400" },
    typical: { label: "Typical prices", color: "text-amber-400",   dot: "bg-amber-400"   },
    high:    { label: "High prices",    color: "text-red-400",     dot: "bg-red-400"     },
  }[price_level] ?? { label: "", color: "text-slate-400", dot: "bg-slate-400" };

  const selectedOffer = selectedIdx !== null ? results[selectedIdx] : null;

  const handleSelect = useCallback((i: number) => {
    setSelectedIdx(prev => {
      if (prev === i) { setSelectedBank(null); return null; }
      setSelectedBank(null);
      return i;
    });
  }, []);

  return (
    <div className="flight-card w-full rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-black/40 bg-slate-900">

      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/80 to-slate-900/80">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-100 tracking-tight">{origin}</span>
              <svg className="w-5 h-5 text-[#d4a017]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <span className="text-2xl font-bold text-slate-100 tracking-tight">{destination}</span>
            </div>
            {depDate && (
              <span className="text-sm text-slate-400 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg">
                {depDate}
              </span>
            )}
          </div>

          {/* Currency toggle */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setShowINR(true)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${
                showINR ? "bg-[#1e3a8a] text-white shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ₹ INR
            </button>
            <button
              onClick={() => setShowINR(false)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${
                !showINR ? "bg-[#1e3a8a] text-white shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              $ USD
            </button>
          </div>
        </div>

        {/* Price insight row */}
        <div className="flex items-center gap-2 mt-2.5 text-xs flex-wrap">
          <span className="text-slate-500">
            from{" "}
            <span className="text-slate-200 font-semibold">
              {formatPrice(minPrice, currency, showINR)}
            </span>
            {maxPrice > minPrice && (
              <> to <span className="text-slate-200 font-semibold">{formatPrice(maxPrice, currency, showINR)}</span></>
            )}
          </span>
          {price_level && priceLevelConfig.label && (
            <span className={`flex items-center gap-1.5 font-medium ${priceLevelConfig.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${priceLevelConfig.dot}`} />
              {priceLevelConfig.label}
            </span>
          )}
          {typical_range?.length === 2 && (
            <span className="text-slate-500">
              · Typical: {formatPrice(typical_range[0], currency, showINR)}–{formatPrice(typical_range[1], currency, showINR)}
            </span>
          )}
          {!showINR && currency === "INR" && (
            <span className="text-slate-600 ml-auto">~rate ₹{INR_PER_USD}/$</span>
          )}
          {showINR && currency === "USD" && (
            <span className="text-slate-600 ml-auto">~rate ₹{INR_PER_USD}/$</span>
          )}
          {isComparison ? (
            <span className="ml-auto text-slate-600">
              {sources_succeeded?.length ?? 0}/{sources_checked?.length ?? 0} sources
            </span>
          ) : (
            <span className="ml-auto text-slate-600">via Google Flights</span>
          )}
        </div>
      </div>

      {/* ── Platform pills (comparison mode) ── */}
      {isComparison && sources_checked && (
        <div className="px-5 py-2 border-b border-slate-700/40 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-500 mr-1">Compared:</span>
          {sources_checked.map((src) => {
            const hit = sources_succeeded?.includes(src);
            const style = SOURCE_STYLE[src] ?? "bg-slate-800 text-slate-400 border-slate-600";
            return (
              <span
                key={src}
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${hit ? style : "bg-slate-900 text-slate-600 border-slate-700 opacity-60"}`}
              >
                {hit ? "✓ " : "✗ "}{src}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="border-b border-slate-700/40 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 flex-nowrap px-4 py-2.5 md:flex-wrap">
          {/* Stops */}
          <div className="flex rounded-lg overflow-hidden border border-slate-700/60 text-[11px] font-semibold shrink-0">
            {(["all", 0, 1] as const).map(v => (
              <button
                key={String(v)}
                onClick={() => { setFilterStops(v); setSelectedIdx(null); setSelectedBank(null); }}
                className={`px-2.5 py-1 transition-all ${filterStops === v ? "bg-[#1e3a8a] text-white" : "bg-slate-800/50 text-slate-400 hover:text-white"}`}
              >
                {v === "all" ? "All" : v === 0 ? "Nonstop" : "1 stop"}
              </button>
            ))}
          </div>

          {/* Airline */}
          {airlines.length > 1 && (
            <select
              value={filterAirline}
              onChange={e => { setFilterAirline(e.target.value); setSelectedIdx(null); setSelectedBank(null); }}
              className="text-[11px] bg-slate-800/60 border border-slate-700/60 rounded-lg px-2 py-1 text-slate-300 font-medium shrink-0"
            >
              <option value="all">All airlines</option>
              {airlines.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}

          {/* Departure time */}
          <select
            value={filterTime}
            onChange={e => { setFilterTime(e.target.value); setSelectedIdx(null); setSelectedBank(null); }}
            className="text-[11px] bg-slate-800/60 border border-slate-700/60 rounded-lg px-2 py-1 text-slate-300 font-medium shrink-0"
          >
            <option value="all">Any time</option>
            <option value="morning">Morning (6–12)</option>
            <option value="afternoon">Afternoon (12–17)</option>
            <option value="evening">Evening (17–21)</option>
            <option value="night">Night (21–6)</option>
          </select>

          {/* Sort */}
          <div className="md:ml-auto flex rounded-lg overflow-hidden border border-slate-700/60 text-[11px] font-semibold shrink-0">
            {(["price", "duration", "depart"] as const).map(v => (
              <button
                key={v}
                onClick={() => setSortBy(v)}
                className={`px-2.5 py-1 transition-all ${sortBy === v ? "bg-[#1e3a8a] text-white" : "bg-slate-800/50 text-slate-400 hover:text-white"}`}
              >
                {v === "price" ? "Price" : v === "duration" ? "Duration" : "Depart"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Flight cards ── */}
      <div className="flex flex-col gap-3 p-4 pb-3">
        {filteredResults.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">No flights match the current filters.</p>
        )}
        <p className="text-[11px] text-slate-500 -mb-1">
          {filteredResults.length} of {results.length} flights · tap to select
        </p>
        {filteredResults.map((offer, i) => (
          <FlightCard
            key={i}
            offer={offer}
            isLowest={offer.price_number === minPrice && minPrice > 0}
            isSelected={selectedIdx === i}
            onSelect={() => handleSelect(i)}
            showINR={showINR}
            onSetAlert={onSetAlert ? () => onSetAlert({
              origin,
              destination,
              departureDate: offer.segments[0]?.departs?.split(" ")[0] ?? "",
              price: offer.price_number,
            }) : undefined}
          />
        ))}
      </div>

      {/* ── Quick Book strip ── */}
      {(() => {
        const date = firstSeg?.departs?.split(" ")[0] ?? "";
        const platforms = [
          { name: "Google Flights", icon: "✈️", url: googleFlightsUrl(origin, destination, date), color: "hover:bg-blue-900/30 hover:border-blue-500/50 hover:text-blue-300" },
          { name: "MakeMyTrip",    icon: "🛫", url: makemytripFlightUrl(origin, destination, date), color: "hover:bg-red-900/20 hover:border-red-500/40 hover:text-red-300" },
          { name: "Skyscanner",   icon: "🔍", url: skyscannerFlightUrl(origin, destination, date), color: "hover:bg-cyan-900/20 hover:border-cyan-500/40 hover:text-cyan-300" },
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
                  className={`flex-1 flex flex-col items-center gap-1 py-3 text-slate-500
                    transition-all ${p.color}`}
                >
                  <span className="text-base">{p.icon}</span>
                  <span className="text-[11px] font-semibold">{p.name}</span>
                </a>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Bank offers (shown when a flight is selected) ── */}
      {selectedOffer && (
        <BankOffers
          priceNumber={selectedOffer.price_number}
          currency={selectedOffer.currency}
          onSelectOffer={setSelectedBank}
          selectedOffer={selectedBank}
        />
      )}

      {/* ── Continue to Book CTA ── */}
      {selectedOffer && (() => {
        const priceINR = selectedOffer.currency === "INR"
          ? selectedOffer.price_number
          : Math.round(selectedOffer.price_number * INR_PER_USD);
        const appliedDef = BANK_OFFER_DEFS.find(d => d.bank === selectedBank) ?? null;
        const savings = appliedDef ? Math.round(calcSavings(appliedDef, priceINR)) : 0;
        const finalINR = priceINR - savings;
        const displayFinal = showINR
          ? `₹${finalINR.toLocaleString("en-IN")}`
          : `$${Math.round(finalINR / INR_PER_USD).toLocaleString()}`;
        const displayBase = formatPrice(selectedOffer.price_number, selectedOffer.currency, showINR);

        return (
          <div className="px-4 pb-4 pt-1">
            <div className="rounded-xl border border-[#1e3a8a]/40 bg-[#172554]/60 p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400 truncate">
                    {selectedOffer.airline} · {stopsLabel(selectedOffer.stops)}
                    {appliedDef && (
                      <span className="ml-2 text-amber-400 font-semibold">· {appliedDef.bank} offer applied</span>
                    )}
                  </p>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <p className="text-2xl font-bold text-white">{displayFinal}</p>
                    {savings > 0 && (
                      <p className="text-sm text-slate-500 line-through">{displayBase}</p>
                    )}
                  </div>
                  {savings > 0 ? (
                    <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                      You save ₹{savings.toLocaleString("en-IN")} with {appliedDef?.bank} card
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-0.5">per person · all taxes incl.</p>
                  )}
                </div>
                <button
                  onClick={() => setShowPassengerModal(true)}
                  className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm
                    bg-[#1e3a8a] hover:bg-[#1e40af] text-white shadow-lg shadow-[#0f172a]/50
                    transition-all active:scale-95"
                >
                  Continue to Book
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>
              {appliedDef && (
                <p className="text-[10px] text-amber-400/70 mt-2">
                  💳 Use your {appliedDef.bank} {appliedDef.cardType} at payment to get this price.
                </p>
              )}
              {!appliedDef && selectedOffer.source === "Travelpayouts" && (
                <p className="text-[10px] text-slate-500 mt-2">
                  ↗ Opens Aviasales — select a bank offer above to see your final price.
                </p>
              )}
              {!appliedDef && selectedOffer.source === "Google Flights" && (
                <p className="text-[10px] text-slate-500 mt-2">
                  ↗ Opens Google Flights — select a bank offer above to see your final price.
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── AI Analysis ── */}
      {(analysis || streaming) && (
        <div className="mx-4 mb-4 p-4 rounded-xl bg-slate-800/50 border border-[#1e3a8a]/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#d4a017] text-sm">✦</span>
            <span className="text-[11px] font-semibold text-[#d4a017] uppercase tracking-wider">
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

      {/* ── Passenger form modal ── */}
      {showPassengerModal && selectedOffer && (
        <PassengerFormModal
          bookingLink={bookingUrl(selectedOffer, origin, destination)}
          onClose={() => setShowPassengerModal(false)}
        />
      )}
    </div>
  );
}
