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
  total_seats: number;
  available_seats: number;
  price_per_seat: number;
  status: string;
  is_public: boolean;
  contact_phone: string;
}

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-900/40 text-green-400 border-green-800/40",
  filling_fast: "bg-amber-900/40 text-amber-400 border-amber-800/40",
  sold_out: "bg-red-900/40 text-red-400 border-red-800/40",
  expired: "bg-slate-800 text-slate-500 border-slate-700",
};

const MODE_EMOJI: Record<string, string> = {
  bus: "🚌", train: "🚂", flight: "✈️", boat: "🚢", cab: "🚖",
};

export default function TicketsPage() {
  const { data: session } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [soldInput, setSoldInput] = useState<Record<number, string>>({});

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

  const deleteTicket = async (ticket: Ticket) => {
    if (!confirm(`Delete ticket "${ticket.title}"?`)) return;
    await fetch(`${API}/api/agent/tickets/${ticket.id}`, {
      method: "DELETE", headers: { "X-User-Email": session!.user!.email! },
    });
    fetchTickets();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Tickets</h1>
          <p className="text-slate-400 text-sm mt-0.5">{tickets.length} listings</p>
        </div>
        <Link href="/agent/tickets/new"
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: "#1e3a8a" }}>
          + New Ticket
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">🎫</div>
          <p className="text-slate-300 font-semibold">No tickets yet</p>
          <p className="text-slate-500 text-sm mt-1">List group transport tickets for your tours</p>
          <Link href="/agent/tickets/new" className="inline-block mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#1e3a8a" }}>+ Create Ticket</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map(ticket => {
            const soldSeats = ticket.total_seats - ticket.available_seats;
            const fillPct = ticket.total_seats > 0 ? Math.round((soldSeats / ticket.total_seats) * 100) : 0;
            return (
              <div key={ticket.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all">
                <div className="flex items-start gap-4">
                  <div className="text-3xl flex-shrink-0 mt-0.5">{MODE_EMOJI[ticket.mode] || "🚌"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-semibold text-white">{ticket.title}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${STATUS_COLORS[ticket.status] || STATUS_COLORS.available}`}>
                        {ticket.status.replace("_", " ")}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 capitalize">{ticket.mode}</span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 capitalize">{ticket.ticket_type}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-300 mb-2">
                      <span className="font-medium">{ticket.origin}</span>
                      <span className="text-slate-600">→</span>
                      <span className="font-medium">{ticket.destination}</span>
                      <span className="text-slate-500 text-xs ml-2">
                        {ticket.travel_date} {ticket.travel_time && `at ${ticket.travel_time}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                      <span>💺 {ticket.available_seats}/{ticket.total_seats} seats available</span>
                      <span>₹{ticket.price_per_seat?.toLocaleString()}/seat</span>
                      {ticket.contact_phone && <span>📞 {ticket.contact_phone}</span>}
                    </div>

                    {/* Seat fill bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-40">
                        <div className={`h-full rounded-full transition-all ${fillPct > 80 ? "bg-red-500" : fillPct > 50 ? "bg-amber-500" : "bg-green-500"}`}
                          style={{ width: `${fillPct}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{fillPct}% filled</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {/* Update seats sold */}
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min={0} max={ticket.total_seats}
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
                    <button onClick={() => deleteTicket(ticket)} className="text-xs text-red-500 hover:bg-red-900/20 rounded-lg py-1 px-2 transition-all">Delete</button>
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
