"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import TagInput from "@/components/agent/TagInput";
import ChecklistBuilder from "@/components/agent/ChecklistBuilder";
import ImageGrid from "@/components/agent/ImageGrid";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const CATEGORIES = ["adventure", "family", "honeymoon", "pilgrimage", "beach", "cultural", "wildlife", "budget", "trekking", "corporate"];
const DIFFICULTIES = ["easy", "moderate", "challenging"];

interface ItineraryDay { day: number; title: string; activities: string[]; }

function ItineraryBuilder({ value, onChange }: { value: ItineraryDay[]; onChange: (v: ItineraryDay[]) => void }) {
  const [expanded, setExpanded] = useState<number[]>([]);

  const addDay = () => {
    const newDay: ItineraryDay = { day: value.length + 1, title: "", activities: [] };
    onChange([...value, newDay]);
    setExpanded(prev => [...prev, value.length]);
  };

  const removeDay = (i: number) => {
    const updated = value.filter((_, idx) => idx !== i).map((d, idx) => ({ ...d, day: idx + 1 }));
    onChange(updated);
    setExpanded(prev => prev.filter(x => x !== i).map(x => x > i ? x - 1 : x));
  };

  const updateDay = (i: number, field: keyof ItineraryDay, val: string | string[]) => {
    onChange(value.map((d, idx) => idx === i ? { ...d, [field]: val } : d));
  };

  const toggleExpand = (i: number) => setExpanded(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  const addActivity = (i: number, act: string) => {
    if (!act.trim()) return;
    updateDay(i, "activities", [...value[i].activities, act.trim()]);
  };

  const removeActivity = (dayIdx: number, actIdx: number) => {
    updateDay(dayIdx, "activities", value[dayIdx].activities.filter((_, ai) => ai !== actIdx));
  };

  return (
    <div className="flex flex-col gap-2">
      {value.map((day, i) => (
        <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
          <button onClick={() => toggleExpand(i)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800 transition-colors">
            <span className="text-xs font-bold text-[#d4a017] w-12 flex-shrink-0">Day {day.day}</span>
            <span className="flex-1 text-sm text-slate-200 truncate">{day.title || <span className="text-slate-500 italic">Untitled day</span>}</span>
            <span className="text-xs text-slate-500">{day.activities.length} activities</span>
            <span className="text-slate-400 ml-2">{expanded.includes(i) ? "▲" : "▼"}</span>
          </button>
          {expanded.includes(i) && (
            <div className="px-4 pb-4 flex flex-col gap-3 border-t border-slate-700 pt-3">
              <input value={day.title} onChange={e => updateDay(i, "title", e.target.value)}
                placeholder="Day title (e.g. Arrival & City Tour)"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017]" />
              <div className="flex flex-col gap-1">
                {day.activities.map((act, ai) => (
                  <div key={ai} className="flex items-center gap-2">
                    <span className="text-slate-600 text-xs w-4">•</span>
                    <span className="flex-1 text-sm text-slate-300">{act}</span>
                    <button onClick={() => removeActivity(i, ai)} className="text-slate-600 hover:text-red-400 text-sm">×</button>
                  </div>
                ))}
                <ActivityAdder onAdd={(act) => addActivity(i, act)} />
              </div>
              <button onClick={() => removeDay(i)} className="text-xs text-red-500 hover:text-red-400 self-end mt-1">Remove day</button>
            </div>
          )}
        </div>
      ))}
      <button onClick={addDay} className="text-sm font-medium text-[#1e40af] hover:text-[#d4a017] transition-colors mt-1">+ Add day</button>
    </div>
  );
}

function ActivityAdder({ onAdd }: { onAdd: (act: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex gap-2 mt-1">
      <input value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onAdd(val); setVal(""); } }}
        placeholder="Add activity…"
        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017]" />
      <button onClick={() => { onAdd(val); setVal(""); }} className="px-2 py-1.5 text-sm text-white rounded-lg" style={{ background: "#1e3a8a" }}>+</button>
    </div>
  );
}

const SECTION_LABEL = "text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5 block";
const INPUT_CLASS = "w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017]";
const SELECT_CLASS = "w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#d4a017]";
const SECTION_TITLE = "text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2";

export default function EditPackagePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [fetchLoading, setFetchLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Core fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("adventure");
  const [destinations, setDestinations] = useState<string[]>([]);
  const [durationDays, setDurationDays] = useState(3);
  const [durationNights, setDurationNights] = useState(2);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [inclusions, setInclusions] = useState<string[]>([]);
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [whatToCarry, setWhatToCarry] = useState<string[]>([]);

  // Pricing
  const [pricePer, setPricePer] = useState(0);
  const [priceCouple, setPriceCouple] = useState<number | "">("");
  const [priceChild, setPriceChild] = useState<number | "">("");

  // Group
  const [groupMin, setGroupMin] = useState(1);
  const [groupMax, setGroupMax] = useState(30);
  const [difficulty, setDifficulty] = useState("easy");
  const [ageMin, setAgeMin] = useState<number | "">("");
  const [ageMax, setAgeMax] = useState<number | "">("");
  const [cancellationPolicy, setCancellationPolicy] = useState("");

  // Media & Contact
  const [availableDates, setAvailableDates] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [contactPhone, setContactPhone] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [currentStatus, setCurrentStatus] = useState("draft");

  useEffect(() => {
    if (!session?.user?.email || !id) return;
    fetch(`${API}/api/agent/packages/${id}`, { headers: { "X-User-Email": session.user.email } })
      .then(r => r.json())
      .then(d => {
        setTitle(d.title ?? "");
        setCategory(d.category ?? "adventure");
        setDestinations(d.destinations ?? []);
        setDurationDays(d.duration_days ?? 3);
        setDurationNights(d.duration_nights ?? 2);
        setItinerary(d.itinerary ?? []);
        setHighlights(d.highlights ?? []);
        setInclusions(d.inclusions ?? []);
        setExclusions(d.exclusions ?? []);
        setWhatToCarry(d.what_to_carry ?? []);
        setPricePer(d.price_per_person ?? 0);
        setPriceCouple(d.price_couple ?? "");
        setPriceChild(d.price_child ?? "");
        setGroupMin(d.group_min ?? 1);
        setGroupMax(d.group_max ?? 30);
        setDifficulty(d.difficulty ?? "easy");
        setAgeMin(d.age_min ?? "");
        setAgeMax(d.age_max ?? "");
        setCancellationPolicy(d.cancellation_policy ?? "");
        setAvailableDates((d.available_dates ?? []).join(", "));
        setImages(d.image_urls ?? []);
        setContactPhone(d.contact_phone ?? "");
        setContactWhatsapp(d.contact_whatsapp ?? "");
        setContactEmail(d.contact_email ?? "");
        setCurrentStatus(d.status ?? "draft");
      })
      .catch(console.error)
      .finally(() => setFetchLoading(false));
  }, [session, id]);

  const buildPayload = (status: string) => ({
    title, category, destinations,
    duration_days: durationDays, duration_nights: durationNights,
    itinerary, highlights, inclusions, exclusions,
    what_to_carry: whatToCarry,
    price_per_person: pricePer,
    price_couple: priceCouple === "" ? null : priceCouple,
    price_child: priceChild === "" ? null : priceChild,
    group_min: groupMin, group_max: groupMax,
    difficulty,
    age_min: ageMin === "" ? null : ageMin,
    age_max: ageMax === "" ? null : ageMax,
    cancellation_policy: cancellationPolicy,
    available_dates: availableDates.split(",").map(d => d.trim()).filter(Boolean),
    image_urls: images,
    contact_phone: contactPhone, contact_whatsapp: contactWhatsapp, contact_email: contactEmail,
    status,
  });

  const handleSave = async (status: string) => {
    if (!title.trim()) { setError("Title is required."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/agent/packages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-User-Email": session!.user!.email! },
        body: JSON.stringify(buildPayload(status)),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Save failed"); }
      router.push("/agent/packages");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally { setLoading(false); }
  };

  if (fetchLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex flex-col gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-40 bg-slate-900 rounded-2xl animate-pulse border border-slate-800" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Edit Package</h1>
          <p className="text-slate-400 text-sm mt-1">Update your tour package details</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-md ${currentStatus === "published" ? "bg-green-900/40 text-green-400" : "bg-slate-800 text-slate-400"}`}>
          {currentStatus}
        </span>
      </div>

      {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 mb-4">{error}</p>}

      <div className="flex flex-col gap-6">
        {/* Basic Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>📋 Basic Information</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className={SECTION_LABEL}>Package Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className={INPUT_CLASS} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={SECTION_LABEL}>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className={SELECT_CLASS}>
                  {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className={SECTION_LABEL}>Difficulty</label>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className={SELECT_CLASS}>
                  {DIFFICULTIES.map(d => <option key={d} value={d} className="capitalize">{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={SECTION_LABEL}>Destinations</label>
              <TagInput value={destinations} onChange={setDestinations} placeholder="Type destination and press Enter" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={SECTION_LABEL}>Duration (Days)</label>
                <input type="number" value={durationDays} onChange={e => setDurationDays(Number(e.target.value))} min={1} className={INPUT_CLASS} />
              </div>
              <div>
                <label className={SECTION_LABEL}>Duration (Nights)</label>
                <input type="number" value={durationNights} onChange={e => setDurationNights(Number(e.target.value))} min={0} className={INPUT_CLASS} />
              </div>
            </div>
          </div>
        </div>

        {/* Itinerary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>🗺️ Itinerary</p>
          <ItineraryBuilder value={itinerary} onChange={setItinerary} />
        </div>

        {/* Highlights */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>⭐ Highlights</p>
          <ChecklistBuilder value={highlights} onChange={setHighlights} placeholder="Add a highlight…" />
        </div>

        {/* Inclusions & Exclusions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className={SECTION_TITLE}>✅ Inclusions</p>
            <ChecklistBuilder value={inclusions} onChange={setInclusions} placeholder="What's included…" />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className={SECTION_TITLE}>❌ Exclusions</p>
            <ChecklistBuilder value={exclusions} onChange={setExclusions} placeholder="What's not included…" />
          </div>
        </div>

        {/* What to carry */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>🎒 What to Carry</p>
          <ChecklistBuilder value={whatToCarry} onChange={setWhatToCarry} placeholder="Add item to carry…" />
        </div>

        {/* Pricing */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>💰 Pricing</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={SECTION_LABEL}>Price/Person (₹) *</label>
              <input type="number" value={pricePer} onChange={e => setPricePer(Number(e.target.value))} min={0} className={INPUT_CLASS} />
            </div>
            <div>
              <label className={SECTION_LABEL}>Price/Couple (₹)</label>
              <input type="number" value={priceCouple} onChange={e => setPriceCouple(e.target.value === "" ? "" : Number(e.target.value))} min={0} placeholder="Optional" className={INPUT_CLASS} />
            </div>
            <div>
              <label className={SECTION_LABEL}>Price/Child (₹)</label>
              <input type="number" value={priceChild} onChange={e => setPriceChild(e.target.value === "" ? "" : Number(e.target.value))} min={0} placeholder="Optional" className={INPUT_CLASS} />
            </div>
          </div>
        </div>

        {/* Group & Age */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>👥 Group & Age</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={SECTION_LABEL}>Min Group</label>
              <input type="number" value={groupMin} onChange={e => setGroupMin(Number(e.target.value))} min={1} className={INPUT_CLASS} />
            </div>
            <div>
              <label className={SECTION_LABEL}>Max Group</label>
              <input type="number" value={groupMax} onChange={e => setGroupMax(Number(e.target.value))} min={1} className={INPUT_CLASS} />
            </div>
            <div>
              <label className={SECTION_LABEL}>Min Age</label>
              <input type="number" value={ageMin} onChange={e => setAgeMin(e.target.value === "" ? "" : Number(e.target.value))} min={0} placeholder="None" className={INPUT_CLASS} />
            </div>
            <div>
              <label className={SECTION_LABEL}>Max Age</label>
              <input type="number" value={ageMax} onChange={e => setAgeMax(e.target.value === "" ? "" : Number(e.target.value))} min={0} placeholder="None" className={INPUT_CLASS} />
            </div>
          </div>
        </div>

        {/* Cancellation */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>📜 Cancellation Policy</p>
          <textarea value={cancellationPolicy} onChange={e => setCancellationPolicy(e.target.value)} rows={3}
            placeholder="Describe your cancellation and refund policy…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017] resize-none" />
        </div>

        {/* Dates */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>📅 Available Dates</p>
          <label className={SECTION_LABEL}>Departure dates (comma-separated YYYY-MM-DD)</label>
          <input value={availableDates} onChange={e => setAvailableDates(e.target.value)}
            placeholder="2025-12-01, 2025-12-15, 2026-01-05"
            className={INPUT_CLASS} />
        </div>

        {/* Images */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>📸 Photos</p>
          <ImageGrid value={images} onChange={setImages} maxImages={8} />
        </div>

        {/* Contact */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>📞 Booking Contact</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className={SECTION_LABEL}>Phone</label>
              <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className={INPUT_CLASS} />
            </div>
            <div>
              <label className={SECTION_LABEL}>WhatsApp</label>
              <input value={contactWhatsapp} onChange={e => setContactWhatsapp(e.target.value)} className={INPUT_CLASS} />
            </div>
            <div>
              <label className={SECTION_LABEL}>Email</label>
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className={INPUT_CLASS} />
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-6 justify-end">
        <button onClick={() => router.push("/agent/packages")}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 border border-slate-700 hover:border-slate-600 transition-all">
          Cancel
        </button>
        <button onClick={() => handleSave("draft")} disabled={loading}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-700 text-slate-300 hover:border-slate-600 transition-all disabled:opacity-50">
          {loading ? "Saving…" : "Save as Draft"}
        </button>
        <button onClick={() => handleSave("published")} disabled={loading}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: "#1e3a8a" }}>
          {loading ? "Publishing…" : currentStatus === "published" ? "Update Published" : "Publish →"}
        </button>
      </div>
    </div>
  );
}
