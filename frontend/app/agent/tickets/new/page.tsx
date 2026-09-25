"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import PickupPointsBuilder from "@/components/agent/PickupPointsBuilder";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface PickupPoint { location: string; time: string; }
interface Layover { city: string; duration: string; }

const AMENITIES_BY_MODE: Record<string, string[]> = {
  flight: ["Meal included", "Extra baggage", "Window seat", "Lounge access", "Priority boarding"],
  bus:    ["AC", "Sleeper", "Restroom", "WiFi", "Entertainment", "Charging", "Blanket"],
  train:  ["Meals included", "Bedding", "Charging points", "WiFi"],
  boat:   ["Meals", "Cabin", "AC", "Life jackets"],
  cab:    ["AC", "Water bottle", "Phone charger", "Music system"],
};

const SECTION_LABEL = "text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5 block";
const INPUT_CLASS = "w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017]";
const SELECT_CLASS = "w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#d4a017]";
const SECTION_TITLE = "text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2";

function LayoverBuilder({ value, onChange }: { value: Layover[]; onChange: (v: Layover[]) => void }) {
  const [city, setCity] = useState("");
  const [dur, setDur] = useState("");
  const add = () => {
    if (!city.trim()) return;
    onChange([...value, { city: city.trim(), duration: dur.trim() }]);
    setCity(""); setDur("");
  };
  return (
    <div className="flex flex-col gap-2">
      {value.map((l, i) => (
        <div key={i} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 text-sm">
          <span className="text-slate-300 flex-1">✈ {l.city}{l.duration && ` · ${l.duration}`}</span>
          <button onClick={() => onChange(value.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-400">×</button>
        </div>
      ))}
      <div className="flex gap-2">
        <input value={city} onChange={e => setCity(e.target.value)} placeholder="Layover city (e.g. Dubai)"
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017]" />
        <input value={dur} onChange={e => setDur(e.target.value)} placeholder="Duration (e.g. 2h 30m)"
          className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017]" />
        <button onClick={add} className="px-3 py-2 text-sm text-white rounded-lg" style={{ background: "#1e3a8a" }}>+</button>
      </div>
    </div>
  );
}

export default function NewTicketPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Basic
  const [title, setTitle] = useState("");
  const [ticketType, setTicketType] = useState("individual");
  const [mode, setMode] = useState("flight");

  // Route
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [travelTime, setTravelTime] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [returnDate, setReturnDate] = useState("");

  // Seats & Pricing
  const [totalSeats, setTotalSeats] = useState(1);
  const [pricePerSeat, setPricePerSeat] = useState(0);
  const [originalPrice, setOriginalPrice] = useState<number | "">("");

  // Flight-specific
  const [airlineName, setAirlineName] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [travelClass, setTravelClass] = useState("economy");
  const [isNonstop, setIsNonstop] = useState(true);
  const [layovers, setLayovers] = useState<Layover[]>([]);

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

  // Auto-generate title when fields are filled
  const autoTitle = () => {
    if (title) return;
    const parts = [];
    if (airlineName) parts.push(airlineName);
    if (flightNumber) parts.push(flightNumber);
    if (origin && destination) parts.push(`${origin} → ${destination}`);
    if (travelDate) parts.push(travelDate);
    if (travelClass !== "economy") parts.push(travelClass.charAt(0).toUpperCase() + travelClass.slice(1));
    if (parts.length) setTitle(parts.join(" · "));
  };

  const handleModeChange = (m: string) => {
    setMode(m);
    setAmenities([]);
    if (m !== "flight") {
      setAirlineName(""); setFlightNumber(""); setLayovers([]);
      setTravelClass("economy"); setIsNonstop(true);
    }
  };

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
          origin, destination,
          travel_date: travelDate,
          travel_time: travelTime || "",
          arrival_time: arrivalTime || "",
          return_date: returnDate || "",
          total_seats: totalSeats, available_seats: totalSeats,
          price_per_seat: pricePerSeat,
          original_price: originalPrice === "" ? null : originalPrice,
          departure_point: departurePoint,
          pickup_points: pickupPoints,
          amenities,
          airline_name: airlineName,
          flight_number: flightNumber,
          travel_class: travelClass,
          is_nonstop: isNonstop,
          layovers,
          contact_phone: contactPhone,
          contact_whatsapp: contactWhatsapp,
          contact_email: contactEmail,
          notes, is_public: isPublic,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Failed to create ticket"); }
      router.push("/agent/tickets");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally { setLoading(false); }
  };

  const amenityList = AMENITIES_BY_MODE[mode] || AMENITIES_BY_MODE.bus;
  const isFlight = mode === "flight";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">List a Ticket</h1>
        <p className="text-slate-400 text-sm mt-1">Sell spare seats at your price — travellers contact you directly</p>
      </div>

      {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 mb-4">{error}</p>}

      <div className="flex flex-col gap-6">
        {/* Mode selection — big buttons */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>🚀 Transport Type</p>
          <div className="grid grid-cols-5 gap-2">
            {[
              { val: "flight", emoji: "✈️", label: "Flight" },
              { val: "bus",    emoji: "🚌", label: "Bus" },
              { val: "train",  emoji: "🚂", label: "Train" },
              { val: "boat",   emoji: "🚢", label: "Boat" },
              { val: "cab",    emoji: "🚖", label: "Cab" },
            ].map(m => (
              <button key={m.val} onClick={() => handleModeChange(m.val)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-medium transition-all
                  ${mode === m.val ? "border-[#d4a017] text-[#d4a017]" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
                style={mode === m.val ? { background: "#d4a01715" } : {}}>
                <span className="text-xl">{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Flight-specific section */}
        {isFlight && (
          <div className="bg-slate-900 border border-amber-800/30 rounded-2xl p-6" style={{ borderColor: "#d4a01740" }}>
            <p className={SECTION_TITLE}>✈️ Flight Details</p>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={SECTION_LABEL}>Airline</label>
                  <input value={airlineName} onChange={e => setAirlineName(e.target.value)} onBlur={autoTitle}
                    placeholder="e.g. IndiGo, Air India, Emirates"
                    className={INPUT_CLASS} />
                </div>
                <div>
                  <label className={SECTION_LABEL}>Flight Number</label>
                  <input value={flightNumber} onChange={e => setFlightNumber(e.target.value)} onBlur={autoTitle}
                    placeholder="e.g. 6E 123"
                    className={INPUT_CLASS} />
                </div>
              </div>
              <div>
                <label className={SECTION_LABEL}>Class</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: "economy",  label: "Economy",  icon: "🪑" },
                    { val: "business", label: "Business", icon: "💼" },
                    { val: "first",    label: "First",    icon: "👑" },
                  ].map(c => (
                    <button key={c.val} onClick={() => setTravelClass(c.val)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all
                        ${travelClass === c.val ? "border-[#d4a017] text-[#d4a017]" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
                      style={travelClass === c.val ? { background: "#d4a01715" } : {}}>
                      {c.icon} {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={SECTION_LABEL}>Stops</label>
                <div className="flex gap-2">
                  <button onClick={() => setIsNonstop(true)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all
                      ${isNonstop ? "border-green-600 text-green-400" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
                    style={isNonstop ? { background: "#16a34a15" } : {}}>
                    ✈ Non-stop / Direct
                  </button>
                  <button onClick={() => setIsNonstop(false)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all
                      ${!isNonstop ? "border-amber-600 text-amber-400" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
                    style={!isNonstop ? { background: "#d97706" + "15" } : {}}>
                    🔁 With Layovers
                  </button>
                </div>
              </div>
              {!isNonstop && (
                <div>
                  <label className={SECTION_LABEL}>Layover Cities</label>
                  <LayoverBuilder value={layovers} onChange={setLayovers} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>🎫 Listing Details</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className={SECTION_LABEL}>Listing Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder={isFlight ? "e.g. IndiGo 6E 123 · Calicut → Dubai · Economy" : "e.g. Calicut → Bangalore Group Bus"}
                className={INPUT_CLASS} />
            </div>
            <div>
              <label className={SECTION_LABEL}>Ticket Type</label>
              <div className="flex gap-2">
                {[{ val: "individual", label: "👤 Individual seats" }, { val: "group", label: "👥 Group booking" }].map(t => (
                  <button key={t.val} onClick={() => setTicketType(t.val)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all
                      ${ticketType === t.val ? "border-[#1e3a8a] text-blue-300" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
                    style={ticketType === t.val ? { background: "#1e3a8a20" } : {}}>
                    {t.label}
                  </button>
                ))}
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
                <label className={SECTION_LABEL}>From * {isFlight && "(Airport / City)"}</label>
                <input value={origin} onChange={e => setOrigin(e.target.value)} onBlur={autoTitle}
                  placeholder={isFlight ? "e.g. Calicut (CCJ)" : "e.g. Calicut"}
                  className={INPUT_CLASS} />
              </div>
              <div>
                <label className={SECTION_LABEL}>To * {isFlight && "(Airport / City)"}</label>
                <input value={destination} onChange={e => setDestination(e.target.value)} onBlur={autoTitle}
                  placeholder={isFlight ? "e.g. Dubai (DXB)" : "e.g. Bangalore"}
                  className={INPUT_CLASS} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={SECTION_LABEL}>Travel Date *</label>
                <input type="date" value={travelDate} onChange={e => setTravelDate(e.target.value)} onBlur={autoTitle} className={INPUT_CLASS} />
              </div>
              <div>
                <label className={SECTION_LABEL}>Departure Time</label>
                <input type="time" value={travelTime} onChange={e => setTravelTime(e.target.value)} className={INPUT_CLASS} />
              </div>
            </div>
            {isFlight && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={SECTION_LABEL}>Arrival Time (at destination)</label>
                  <input type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} className={INPUT_CLASS} />
                </div>
                <div>
                  <label className={SECTION_LABEL}>Return Date (if round trip)</label>
                  <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className={INPUT_CLASS} />
                </div>
              </div>
            )}
            {!isFlight && (
              <div>
                <label className={SECTION_LABEL}>Return Date (optional)</label>
                <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className={INPUT_CLASS} />
              </div>
            )}
          </div>
        </div>

        {/* Seats & Pricing */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>💰 Seats & Pricing</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={SECTION_LABEL}>Seats Available *</label>
              <input type="number" value={totalSeats} onChange={e => setTotalSeats(Number(e.target.value))} min={1} className={INPUT_CLASS} />
            </div>
            <div>
              <label className={SECTION_LABEL}>Your Selling Price (₹)</label>
              <input type="number" value={pricePerSeat} onChange={e => setPricePerSeat(Number(e.target.value))} min={0} className={INPUT_CLASS} />
            </div>
            <div>
              <label className={SECTION_LABEL}>Original Price (₹) <span className="text-slate-600 font-normal">(optional)</span></label>
              <input type="number" value={originalPrice} onChange={e => setOriginalPrice(e.target.value === "" ? "" : Number(e.target.value))}
                min={0} placeholder="What you paid" className={INPUT_CLASS} />
            </div>
          </div>
          {originalPrice !== "" && originalPrice > 0 && pricePerSeat > 0 && pricePerSeat < Number(originalPrice) && (
            <p className="text-xs text-green-400 mt-2">
              ✓ Travellers save ₹{(Number(originalPrice) - pricePerSeat).toLocaleString()} ({Math.round((1 - pricePerSeat / Number(originalPrice)) * 100)}% off market price)
            </p>
          )}
        </div>

        {/* Boarding / Meeting Point */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>📍 {isFlight ? "Terminal & Boarding" : "Boarding Points"}</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className={SECTION_LABEL}>{isFlight ? "Terminal / Gate Info" : "Main Departure Point"}</label>
              <input value={departurePoint} onChange={e => setDeparturePoint(e.target.value)}
                placeholder={isFlight ? "e.g. Calicut Airport, Terminal 1, Gate 5 · Check-in by 5:00 AM" : "e.g. KSRTC Bus Stand, Calicut"}
                className={INPUT_CLASS} />
            </div>
            {!isFlight && (
              <div>
                <label className={SECTION_LABEL}>Additional Pickup Points</label>
                <PickupPointsBuilder value={pickupPoints} onChange={setPickupPoints} />
              </div>
            )}
          </div>
        </div>

        {/* Amenities */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>✨ {isFlight ? "Inclusions / Benefits" : "Amenities"}</p>
          <div className="flex flex-wrap gap-2">
            {amenityList.map(a => (
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
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="contact@example.com" className={INPUT_CLASS} />
            </div>
            <div>
              <label className={SECTION_LABEL}>Notes for buyer</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="e.g. Name change not possible. Full payment before ticket transfer. Contact before 10 PM."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017] resize-none" />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsPublic(!isPublic)}
                className={`relative w-10 h-5 rounded-full transition-colors ${isPublic ? "" : "bg-slate-700"}`}
                style={isPublic ? { background: "#1e3a8a" } : {}}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPublic ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
              <label className="text-sm text-slate-300">Make publicly visible to travellers</label>
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
          {loading ? "Listing…" : "List Ticket →"}
        </button>
      </div>
    </div>
  );
}
