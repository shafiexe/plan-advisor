"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import PickupPointsBuilder from "@/components/agent/PickupPointsBuilder";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface PickupPoint { location: string; time: string; }

const AMENITIES = ["AC", "Sleeper", "Restroom", "WiFi", "Entertainment", "Charging"];
const SECTION_LABEL = "text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5 block";
const INPUT_CLASS = "w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017]";
const SELECT_CLASS = "w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#d4a017]";
const SECTION_TITLE = "text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2";

export default function NewTicketPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Basic
  const [title, setTitle] = useState("");
  const [ticketType, setTicketType] = useState("group");
  const [mode, setMode] = useState("bus");

  // Route
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [travelTime, setTravelTime] = useState("");
  const [returnDate, setReturnDate] = useState("");

  // Seats
  const [totalSeats, setTotalSeats] = useState(40);
  const [pricePerSeat, setPricePerSeat] = useState(0);

  // Boarding
  const [departurePoint, setDeparturePoint] = useState("");
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);

  // Amenities
  const [amenities, setAmenities] = useState<string[]>([]);

  // Contact
  const [contactPhone, setContactPhone] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const toggleAmenity = (a: string) => setAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const handleSubmit = async () => {
    if (!title.trim() || !origin.trim() || !destination.trim() || !travelDate) {
      setError("Title, origin, destination, and travel date are required."); return;
    }
    if (totalSeats < 1) { setError("Total seats must be at least 1."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/agent/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Email": session!.user!.email! },
        body: JSON.stringify({
          title, ticket_type: ticketType, mode,
          origin, destination, travel_date: travelDate, travel_time: travelTime || null,
          return_date: returnDate || null,
          total_seats: totalSeats, available_seats: totalSeats,
          price_per_seat: pricePerSeat,
          departure_point: departurePoint,
          pickup_points: pickupPoints,
          amenities,
          contact_phone: contactPhone, contact_whatsapp: contactWhatsapp, contact_email: contactEmail,
          notes, is_public: isPublic,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Failed to create ticket"); }
      router.push("/agent/tickets");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">New Ticket</h1>
        <p className="text-slate-400 text-sm mt-1">List a group transport ticket</p>
      </div>

      {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 mb-4">{error}</p>}

      <div className="flex flex-col gap-6">
        {/* Basic */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>🎫 Basic Details</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className={SECTION_LABEL}>Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Calicut → Bangalore Group Bus"
                className={INPUT_CLASS} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={SECTION_LABEL}>Ticket Type</label>
                <select value={ticketType} onChange={e => setTicketType(e.target.value)} className={SELECT_CLASS}>
                  <option value="group">Group</option>
                  <option value="individual">Individual</option>
                </select>
              </div>
              <div>
                <label className={SECTION_LABEL}>Mode of Transport</label>
                <select value={mode} onChange={e => setMode(e.target.value)} className={SELECT_CLASS}>
                  <option value="bus">🚌 Bus</option>
                  <option value="train">🚂 Train</option>
                  <option value="flight">✈️ Flight</option>
                  <option value="boat">🚢 Boat</option>
                  <option value="cab">🚖 Cab</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Route */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>🗺️ Route & Schedule</p>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={SECTION_LABEL}>Origin *</label>
                <input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="e.g. Calicut" className={INPUT_CLASS} />
              </div>
              <div>
                <label className={SECTION_LABEL}>Destination *</label>
                <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="e.g. Bangalore" className={INPUT_CLASS} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={SECTION_LABEL}>Travel Date *</label>
                <input type="date" value={travelDate} onChange={e => setTravelDate(e.target.value)} className={INPUT_CLASS} />
              </div>
              <div>
                <label className={SECTION_LABEL}>Departure Time</label>
                <input type="time" value={travelTime} onChange={e => setTravelTime(e.target.value)} className={INPUT_CLASS} />
              </div>
            </div>
            <div>
              <label className={SECTION_LABEL}>Return Date (optional)</label>
              <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className={INPUT_CLASS} />
            </div>
          </div>
        </div>

        {/* Seats */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>💺 Seats & Pricing</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={SECTION_LABEL}>Total Seats *</label>
              <input type="number" value={totalSeats} onChange={e => setTotalSeats(Number(e.target.value))} min={1} className={INPUT_CLASS} />
            </div>
            <div>
              <label className={SECTION_LABEL}>Price per Seat (₹)</label>
              <input type="number" value={pricePerSeat} onChange={e => setPricePerSeat(Number(e.target.value))} min={0} className={INPUT_CLASS} />
            </div>
          </div>
        </div>

        {/* Boarding */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>📍 Boarding Points</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className={SECTION_LABEL}>Main Departure Point</label>
              <input value={departurePoint} onChange={e => setDeparturePoint(e.target.value)}
                placeholder="e.g. KSRTC Bus Stand, Calicut"
                className={INPUT_CLASS} />
            </div>
            <div>
              <label className={SECTION_LABEL}>Additional Pickup Points</label>
              <PickupPointsBuilder value={pickupPoints} onChange={setPickupPoints} />
            </div>
          </div>
        </div>

        {/* Amenities */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>✨ Amenities</p>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map(a => (
              <button key={a} onClick={() => toggleAmenity(a)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${amenities.includes(a) ? "border-[#d4a017] text-[#d4a017]" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
                style={amenities.includes(a) ? { background: "#d4a01712" } : {}}>
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>📞 Contact & Notes</p>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={SECTION_LABEL}>Phone</label>
                <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+91 98765 43210" className={INPUT_CLASS} />
              </div>
              <div>
                <label className={SECTION_LABEL}>WhatsApp</label>
                <input value={contactWhatsapp} onChange={e => setContactWhatsapp(e.target.value)} placeholder="+91 98765 43210" className={INPUT_CLASS} />
              </div>
            </div>
            <div>
              <label className={SECTION_LABEL}>Email</label>
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="contact@agency.com" className={INPUT_CLASS} />
            </div>
            <div>
              <label className={SECTION_LABEL}>Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Any additional information for passengers…"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017] resize-none" />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsPublic(!isPublic)}
                className={`relative w-10 h-5 rounded-full transition-colors ${isPublic ? "" : "bg-slate-700"}`}
                style={isPublic ? { background: "#1e3a8a" } : {}}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPublic ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
              <label className="text-sm text-slate-300">Make publicly visible</label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6 justify-end">
        <button onClick={() => router.push("/agent/tickets")}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 border border-slate-700 hover:border-slate-600 transition-all">
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={loading}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: "#1e3a8a" }}>
          {loading ? "Creating…" : "Create Ticket"}
        </button>
      </div>
    </div>
  );
}
