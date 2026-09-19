"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import EnquiryModal from "@/components/agent/EnquiryModal";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const MODE_EMOJI: Record<string, string> = { bus: "🚌", train: "🚂", flight: "✈️", boat: "⛵", cab: "🚗" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export default function TicketDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [ticket, setTicket] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`${API}/api/explore/tickets/${id}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setTicket(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-32 bg-slate-900 rounded-2xl border border-slate-800" />
      <div className="h-8 w-1/2 bg-slate-900 rounded-lg" />
    </div>
  );

  if (notFound || !ticket) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">🎫</div>
      <h2 className="text-xl font-semibold text-white mb-2">Ticket not found</h2>
      <Link href="/explore/tickets" className="text-sm px-4 py-2 rounded-lg text-white" style={{ background: "#1e3a8a" }}>← Back to tickets</Link>
    </div>
  );

  const agent = ticket.agent || {};
  const total = ticket.total_seats || 1;
  const avail = ticket.available_seats || 0;
  const pct = Math.round(((total - avail) / total) * 100);

  const statusClass: Record<string, string> = {
    available: "bg-green-900/40 text-green-400",
    filling_fast: "bg-yellow-900/40 text-yellow-400",
    sold_out: "bg-red-900/40 text-red-400",
    cancelled: "bg-red-900/60 text-red-300",
  };

  return (
    <>
      <EnquiryModal
        isOpen={enquiryOpen}
        onClose={() => setEnquiryOpen(false)}
        agentEmail={agent.email || ""}
        listingType="ticket"
        listingId={ticket.id}
        listingTitle={ticket.title}
        agentPhone={agent.phone}
        agentWhatsapp={agent.whatsapp}
      />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
        <Link href="/explore" className="hover:text-slate-300">Explore</Link>
        <span>/</span>
        <Link href="/explore/tickets" className="hover:text-slate-300">Tickets</Link>
        <span>/</span>
        <span className="text-slate-400 line-clamp-1">{ticket.title}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Route Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">{MODE_EMOJI[ticket.mode] || "🚌"}</span>
              <div>
                <h1 className="text-xl font-bold text-white">{ticket.title}</h1>
                <p className="text-sm text-slate-400 capitalize">{ticket.mode} · {ticket.ticket_type}</p>
              </div>
              <div className="ml-auto">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusClass[ticket.status] || "bg-slate-800 text-slate-300"}`}>
                  {ticket.status?.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            {/* Route visualization */}
            <div className="flex items-center gap-3 bg-slate-800 rounded-xl p-4">
              <div className="text-center">
                <p className="text-lg font-bold text-white">{ticket.origin}</p>
                {ticket.departure_time && <p className="text-xs text-slate-400">{ticket.departure_time}</p>}
              </div>
              <div className="flex-1 flex items-center gap-1">
                <div className="flex-1 h-px bg-slate-600" />
                <span className="text-slate-500 text-xs">✈</span>
                <div className="flex-1 h-px bg-slate-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">{ticket.destination}</p>
                {ticket.arrival_time && <p className="text-xs text-slate-400">{ticket.arrival_time}</p>}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-400">
              {ticket.travel_date && <span>📅 {ticket.travel_date}</span>}
              {ticket.duration && <span>⏱ {ticket.duration}</span>}
            </div>
          </div>

          {/* Seats Availability */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Seat Availability</h2>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">{avail} seats available</span>
              <span className="text-slate-500">{total} total seats</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all" style={{
                width: `${pct}%`,
                background: pct > 80 ? "#ef4444" : pct > 50 ? "#f59e0b" : "#22c55e"
              }} />
            </div>
            <p className="text-xs text-slate-500">{pct}% booked</p>
          </div>

          {/* Pickup Points */}
          {ticket.pickup_points?.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Pickup Points</h2>
              <div className="space-y-2">
                {ticket.pickup_points.map((pt: AnyRecord, i: number) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-blue-400">📍</span>
                    <span className="text-white">{pt.location}</span>
                    {pt.time && <span className="text-slate-500 ml-auto">{pt.time}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Amenities */}
          {ticket.amenities?.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {ticket.amenities.map((a: string, i: number) => (
                  <span key={i} className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300">{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Vehicle Details */}
          {(ticket.vehicle_number || ticket.operator_name) && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Vehicle Details</h2>
              <div className="space-y-1.5 text-sm">
                {ticket.operator_name && <p className="text-slate-300">Operator: <span className="text-white">{ticket.operator_name}</span></p>}
                {ticket.vehicle_number && <p className="text-slate-300">Vehicle No: <span className="text-white">{ticket.vehicle_number}</span></p>}
                {ticket.vehicle_type && <p className="text-slate-300">Type: <span className="text-white capitalize">{ticket.vehicle_type}</span></p>}
              </div>
            </div>
          )}

          {/* Notes */}
          {ticket.notes && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Notes</h2>
              <p className="text-sm text-slate-300 whitespace-pre-line">{ticket.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="lg:sticky lg:top-20 space-y-4">
            {/* Booking Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-2xl font-bold mb-1" style={{ color: "#d4a017" }}>
                ₹{ticket.price_per_seat?.toLocaleString()}
                <span className="text-sm font-normal text-slate-400">/seat</span>
              </p>
              {ticket.price_whole && (
                <p className="text-sm text-slate-400">Full vehicle: ₹{ticket.price_whole?.toLocaleString()}</p>
              )}

              <div className="my-4 space-y-2 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Travel date</span>
                  <span className="text-white">{ticket.travel_date || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mode</span>
                  <span className="text-white capitalize">{ticket.mode}</span>
                </div>
                <div className="flex justify-between">
                  <span>Type</span>
                  <span className="text-white capitalize">{ticket.ticket_type}</span>
                </div>
              </div>

              <button
                onClick={() => setEnquiryOpen(true)}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all mb-2"
                style={{ background: "#1e3a8a" }}>
                Enquire / Book
              </button>

              {(agent.whatsapp || agent.phone) && (
                <button
                  onClick={() => {
                    const number = (agent.whatsapp || agent.phone || "").replace(/\D/g, "");
                    const text = encodeURIComponent(`Hi, I'm interested in ${ticket.title}. Could you please share details?`);
                    window.open(`https://wa.me/${number}?text=${text}`, "_blank", "noopener,noreferrer");
                  }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 mb-2"
                  style={{ background: "#25d366" }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </button>
              )}

              {agent.phone && (
                <a href={`tel:${agent.phone}`}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 transition-all flex items-center justify-center gap-2">
                  📞 {agent.phone}
                </a>
              )}
            </div>

            {/* Agent Info */}
            {agent.name && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Agent</h3>
                <div className="flex items-center gap-3">
                  {agent.logo_url
                    ? <img src={agent.logo_url} alt={agent.name} className="w-10 h-10 rounded-full object-cover" />
                    : <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: "#1e3a8a" }}>{agent.name?.[0]?.toUpperCase()}</div>
                  }
                  <div>
                    <p className="text-sm font-semibold text-white">{agent.name}</p>
                    {agent.location && <p className="text-xs text-slate-400">{agent.location}</p>}
                  </div>
                </div>
                {agent.slug && (
                  <Link href={`/explore/agents/${agent.slug}`} className="block text-xs mt-3 transition-colors" style={{ color: "#d4a017" }}>
                    View profile →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
