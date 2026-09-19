"use client";

import { useState, useMemo } from "react";
import type { BusSearchResult, BusResult } from "@/types/buses";
import MarkdownBody from "./MarkdownBody";
import PassengerFormModal from "./PassengerFormModal";

// ── Bus bank offers ───────────────────────────────────────────────────────────

type BusBankOfferDef = {
  bank: string;
  cardType: string;
  rate?: number;
  flatOff?: number;
  maxDiscount?: number;
  minBooking?: number;
  color: string;
  icon: string;
};

const BUS_BANK_OFFERS: BusBankOfferDef[] = [
  {
    bank: "HDFC", cardType: "Credit & Debit",
    rate: 0.10, maxDiscount: 100, minBooking: 400,
    color: "border-blue-500/40 bg-blue-950/60 text-blue-200",
    icon: "🏦",
  },
  {
    bank: "ICICI", cardType: "Credit Card",
    rate: 0.08, maxDiscount: 80, minBooking: 350,
    color: "border-orange-500/40 bg-orange-950/60 text-orange-200",
    icon: "💳",
  },
  {
    bank: "SBI", cardType: "Credit Card",
    flatOff: 50, minBooking: 300,
    color: "border-emerald-500/40 bg-emerald-950/60 text-emerald-200",
    icon: "🏛️",
  },
  {
    bank: "Axis", cardType: "All Cards",
    rate: 0.05, maxDiscount: 150,
    color: "border-[#1e3a8a]/40 bg-purple-950/60 text-[#d4a017]",
    icon: "✦",
  },
];

function calcBusSavings(def: BusBankOfferDef, fare: number): number {
  if (def.minBooking && fare < def.minBooking) return 0;
  if (def.flatOff) return def.flatOff;
  const raw = fare * (def.rate ?? 0);
  return Math.min(raw, def.maxDiscount ?? raw);
}

type Props = {
  data: BusSearchResult;
  analysis?: string;
  streaming?: boolean;
};

// ── Filter + sort types ────────────────────────────────────────────────────

type BusFilter = "all" | "ac_sleeper" | "ac_seater" | "nonac_sleeper" | "semi_sleeper" | "nonac_seater";
type SortKey   = "price" | "departure" | "duration" | "rating" | "seats";

const FILTERS: { key: BusFilter; label: string; color: string }[] = [
  { key: "all",          label: "All",            color: "slate" },
  { key: "ac_sleeper",   label: "AC Sleeper",     color: "indigo" },
  { key: "ac_seater",    label: "AC Seater",      color: "blue" },
  { key: "semi_sleeper", label: "Semi-Sleeper",   color: "purple" },
  { key: "nonac_sleeper",label: "Non-AC Sleeper", color: "amber" },
  { key: "nonac_seater", label: "Non-AC Seater",  color: "slate" },
];

function matchesFilter(b: BusResult, f: BusFilter): boolean {
  if (f === "all") return true;
  if (f === "ac_sleeper")    return b.ac && b.sleeper;
  if (f === "ac_seater")     return b.ac && b.seater;
  if (f === "semi_sleeper")  return b.semi_sleeper;
  if (f === "nonac_sleeper") return !b.ac && b.sleeper;
  if (f === "nonac_seater")  return !b.ac && b.seater;
  return true;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function durationMins(dur: string): number {
  const m = dur.match(/(\d+)h\s*(\d+)?m?/);
  return m ? (parseInt(m[1]) * 60 + parseInt(m[2] || "0")) : 0;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function BusTypeBadge({ b }: { b: BusResult }) {
  const cfg = b.ac
    ? (b.sleeper ? { bg: "bg-[#1e3a8a]/60 border-[#1e3a8a]/40 text-[#d4a017]", icon: "❄️" }
      : b.semi_sleeper ? { bg: "bg-purple-900/60 border-[#1e3a8a]/40 text-[#d4a017]", icon: "❄️" }
      : { bg: "bg-blue-900/60 border-blue-500/40 text-blue-300", icon: "❄️" })
    : (b.sleeper ? { bg: "bg-amber-900/50 border-amber-500/40 text-amber-300", icon: "🌬️" }
      : { bg: "bg-slate-700/60 border-slate-600/40 text-slate-400", icon: "🌬️" });

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg}`}>
      <span>{cfg.icon}</span>
      {b.bus_type}
    </span>
  );
}

function SeatBadge({ available, total }: { available: number; total: number }) {
  const pct = total > 0 ? available / total : 0;
  const color = available === 0
    ? "text-red-400 bg-red-950/40 border-red-500/30"
    : pct < 0.25
    ? "text-amber-400 bg-amber-950/30 border-amber-500/30"
    : "text-emerald-400 bg-emerald-950/30 border-emerald-500/30";

  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${color}`}>
      {available === 0 ? "Full" : `${available} seats`}
    </span>
  );
}

function StarRating({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="flex items-center gap-0.5 text-[11px]">
      <span className="text-amber-400">★</span>
      <span className="text-slate-400">{n.toFixed(1)}</span>
    </span>
  );
}

const AMENITY_ICONS: Record<string, string> = {
  wifi: "📶", usb: "🔌", water: "💧", blanket: "🛏️",
  snack: "🍫", movie: "🎬", "reading light": "💡", charging: "🔌",
};

function AmenityChip({ label }: { label: string }) {
  const icon = Object.entries(AMENITY_ICONS).find(([k]) =>
    label.toLowerCase().includes(k)
  )?.[1] ?? "•";
  return (
    <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5
      rounded-full bg-slate-700/60 border border-slate-600/40 text-slate-400">
      <span>{icon}</span>
      {label}
    </span>
  );
}

function BusRow({ bus, best, isSelected, onSelect }: {
  bus: BusResult;
  best: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      onClick={() => bus.available_seats > 0 && onSelect()}
      className={`rounded-xl border transition-all cursor-pointer
        ${isSelected
          ? "border-[#1e3a8a]/60 bg-[#172554]/20 ring-1 ring-[#1e3a8a]/30"
          : best
            ? "border-emerald-500/40 bg-emerald-950/10 hover:border-emerald-400/60"
            : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600/60"}
        ${bus.available_seats === 0 ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      {/* Best badge */}
      {best && (
        <div className="px-3 pt-2 pb-0.5">
          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
            ✦ Best Value
          </span>
        </div>
      )}

      {/* Main row */}
      <div className="px-3 py-2.5">
        {/* Top: operator + bus type + seats + rating */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">{bus.operator}</p>
            <BusTypeBadge b={bus} />
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <p className="text-base font-bold text-white">
              ₹{bus.fare.toLocaleString("en-IN")}
            </p>
            <StarRating n={bus.rating} />
          </div>
        </div>

        {/* Times row */}
        <div className="flex items-center gap-3 mb-2">
          <div className="text-center">
            <p className="text-sm font-bold text-slate-100">{bus.departure || "—"}</p>
            <p className="text-[10px] text-slate-600">Departs</p>
          </div>

          {/* Track */}
          <div className="flex-1 flex flex-col items-center gap-0.5">
            <p className="text-[10px] text-slate-500">{bus.duration}</p>
            <div className="w-full flex items-center gap-1">
              <div className="h-0.5 flex-1 bg-gradient-to-r from-[#1e3a8a]/60 via-slate-500/40 to-amber-500/60 rounded-full" />
              <span className="text-lg">🚌</span>
              <div className="h-0.5 flex-1 bg-gradient-to-r from-amber-500/60 to-[#1e40af]/60 rounded-full" />
            </div>
            <SeatBadge available={bus.available_seats} total={bus.total_seats} />
          </div>

          <div className="text-center">
            <p className="text-sm font-bold text-slate-100">{bus.arrival || "—"}</p>
            <p className="text-[10px] text-slate-600">Arrives</p>
          </div>
        </div>

        {/* Amenities */}
        {bus.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {bus.amenities.slice(0, 5).map((a, i) => <AmenityChip key={i} label={a} />)}
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center justify-between">
          <button
            onClick={e => { e.stopPropagation(); setExpanded(e2 => !e2); }}
            className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            {expanded ? "▴ Hide stops" : "▾ Boarding / dropping points"}
          </button>
          {bus.available_seats === 0 ? (
            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-700 text-slate-500">
              Sold Out
            </span>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); onSelect(); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                ${isSelected
                  ? "bg-[#1d4ed8] text-white ring-1 ring-indigo-400/50"
                  : "bg-[#1e3a8a] hover:bg-[#1e40af] text-white shadow-lg shadow-[#0f172a]/30"}`}
            >
              {isSelected ? "✓ Selected" : "Select"}
            </button>
          )}
        </div>

        {/* Expanded: boarding/dropping */}
        {expanded && (bus.boarding_points.length > 0 || bus.dropping_points.length > 0) && (
          <div className="mt-2 pt-2 border-t border-slate-700/50 grid grid-cols-2 gap-3">
            {bus.boarding_points.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-slate-600 uppercase mb-1">📍 Boarding</p>
                {bus.boarding_points.slice(0, 4).map((p, i) => (
                  <p key={i} className="text-[10px] text-slate-400 truncate">• {p}</p>
                ))}
              </div>
            )}
            {bus.dropping_points.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-slate-600 uppercase mb-1">📍 Dropping</p>
                {bus.dropping_points.slice(0, 4).map((p, i) => (
                  <p key={i} className="text-[10px] text-slate-400 truncate">• {p}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

// ── BusBankOffers ─────────────────────────────────────────────────────────────

function BusBankOffers({ fare, onSelectOffer, selectedOffer }: {
  fare: number;
  onSelectOffer: (bank: string | null) => void;
  selectedOffer: string | null;
}) {
  const offers = BUS_BANK_OFFERS.map(def => {
    const savings = Math.round(calcBusSavings(def, fare));
    return { ...def, savings, finalPrice: fare - savings, eligible: savings > 0 };
  });
  const bestSavings = Math.max(...offers.map(o => o.savings));

  return (
    <div className="mx-4 mb-3 rounded-xl border border-amber-500/25 bg-slate-900/70 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-900/20 border-b border-amber-500/20">
        <span className="text-amber-400 text-sm">💳</span>
        <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Bank Card Offers</span>
        <span className="text-[10px] text-slate-500 ml-auto">tap to apply</span>
      </div>
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
                    : "border-slate-700/40 bg-slate-800/30 text-slate-600 cursor-not-allowed opacity-50"}`}
            >
              {isBest && !isSelected && (
                <span className="absolute -top-2 right-2 text-[9px] font-bold bg-amber-500 text-black px-1.5 py-0.5 rounded-full">BEST</span>
              )}
              {isSelected && (
                <span className="absolute -top-2 right-2 text-[9px] font-bold bg-white text-black px-1.5 py-0.5 rounded-full">✓ APPLIED</span>
              )}
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-base">{o.icon}</span>
                <span className="text-[11px] font-bold">{o.bank} {o.cardType}</span>
              </div>
              {o.eligible ? (
                <>
                  <p className="text-xl font-bold tabular-nums">₹{o.finalPrice.toLocaleString("en-IN")}</p>
                  <p className="text-[11px] font-semibold text-emerald-400 mt-0.5">
                    You save ₹{o.savings.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] opacity-60 mt-0.5">
                    {o.rate ? `${(o.rate * 100).toFixed(0)}% off` : `₹${o.flatOff} flat off`}
                    {o.maxDiscount ? ` · max ₹${o.maxDiscount.toLocaleString("en-IN")}` : ""}
                  </p>
                </>
              ) : (
                <p className="text-[11px] mt-1">Min. ₹{(o.minBooking ?? 0).toLocaleString("en-IN")} required</p>
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

// ── Main card ─────────────────────────────────────────────────────────────────

export default function BusResultsCard({ data, analysis, streaming }: Props) {
  const [filter, setFilter] = useState<BusFilter>("all");
  const [sort, setSort]     = useState<SortKey>("price");
  const [selectedIdx, setSelectedIdx]       = useState<number | null>(null);
  const [selectedBank, setSelectedBank]     = useState<string | null>(null);
  const [showPassengerModal, setShowPassengerModal] = useState(false);

  const filtered = useMemo(() => {
    let list = data.results.filter(b => matchesFilter(b, filter));
    list = [...list].sort((a, b) => {
      if (sort === "price")     return a.fare - b.fare;
      if (sort === "departure") return toMinutes(a.departure) - toMinutes(b.departure);
      if (sort === "duration")  return durationMins(a.duration) - durationMins(b.duration);
      if (sort === "rating")    return b.rating - a.rating;
      if (sort === "seats")     return b.available_seats - a.available_seats;
      return 0;
    });
    return list;
  }, [data.results, filter, sort]);

  // Count per filter for badges
  const counts = useMemo(() => {
    const map: Record<BusFilter, number> = {
      all: data.results.length,
      ac_sleeper: 0, ac_seater: 0, nonac_sleeper: 0,
      semi_sleeper: 0, nonac_seater: 0,
    };
    data.results.forEach(b => {
      if (b.ac && b.sleeper)      map.ac_sleeper++;
      else if (b.ac && b.seater)  map.ac_seater++;
      else if (b.semi_sleeper)    map.semi_sleeper++;
      else if (!b.ac && b.sleeper)map.nonac_sleeper++;
      else                        map.nonac_seater++;
    });
    return map;
  }, [data.results]);

  const minFare = filtered.length > 0 ? Math.min(...filtered.map(b => b.fare)) : 0;
  const maxFare = filtered.length > 0 ? Math.max(...filtered.map(b => b.fare)) : 0;

  const selectedBus = selectedIdx !== null ? filtered[selectedIdx] ?? null : null;

  function handleSelect(i: number) {
    if (selectedIdx === i) {
      setSelectedIdx(null);
      setSelectedBank(null);
    } else {
      setSelectedIdx(i);
      setSelectedBank(null);
    }
  }

  return (
    <div className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/80
      shadow-xl shadow-black/30 overflow-hidden">

      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-slate-800
        bg-gradient-to-r from-amber-950/30 via-slate-900/40 to-indigo-950/30">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/30
            flex items-center justify-center text-xl shrink-0">
            🚌
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-200">
              {data.origin} → {data.destination}
            </p>
            <p className="text-[11px] text-slate-500">
              {data.date} · {data.buses_found} buses
              {minFare > 0 && ` · ₹${minFare.toLocaleString("en-IN")}–₹${maxFare.toLocaleString("en-IN")}`}
            </p>
          </div>
          {data.source && (
            <span className="shrink-0 text-[9px] font-bold text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
              via {data.source}
            </span>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 flex-wrap mt-2">
          {FILTERS.filter(f => f.key === "all" || counts[f.key] > 0).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-[10px] font-semibold px-2 py-1 rounded-full border transition-all
                ${filter === f.key
                  ? "bg-[#1e3a8a] border-[#1e3a8a] text-white"
                  : "bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-500"}`}
            >
              {f.label}
              {f.key !== "all" && counts[f.key] > 0 && (
                <span className="ml-1 opacity-60">({counts[f.key]})</span>
              )}
            </button>
          ))}
        </div>

        {/* Sort row */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span className="text-[9px] text-slate-600 font-bold uppercase">Sort:</span>
          {(["price", "departure", "duration", "rating", "seats"] as SortKey[]).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border transition-all capitalize
                ${sort === s
                  ? "bg-slate-700 border-slate-500 text-slate-200"
                  : "border-transparent text-slate-600 hover:text-slate-400"}`}
            >
              {s === "seats" ? "Seats ↓" : s === "price" ? "Price ↑" : s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bus list ── */}
      <div className="p-3 space-y-2 max-h-[520px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">🚌</p>
            <p className="text-slate-500 text-sm">No buses match this filter.</p>
          </div>
        ) : (
          filtered.map((bus, i) => (
            <BusRow
              key={`${bus.operator}-${bus.departure}-${i}`}
              bus={bus}
              best={i === 0 && bus.fare === minFare && bus.available_seats > 0}
              isSelected={selectedIdx === i}
              onSelect={() => handleSelect(i)}
            />
          ))
        )}
      </div>

      {/* ── Bank card offers (shown when a bus is selected) ── */}
      {selectedBus && (
        <BusBankOffers
          fare={selectedBus.fare}
          onSelectOffer={setSelectedBank}
          selectedOffer={selectedBank}
        />
      )}

      {/* ── Continue to Book CTA ── */}
      {selectedBus && (() => {
        const appliedDef = BUS_BANK_OFFERS.find(d => d.bank === selectedBank) ?? null;
        const savings = appliedDef ? Math.round(calcBusSavings(appliedDef, selectedBus.fare)) : 0;
        const finalFare = selectedBus.fare - savings;
        return (
          <div className="px-4 pb-4 pt-1">
            <div className="rounded-xl border border-[#1e3a8a]/40 bg-[#172554]/60 p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400 truncate">
                    {selectedBus.operator} · {selectedBus.bus_type}
                    {appliedDef && (
                      <span className="ml-2 text-amber-400 font-semibold">· {appliedDef.bank} offer applied</span>
                    )}
                  </p>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <p className="text-2xl font-bold text-white">
                      ₹{finalFare.toLocaleString("en-IN")}
                    </p>
                    {savings > 0 && (
                      <p className="text-sm text-slate-500 line-through">
                        ₹{selectedBus.fare.toLocaleString("en-IN")}
                      </p>
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
              {!appliedDef && (
                <p className="text-[10px] text-slate-500 mt-2">
                  ↗ Select a bank offer above to see your discounted price.
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Direct booking links ── */}
      {data.book_at && data.book_at.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/40">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2">
            Also available on
          </p>
          <div className="flex gap-2 flex-wrap">
            {data.book_at.map(b => (
              <a
                key={b.name}
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] px-2.5 py-1 rounded-full border border-slate-700
                  text-slate-400 hover:text-white hover:border-[#1e3a8a]/50 transition-all"
              >
                {b.name} →
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Claude's analysis ── */}
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

      {/* ── Passenger form modal ── */}
      {showPassengerModal && selectedBus && (
        <PassengerFormModal
          bookingLink={selectedBus.booking_link}
          onClose={() => setShowPassengerModal(false)}
        />
      )}
    </div>
  );
}
