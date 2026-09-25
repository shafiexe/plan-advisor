"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const MODE_EMOJI: Record<string, string> = { bus: "🚌", train: "🚂", flight: "✈️", boat: "⛵", cab: "🚗" };
const MODE_LABEL: Record<string, string> = { bus: "Bus", train: "Train", flight: "Flight", boat: "Boat", cab: "Cab" };
const CLASS_BADGE: Record<string, { label: string; color: string }> = {
  economy:  { label: "Economy",  color: "bg-slate-800 text-slate-300" },
  business: { label: "Business", color: "bg-blue-900/40 text-blue-300" },
  first:    { label: "First Class", color: "bg-amber-900/40 text-amber-300" },
};
const MODES = ["All", "flight", "bus", "train", "boat", "cab"];
const TICKET_TYPES = ["All", "individual", "group"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    available:    "bg-green-900/40 text-green-400",
    filling_fast: "bg-amber-900/40 text-amber-400",
    sold_out:     "bg-red-900/40 text-red-400",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${map[status] || "bg-slate-800 text-slate-400"}`}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}

function TicketCard({ t }: { t: AnyRecord }) {
  const [open, setOpen] = useState(false);
  const isFlight = t.mode === "flight";
  const avail = t.available_seats ?? 0;
  const total = t.total_seats ?? 1;
  const fillPct = Math.round(((total - avail) / total) * 100);
  const savings = t.original_price && t.price_per_seat < t.original_price
    ? t.original_price - t.price_per_seat : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all hover:border-slate-700">
      {/* Collapsed header */}
      <div className="p-4 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex items-start gap-3">
          {/* Mode icon */}
          <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ background: "#1e3a8a20" }}>
            {MODE_EMOJI[t.mode] || "🎫"}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <StatusBadge status={t.status} />
              <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400">
                {MODE_LABEL[t.mode] || t.mode}
              </span>
              {isFlight && t.travel_class && (
                <span className={`text-xs px-2 py-0.5 rounded-lg ${CLASS_BADGE[t.travel_class]?.color || "bg-slate-800 text-slate-400"}`}>
                  {CLASS_BADGE[t.travel_class]?.label || t.travel_class}
                </span>
              )}
              {isFlight && (
                <span className={`text-xs px-2 py-0.5 rounded-lg ${t.is_nonstop ? "bg-green-900/30 text-green-400" : "bg-slate-800 text-slate-400"}`}>
                  {t.is_nonstop ? "✈ Direct" : `🔁 ${t.layovers?.length || 1} stop${(t.layovers?.length || 1) > 1 ? "s" : ""}`}
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 capitalize">
                {t.ticket_type}
              </span>
            </div>

            {/* Route */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-bold text-white">{t.origin}</span>
              <span className="text-slate-500">→</span>
              <span className="text-base font-bold text-white">{t.destination}</span>
              {isFlight && t.airline_name && (
                <span className="text-xs text-slate-500 ml-1">· {t.airline_name}{t.flight_number && ` ${t.flight_number}`}</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>📅 {t.travel_date}</span>
              {t.travel_time && <span>🕐 Dep {t.travel_time}</span>}
              {isFlight && t.arrival_time && <span>🛬 Arr {t.arrival_time}</span>}
              <span>💺 {avail} seat{avail !== 1 ? "s" : ""} left</span>
            </div>
          </div>

          {/* Price */}
          <div className="flex flex-col items-end shrink-0">
            <p className="text-lg font-bold" style={{ color: "#d4a017" }}>₹{t.price_per_seat?.toLocaleString()}</p>
            <p className="text-xs text-slate-500">/seat</p>
            {savings > 0 && (
              <p className="text-xs text-green-400 mt-0.5">Save ₹{savings.toLocaleString()}</p>
            )}
            <span className="text-xs text-slate-600 mt-1">{open ? "▲ Less" : "▼ Details"}</span>
          </div>
        </div>

        {/* Seat bar */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${fillPct}%`, background: fillPct > 80 ? "#ef4444" : fillPct > 50 ? "#f59e0b" : "#22c55e" }} />
          </div>
          <span className="text-xs text-slate-600">{avail}/{total}</span>
        </div>
      </div>

      {/* Expanded details */}
      {open && (
        <div className="border-t border-slate-800 p-4 flex flex-col gap-4">

          {/* Flight route timeline */}
          {isFlight && (
            <div className="bg-slate-800/60 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{t.travel_time || "—"}</p>
                  <p className="text-xs text-slate-400">{t.origin}</p>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  {t.is_nonstop ? (
                    <div className="flex items-center gap-1 w-full">
                      <div className="flex-1 h-px bg-slate-600" />
                      <span className="text-xs text-green-400 px-1">Direct</span>
                      <div className="flex-1 h-px bg-slate-600" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 w-full">
                      <div className="flex-1 h-px bg-slate-600" />
                      {t.layovers?.map((l: AnyRecord, i: number) => (
                        <span key={i} className="text-xs text-amber-400 px-1">✦ {l.city}{l.duration && ` (${l.duration})`}</span>
                      ))}
                      <div className="flex-1 h-px bg-slate-600" />
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-1">{t.airline_name} {t.flight_number}</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{t.arrival_time || "—"}</p>
                  <p className="text-xs text-slate-400">{t.destination}</p>
                </div>
              </div>
            </div>
          )}

          {/* Class + amenities */}
          {(isFlight || t.amenities?.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {isFlight && (
                <span className={`text-xs px-3 py-1 rounded-lg font-medium ${CLASS_BADGE[t.travel_class]?.color || "bg-slate-800 text-slate-400"}`}>
                  {CLASS_BADGE[t.travel_class]?.label || t.travel_class}
                </span>
              )}
              {t.amenities?.map((a: string, i: number) => (
                <span key={i} className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-400">✓ {a}</span>
              ))}
            </div>
          )}

          {/* Pricing breakdown */}
          {t.original_price && (
            <div className="bg-green-900/20 border border-green-800/30 rounded-xl p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Market price</span>
                <span className="text-slate-500 line-through">₹{t.original_price?.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-green-300 font-medium">Seller price</span>
                <span className="text-green-400 font-bold">₹{t.price_per_seat?.toLocaleString()}</span>
              </div>
              {savings > 0 && (
                <p className="text-xs text-green-400 mt-1">You save ₹{savings.toLocaleString()} ({Math.round((savings / t.original_price) * 100)}% off)</p>
              )}
            </div>
          )}

          {/* Boarding / Terminal info */}
          {t.departure_point && (
            <div className="bg-blue-900/20 border border-blue-800/30 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-300 mb-1">📍 {isFlight ? "Terminal / Boarding" : "Departure Point"}</p>
              <p className="text-sm text-slate-300">{t.departure_point}</p>
            </div>
          )}

          {/* Pickup points (non-flight) */}
          {!isFlight && t.pickup_points?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2">📍 Pickup Points</p>
              <div className="flex flex-col gap-1">
                {t.pickup_points.map((p: AnyRecord, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-slate-600 text-xs">{i + 1}.</span>
                    <span>{p.location}</span>
                    {p.time && <span className="text-slate-500 text-xs">· {p.time}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {t.notes && (
            <div className="bg-amber-900/20 border border-amber-800/30 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-300 mb-1">📌 Important Notes</p>
              <p className="text-sm text-slate-300">{t.notes}</p>
            </div>
          )}

          {/* Seller info + contact */}
          <div className="border-t border-slate-800 pt-4">
            <p className="text-xs text-slate-500 mb-2">Listed by</p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{t.agent?.name || "Travel Agent"}</p>
                {t.agent?.location && <p className="text-xs text-slate-400">{t.agent.location}</p>}
              </div>
              <div className="flex gap-2">
                {t.contact_whatsapp && (
                  <a href={`https://wa.me/${t.contact_whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all"
                    style={{ background: "#16a34a" }}>
                    💬 WhatsApp
                  </a>
                )}
                {t.contact_phone && (
                  <a href={`tel:${t.contact_phone}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white border border-slate-600 hover:border-slate-400 transition-all">
                    📞 Call
                  </a>
                )}
                {t.contact_email && (
                  <a href={`mailto:${t.contact_email}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white border border-slate-600 hover:border-slate-400 transition-all">
                    ✉ Email
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TicketsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [tickets, setTickets] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [origin, setOrigin] = useState(searchParams.get("origin") || "");
  const [destination, setDestination] = useState(searchParams.get("destination") || "");
  const [travelDate, setTravelDate] = useState(searchParams.get("travel_date") || "");
  const [mode, setMode] = useState(searchParams.get("mode") || "All");
  const [ticketType, setTicketType] = useState(searchParams.get("ticket_type") || "All");

  const fetchTickets = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (origin) params.set("origin", origin);
    if (destination) params.set("destination", destination);
    if (travelDate) params.set("travel_date", travelDate);
    if (mode && mode !== "All") params.set("mode", mode);
    if (ticketType && ticketType !== "All") params.set("ticket_type", ticketType);
    router.replace(`/explore/tickets?${params.toString()}`, { scroll: false });
    fetch(`${API}/api/explore/tickets?${params.toString()}`)
      .then(r => r.json())
      .then(data => setTickets(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [origin, destination, travelDate, mode, ticketType, router]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const INPUT = "bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-600";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Available Tickets</h1>
        <p className="text-slate-400 text-sm mt-1">Seats available below market price — contact the seller directly</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6">
        <div className="flex flex-wrap gap-3 mb-3">
          <input value={origin} onChange={e => setOrigin(e.target.value)}
            placeholder="From…" className={`flex-1 min-w-28 ${INPUT}`} />
          <input value={destination} onChange={e => setDestination(e.target.value)}
            placeholder="To…" className={`flex-1 min-w-28 ${INPUT}`} />
          <input value={travelDate} onChange={e => setTravelDate(e.target.value)}
            type="date" className={INPUT} />
        </div>
        <div className="flex flex-wrap gap-2">
          {MODES.map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${mode === m ? "border-[#d4a017] text-[#d4a017]" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
              style={mode === m ? { background: "#d4a01715" } : {}}>
              {m === "All" ? "All modes" : `${MODE_EMOJI[m]} ${MODE_LABEL[m]}`}
            </button>
          ))}
          <div className="w-px bg-slate-700 mx-1" />
          {TICKET_TYPES.map(t => (
            <button key={t} onClick={() => setTicketType(t)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${ticketType === t ? "border-[#1e3a8a] text-blue-300" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
              style={ticketType === t ? { background: "#1e3a8a20" } : {}}>
              {t === "All" ? "Any type" : t === "individual" ? "👤 Individual" : "👥 Group"}
            </button>
          ))}
          {(origin || destination || travelDate || mode !== "All" || ticketType !== "All") && (
            <button onClick={() => { setOrigin(""); setDestination(""); setTravelDate(""); setMode("All"); setTicketType("All"); }}
              className="text-xs px-3 py-1.5 rounded-lg border border-red-800/50 text-red-400 hover:border-red-700 transition-all ml-auto">
              Clear
            </button>
          )}
        </div>
      </div>

      {!loading && <p className="text-xs text-slate-500 mb-4">{tickets.length} listing{tickets.length !== 1 ? "s" : ""} found</p>}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-900 rounded-2xl animate-pulse border border-slate-800" />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🎫</div>
          <h3 className="text-lg font-semibold text-white mb-2">No tickets found</h3>
          <p className="text-sm text-slate-400 mb-4">Try different filters or check back later</p>
          <button onClick={() => { setOrigin(""); setDestination(""); setTravelDate(""); setMode("All"); setTicketType("All"); }}
            className="text-sm px-4 py-2 rounded-lg text-white" style={{ background: "#1e3a8a" }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map(t => <TicketCard key={t.id} t={t} />)}
        </div>
      )}
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-900 rounded-2xl animate-pulse border border-slate-800" />)}
      </div>
    }>
      <TicketsPageInner />
    </Suspense>
  );
}
