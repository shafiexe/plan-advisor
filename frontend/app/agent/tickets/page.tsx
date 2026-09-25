"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Ticket {
  id: number;
  title: string;
  ticket_type: string;
  mode: string;
  origin: string;
  destination: string;
  travel_date: string;
  travel_time: string;
  airline_name: string;
  flight_number: string;
  travel_class: string;
  is_nonstop: boolean;
  total_seats: number;
  available_seats: number;
  price_per_seat: number;
  original_price: number | null;
  is_public: boolean;
  status: string;
  contact_phone: string;
}

const STATUS_COLORS: Record<string, string> = {
  available:    "bg-green-900/40 text-green-400 border-green-800/40",
  filling_fast: "bg-amber-900/40 text-amber-400 border-amber-800/40",
  sold_out:     "bg-red-900/40 text-red-400 border-red-800/40",
  expired:      "bg-slate-800 text-slate-500 border-slate-700",
};
const MODE_EMOJI: Record<string, string> = {
  bus: "🚌", train: "🚂", flight: "✈️", boat: "🚢", cab: "🚖",
};
const CLASS_LABEL: Record<string, string> = {
  economy: "Economy", business: "Business Class", first: "First Class",
};

export default function TicketsPage() {
  const { data: session } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [soldInput, setSoldInput] = useState<Record<number, string>>({});
  const [showExpired, setShowExpired] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);

  const fetchTickets = async () => {
    if (!session?.user?.email) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/agent/tickets`, { headers: { "X-User-Email": session.user.email } });
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTickets(); }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSeats = async (ticket: Ticket) => {
    const soldVal = soldInput[ticket.id];
    if (soldVal === undefined || soldVal === "") return;
    const sold = Number(soldVal);
    setUpdatingId(ticket.id);
    try {
      await fetch(`${API}/api/agent/tickets/${ticket.id}/seats`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-User-Email": session!.user!.email! },
        body: JSON.stringify({ sold }),
      });
      setSoldInput(prev => { const next = { ...prev }; delete next[ticket.id]; return next; });
      fetchTickets();
    } catch (e) { console.error(e); }
    finally { setUpdatingId(null); }
  };

  const togglePublic = async (ticket: Ticket) => {
    await fetch(`${API}/api/agent/tickets/${ticket.id}/toggle`, {
      method: "PATCH", headers: { "X-User-Email": session!.user!.email! },
    });
    fetchTickets();
  };

  const deleteTicket = async (ticket: Ticket) => {
    const isFuture = ticket.travel_date >= new Date().toISOString().slice(0, 10);
    const msg = isFuture
      ? `This ticket is for ${ticket.travel_date} (upcoming). Deleting it before the travel date means travellers can no longer contact you.\n\nDelete "${ticket.title}"?`
      : `Delete expired ticket "${ticket.title}"?`;
    if (!confirm(msg)) return;
    await fetch(`${API}/api/agent/tickets/${ticket.id}`, {
      method: "DELETE", headers: { "X-User-Email": session!.user!.email! },
    });
    fetchTickets();
  };

  const deleteAllExpired = async () => {
    const expired = tickets.filter(t => t.status === "expired");
    if (expired.length === 0) return;
    if (!confirm(`Delete all ${expired.length} expired ticket listing${expired.length > 1 ? "s" : ""}? This cannot be undone.`)) return;
    setCleaningUp(true);
    try {
      await fetch(`${API}/api/agent/tickets/expired`, {
        method: "DELETE", headers: { "X-User-Email": session!.user!.email! },
      });
      fetchTickets();
    } catch (e) { console.error(e); }
    finally { setCleaningUp(false); }
  };

  const today = new Date().toISOString().slice(0, 10);
  const active  = tickets.filter(t => t.travel_date >= today);
  const expired = tickets.filter(t => t.travel_date < today);
  const shown   = showExpired ? tickets : active;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Tickets</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {active.length} active listing{active.length !== 1 ? "s" : ""}
            {expired.length > 0 && ` · ${expired.length} expired`}
          </p>
        </div>
        <div className="flex gap-2">
          {expired.length > 0 && (
            <button onClick={deleteAllExpired} disabled={cleaningUp}
              className="text-xs px-3 py-2 rounded-lg border border-red-800/50 text-red-400 hover:border-red-700 transition-all disabled:opacity-50">
              {cleaningUp ? "Cleaning…" : `🗑 Clear ${expired.length} expired`}
            </button>
          )}
          <Link href="/agent/tickets/new"
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "#1e3a8a" }}>
            + List Ticket
          </Link>
        </div>
      </div>

      {expired.length > 0 && (
        <button onClick={() => setShowExpired(p => !p)}
          className="text-xs text-slate-500 hover:text-slate-300 mb-4 transition-colors">
          {showExpired ? "▲ Hide expired" : `▼ Show ${expired.length} expired listing${expired.length > 1 ? "s" : ""}`}
        </button>
      )}

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">🎫</div>
          <p className="text-slate-300 font-semibold">No ticket listings yet</p>
          <p className="text-slate-500 text-sm mt-1">List spare seats — flights, buses, trains — at your price</p>
          <Link href="/agent/tickets/new" className="inline-block mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#1e3a8a" }}>+ List a Ticket</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map(ticket => {
            const soldSeats = ticket.total_seats - ticket.available_seats;
            const fillPct = ticket.total_seats > 0 ? Math.round((soldSeats / ticket.total_seats) * 100) : 0;
            const isFlight = ticket.mode === "flight";
            const isExpired = ticket.status === "expired";
            return (
              <div key={ticket.id} className={`bg-slate-900 border rounded-xl p-4 transition-all ${isExpired ? "border-slate-800 opacity-60" : "border-slate-800 hover:border-slate-700"}`}>
                <div className="flex items-start gap-4">
                  <div className="text-3xl shrink-0 mt-0.5">{MODE_EMOJI[ticket.mode] || "🎫"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-semibold text-white">{ticket.title}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${STATUS_COLORS[ticket.status] || STATUS_COLORS.available}`}>
                        {ticket.status.replace("_", " ")}
                      </span>
                      {ticket.is_public ? (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-green-900/20 text-green-400 border border-green-800/30">Public</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-500">Draft</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-300 mb-1">
                      <span className="font-medium">{ticket.origin}</span>
                      <span className="text-slate-600">→</span>
                      <span className="font-medium">{ticket.destination}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-2">
                      <span>📅 {ticket.travel_date}{ticket.travel_time && ` at ${ticket.travel_time}`}</span>
                      {isFlight && ticket.airline_name && (
                        <span>✈ {ticket.airline_name} {ticket.flight_number}</span>
                      )}
                      {isFlight && ticket.travel_class && (
                        <span className={`px-1.5 py-0.5 rounded ${ticket.travel_class === "business" ? "bg-blue-900/30 text-blue-300" : ticket.travel_class === "first" ? "bg-amber-900/30 text-amber-300" : "bg-slate-800 text-slate-400"}`}>
                          {CLASS_LABEL[ticket.travel_class] || ticket.travel_class}
                        </span>
                      )}
                      {isFlight && (
                        <span className={ticket.is_nonstop ? "text-green-400" : "text-amber-400"}>
                          {ticket.is_nonstop ? "Direct" : "With stops"}
                        </span>
                      )}
                      <span>💺 {ticket.available_seats}/{ticket.total_seats} seats</span>
                      <span style={{ color: "#d4a017" }}>₹{ticket.price_per_seat?.toLocaleString()}/seat</span>
                    </div>

                    {/* Fill bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-40">
                        <div className={`h-full rounded-full transition-all ${fillPct > 80 ? "bg-red-500" : fillPct > 50 ? "bg-amber-500" : "bg-green-500"}`}
                          style={{ width: `${fillPct}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{fillPct}% filled</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    {/* Visibility toggle */}
                    {!isExpired && (
                      <button onClick={() => togglePublic(ticket)}
                        className={`text-xs px-2 py-1.5 rounded-lg border transition-all ${ticket.is_public ? "border-green-700 text-green-400 hover:border-green-600" : "border-slate-700 text-slate-400 hover:border-slate-600"}`}>
                        {ticket.is_public ? "⊙ Public" : "○ Draft"}
                      </button>
                    )}
                    {/* Update seats */}
                    {!isExpired && (
                      <div className="flex items-center gap-1">
                        <input type="number" min={0} max={ticket.total_seats}
                          value={soldInput[ticket.id] ?? ""}
                          onChange={e => setSoldInput(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                          placeholder="Sold"
                          className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#d4a017]" />
                        <button onClick={() => updateSeats(ticket)}
                          disabled={updatingId === ticket.id || !soldInput[ticket.id]}
                          className="text-xs px-2 py-1.5 text-white rounded-lg disabled:opacity-40 transition-all"
                          style={{ background: "#1e3a8a" }}>
                          {updatingId === ticket.id ? "…" : "Update"}
                        </button>
                      </div>
                    )}
                    <button onClick={() => deleteTicket(ticket)}
                      className="text-xs text-red-500 hover:bg-red-900/20 rounded-lg py-1 px-2 transition-all">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
