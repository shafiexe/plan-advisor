"use client";

import type { Message } from "./MessageBubble";

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

export default function ItinerarySidebar({ messages, isOpen, onClose }: Props) {
  const flights     = messages.filter((m) => m.flightData).map((m) => m.flightData!);
  const hotels      = messages.filter((m) => m.hotelData).map((m) => m.hotelData!);
  const restaurants = messages.filter((m) => m.restaurantData).map((m) => m.restaurantData!);

  const hasContent = flights.length > 0 || hotels.length > 0 || restaurants.length > 0;

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
                      const first   = f.results?.[0];
                      const depRaw  = first?.segments?.[0]?.departs;
                      const label   = f.route_label ?? `${f.origin} → ${f.destination}`;
                      return (
                        <div
                          key={i}
                          className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40"
                        >
                          <div className="text-sm font-medium text-slate-100 leading-snug">
                            {label}
                          </div>
                          {depRaw && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              {formatDate(depRaw)}
                            </div>
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
                        <div
                          key={i}
                          className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40"
                        >
                          <div className="text-sm font-medium text-slate-100">{h.location}</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {h.check_in} – {h.check_out}
                          </div>
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
                      <div
                        key={i}
                        className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40"
                      >
                        <div className="text-sm font-medium text-slate-100 mb-1.5">{r.location}</div>
                        {r.results?.slice(0, 3).map((rest, j) => (
                          <div
                            key={j}
                            className="flex items-center justify-between text-xs text-slate-300 py-0.5"
                          >
                            <span className="flex items-center gap-1.5">
                              <span className="text-slate-600">•</span>
                              {rest.name}
                            </span>
                            {rest.rating > 0 && (
                              <span className="text-amber-400 shrink-0 ml-2">
                                ⭐ {rest.rating}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
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
