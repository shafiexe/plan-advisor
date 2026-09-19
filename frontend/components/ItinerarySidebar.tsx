"use client";

import { useState } from "react";
import type { Message } from "./MessageBubble";

const INR_PER_USD = 84.5;

type Props = {
  messages: Message[];
  isOpen: boolean;
  onClose: () => void;
};

function formatDate(dateStr: string): string {
  try {
    const day = dateStr.split(" ")[0];
    const d = new Date(day + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function fmtINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

/** Extract a numeric INR value from a price string like "₹5,000", "$60", "5000" */
function parsePriceINR(price: string, currency?: string): number {
  const cleaned = price
    .replace(/\/.*$/, "")           // remove "/night", "/person" suffix
    .replace(/[₹$,\s]/g, "")       // strip symbols and spaces
    .trim();
  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return 0;
  const isUSD = currency === "USD" || price.trimStart().startsWith("$");
  return isUSD ? Math.round(num * INR_PER_USD) : Math.round(num);
}

function nightsBetween(checkIn: string, checkOut: string): number {
  try {
    const d1 = new Date(checkIn + "T00:00:00");
    const d2 = new Date(checkOut + "T00:00:00");
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  } catch { return 1; }
}

export default function ItinerarySidebar({ messages, isOpen, onClose }: Props) {
  const [travelers, setTravelers] = useState(1);

  const flights     = messages.filter((m) => m.flightData).map((m) => m.flightData!);
  const hotels      = messages.filter((m) => m.hotelData).map((m) => m.hotelData!);
  const restaurants = messages.filter((m) => m.restaurantData).map((m) => m.restaurantData!);

  const hasContent = flights.length > 0 || hotels.length > 0 || restaurants.length > 0;

  /* ── Budget calculation ─────────────────────────────────── */
  // Flight: cheapest price found across all searches × travelers
  const flightPricePerPerson = flights.reduce<number>((best, f) => {
    const prices = (f.results ?? []).map(r => {
      const raw = r.price_number ?? 0;
      return r.currency === "USD" ? Math.round(raw * INR_PER_USD) : raw;
    }).filter(p => p > 0);
    const min = prices.length ? Math.min(...prices) : 0;
    return min > 0 && (best === 0 || min < best) ? min : best;
  }, 0);
  const flightTotal = flightPricePerPerson * travelers;

  // Hotel: cheapest price × nights × (1 room, shared by travelers)
  const hotelItems = hotels.map(h => {
    const nights = nightsBetween(h.check_in, h.check_out);
    const top = h.results?.[0];
    const pricePerNight = top ? parsePriceINR(top.price, top.currency) : 0;
    return { location: h.location, nights, pricePerNight, total: pricePerNight * nights };
  });
  const hotelTotal = hotelItems.reduce((s, h) => s + h.total, 0);

  // Meal estimate: ₹1,500/person/day × nights (or 3 days if no hotel)
  const totalNights = hotelItems.reduce((s, h) => s + h.nights, 0) || (hasContent ? 3 : 0);
  const mealTotal = totalNights > 0 ? 1500 * travelers * totalNights : 0;

  const grandTotal = flightTotal + hotelTotal + mealTotal;
  const hasBudget = grandTotal > 0;

  const budgetLabel = grandTotal < 30000 ? { text: "Budget trip", color: "text-emerald-400" }
    : grandTotal < 80000 ? { text: "Mid-range trip", color: "text-amber-400" }
    : { text: "Premium trip", color: "text-purple-400" };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full z-40 w-full md:w-72 bg-slate-900 border-l border-slate-700/60
          flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        aria-label="Trip summary sidebar"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-700/60 shrink-0">
          <span className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            🗺️ Trip Summary
          </span>
          <button
            onClick={onClose}
            title="Close"
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400
              hover:text-slate-200 hover:bg-slate-800 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {!hasContent ? (
            <p className="text-xs text-slate-500 leading-relaxed mt-2">
              Chat with Plan Advisor to build your trip — flights, hotels, and restaurants will appear here.
            </p>
          ) : (
            <>
              {/* ── Flights ── */}
              {flights.length > 0 && (
                <section>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    ✈️&nbsp;&nbsp;Flights
                  </h3>
                  <div className="space-y-2">
                    {flights.map((f, i) => {
                      const first  = f.results?.[0];
                      const depRaw = first?.segments?.[0]?.departs;
                      const label  = f.route_label ?? `${f.origin} → ${f.destination}`;
                      return (
                        <div key={i} className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
                          <div className="text-sm font-medium text-slate-100 leading-snug">{label}</div>
                          {depRaw && (
                            <div className="text-xs text-slate-400 mt-0.5">{formatDate(depRaw)}</div>
                          )}
                          {first && (
                            <div className="text-xs text-indigo-300 mt-1 font-medium">
                              from {first.price} · {first.airline}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ── Hotels ── */}
              {hotels.length > 0 && (
                <section>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    🏨&nbsp;&nbsp;Hotels
                  </h3>
                  <div className="space-y-2">
                    {hotels.map((h, i) => {
                      const top = h.results?.[0];
                      return (
                        <div key={i} className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
                          <div className="text-sm font-medium text-slate-100">{h.location}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{h.check_in} – {h.check_out}</div>
                          {top && (
                            <div className="text-xs text-indigo-300 mt-1 font-medium">
                              {top.name} from {top.price}/{top.currency}/night
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ── Restaurants ── */}
              {restaurants.length > 0 && (
                <section>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    🍽️&nbsp;&nbsp;Restaurants
                  </h3>
                  <div className="space-y-2">
                    {restaurants.map((r, i) => (
                      <div key={i} className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
                        <div className="text-sm font-medium text-slate-100 mb-1.5">{r.location}</div>
                        {r.results?.slice(0, 3).map((rest, j) => (
                          <div key={j} className="flex items-center justify-between text-xs text-slate-300 py-0.5">
                            <span className="flex items-center gap-1.5">
                              <span className="text-slate-600">•</span>
                              {rest.name}
                            </span>
                            {rest.rating > 0 && (
                              <span className="text-amber-400 shrink-0 ml-2">⭐ {rest.rating}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Budget Estimator ── */}
              {hasBudget && (
                <section className="border-t border-slate-700/40 pt-4">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    💰&nbsp;&nbsp;Budget Estimate
                  </h3>

                  {/* Travelers counter */}
                  <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/40">
                    <span className="text-xs text-slate-400">Travelers</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTravelers(t => Math.max(1, t - 1))}
                        className="w-6 h-6 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-bold flex items-center justify-center transition-colors"
                      >−</button>
                      <span className="text-sm font-semibold text-slate-100 w-4 text-center">{travelers}</span>
                      <button
                        onClick={() => setTravelers(t => Math.min(8, t + 1))}
                        className="w-6 h-6 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-bold flex items-center justify-center transition-colors"
                      >+</button>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="space-y-1.5 mb-3">
                    {flightTotal > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">
                          ✈️ Flights × {travelers}
                          {travelers > 1 && (
                            <span className="text-slate-600 ml-1">({fmtINR(flightPricePerPerson)}/person)</span>
                          )}
                        </span>
                        <span className="text-slate-200 font-medium tabular-nums">{fmtINR(flightTotal)}</span>
                      </div>
                    )}
                    {hotelItems.map((h, i) => h.total > 0 && (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-slate-400">
                          🏨 {h.location} · {h.nights}n
                          <span className="text-slate-600 ml-1">({fmtINR(h.pricePerNight)}/n)</span>
                        </span>
                        <span className="text-slate-200 font-medium tabular-nums">{fmtINR(h.total)}</span>
                      </div>
                    ))}
                    {mealTotal > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">
                          🍽️ Meals est. · {totalNights}d × {travelers}
                          <span className="text-slate-600 ml-1">(₹1,500/day)</span>
                        </span>
                        <span className="text-slate-200 font-medium tabular-nums">{fmtINR(mealTotal)}</span>
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="rounded-xl bg-indigo-950/40 border border-indigo-500/30 px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Estimated total</p>
                        <p className={`text-[10px] font-semibold mt-0.5 ${budgetLabel.color}`}>{budgetLabel.text}</p>
                      </div>
                      <p className="text-lg font-bold text-slate-100 tabular-nums">{fmtINR(grandTotal)}</p>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1.5">
                      Flights + hotel + meal estimate. Actual costs may vary.
                    </p>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
