"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const MODE_EMOJI: Record<string, string> = { bus: "🚌", train: "🚂", flight: "✈️", boat: "⛵", cab: "🚗" };
const MODES = ["All", "bus", "train", "flight", "boat", "cab"];
const TICKET_TYPES = ["All", "group", "individual"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    available: "bg-green-900/40 text-green-400",
    filling_fast: "bg-yellow-900/40 text-yellow-400",
    sold_out: "bg-red-900/40 text-red-400",
    cancelled: "bg-red-900/60 text-red-300",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${map[status] || "bg-slate-800 text-slate-300"}`}>
      {status?.replace(/_/g, " ")}
    </span>
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

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Travel Tickets</h1>
        <p className="text-slate-400 text-sm mt-1">Bus, train, flight and more — book group or individual seats</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <input
            value={origin}
            onChange={e => setOrigin(e.target.value)}
            placeholder="From..."
            className="flex-1 min-w-28 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-600"
          />
          <input
            value={destination}
            onChange={e => setDestination(e.target.value)}
            placeholder="To..."
            className="flex-1 min-w-28 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-600"
          />
          <input
            value={travelDate}
            onChange={e => setTravelDate(e.target.value)}
            type="date"
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-600"
          />
          <select
            value={mode}
            onChange={e => setMode(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-600"
          >
            {MODES.map(m => <option key={m} value={m}>{m === "All" ? "All modes" : `${MODE_EMOJI[m]} ${m.charAt(0).toUpperCase() + m.slice(1)}`}</option>)}
          </select>
          <select
            value={ticketType}
            onChange={e => setTicketType(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-600"
          >
            {TICKET_TYPES.map(t => <option key={t} value={t}>{t === "All" ? "All types" : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {!loading && <p className="text-xs text-slate-500 mb-4">{tickets.length} ticket{tickets.length !== 1 ? "s" : ""} found</p>}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🎫</div>
          <h3 className="text-lg font-semibold text-white mb-2">No tickets found</h3>
          <p className="text-sm text-slate-400 mb-4">Try adjusting your search filters</p>
          <button
            onClick={() => { setOrigin(""); setDestination(""); setTravelDate(""); setMode("All"); setTicketType("All"); }}
            className="text-sm px-4 py-2 rounded-lg text-white" style={{ background: "#1e3a8a" }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map(t => {
            const total = t.total_seats || 1;
            const avail = t.available_seats || 0;
            const pct = Math.round(((total - avail) / total) * 100);
            return (
              <Link key={t.id} href={`/explore/tickets/${t.id}`}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{MODE_EMOJI[t.mode] || "🚌"}</span>
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-sm font-semibold text-white mb-1 line-clamp-1">{t.title}</p>
                <p className="text-sm text-slate-300">{t.origin} → {t.destination}</p>
                <p className="text-xs text-slate-500 mt-1">{t.travel_date}{t.departure_time ? ` · ${t.departure_time}` : ""}</p>

                {/* Seats bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{avail} seats left</span>
                    <span>{total} total</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct > 80 ? "#ef4444" : pct > 50 ? "#f59e0b" : "#22c55e" }} />
                  </div>
                </div>

                <div className="flex items-end justify-between mt-3">
                  <p className="text-sm font-bold" style={{ color: "#d4a017" }}>₹{t.price_per_seat?.toLocaleString()}<span className="text-xs font-normal text-slate-400">/seat</span></p>
                  <p className="text-xs text-slate-500">{t.agent?.name}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense fallback={<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}</div>}>
      <TicketsPageInner />
    </Suspense>
  );
}
