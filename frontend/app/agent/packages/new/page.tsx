"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TagInput from "@/components/agent/TagInput";
import ChecklistBuilder from "@/components/agent/ChecklistBuilder";
import ImageGrid from "@/components/agent/ImageGrid";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const CATEGORIES = ["adventure", "family", "honeymoon", "pilgrimage", "beach", "cultural", "wildlife", "budget", "trekking", "corporate"];
const DIFFICULTIES = ["easy", "moderate", "challenging"];

interface ItineraryDay { day: number; title: string; activities: string[]; }

function ItineraryBuilder({ value, onChange }: { value: ItineraryDay[]; onChange: (v: ItineraryDay[]) => void }) {
  const [expanded, setExpanded] = useState<number[]>([0]);

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

export default function NewPackagePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiBrief, setAiBrief] = useState("");

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

  // Step 3 fields
  const [availableDates, setAvailableDates] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [contactPhone, setContactPhone] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const generateAiDraft = async () => {
    if (!aiBrief.trim()) { setError("Enter a brief description first."); return; }
    setAiLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/agent/packages/ai-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Email": session!.user!.email! },
        body: JSON.stringify({ brief: aiBrief, category }),
      });
      if (!res.ok) throw new Error("AI draft generation failed");
      const { draft } = await res.json();
      if (draft.title)               setTitle(draft.title);
      if (draft.category)            setCategory(draft.category);
      if (draft.difficulty)          setDifficulty(draft.difficulty);
      if (draft.destinations)        setDestinations(draft.destinations);
      if (draft.duration_days)       setDurationDays(draft.duration_days);
      if (draft.duration_nights)     setDurationNights(draft.duration_nights);
      if (draft.itinerary)           setItinerary(draft.itinerary);
      if (draft.highlights)          setHighlights(draft.highlights);
      if (draft.inclusions)          setInclusions(draft.inclusions);
      if (draft.exclusions)          setExclusions(draft.exclusions);
      if (draft.what_to_carry)       setWhatToCarry(draft.what_to_carry);
      if (draft.cancellation_policy) setCancellationPolicy(draft.cancellation_policy);
      if (draft.price_per_person)    setPricePer(draft.price_per_person);
      if (draft.price_couple)        setPriceCouple(draft.price_couple);
      if (draft.price_child)         setPriceChild(draft.price_child);
      if (draft.group_min)           setGroupMin(draft.group_min);
      if (draft.group_max)           setGroupMax(draft.group_max);
      if (draft.age_min != null)     setAgeMin(draft.age_min);
      if (draft.age_max != null)     setAgeMax(draft.age_max);
      setStep(2);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "AI generation failed");
    } finally { setAiLoading(false); }
  };

  const buildPayload = (status: "draft" | "published") => ({
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
    images,
    booking_phone: contactPhone,
    booking_whatsapp: contactWhatsapp,
    booking_email: contactEmail,
    status,
  });

  const handleSave = async (status: "draft" | "published") => {
    if (!title.trim()) { setError("Title is required."); return; }
    if (pricePer <= 0) { setError("Price per person is required."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/agent/packages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Email": session!.user!.email! },
        body: JSON.stringify(buildPayload(status)),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Save failed"); }
      router.push("/agent/packages");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally { setLoading(false); }
  };

  const STEPS = ["Brief", "Edit Package", "Photos & Dates", "Preview & Publish"];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">New Tour Package</h1>
        <p className="text-slate-400 text-sm mt-1">Create a package with AI assistance</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0
              ${step > i + 1 ? "bg-green-600 text-white" : step === i + 1 ? "text-white" : "bg-slate-800 text-slate-500"}`}
              style={step === i + 1 ? { background: "#1e3a8a" } : {}}>
              {step > i + 1 ? "✓" : i + 1}
            </div>
            <div className="hidden sm:block ml-2 text-xs text-slate-400 mr-2">{s}</div>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-slate-800 mx-2" />}
          </div>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 mb-4">{error}</p>}

      {/* Step 1: Brief */}
      {step === 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-5">
          <div>
            <p className={SECTION_TITLE}>🤖 Generate with AI</p>
            <p className="text-slate-400 text-sm mb-4">Describe your tour and let AI create the full package draft.</p>
            <label className={SECTION_LABEL}>Tour Brief</label>
            <textarea value={aiBrief} onChange={e => setAiBrief(e.target.value)} rows={4}
              placeholder="e.g. 5-day pilgrimage package from Calicut to Mecca covering all holy sites, including accommodation, transport, and guided ziyarat. Budget mid-range."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017] resize-none" />
          </div>
          <div>
            <label className={SECTION_LABEL}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={SELECT_CLASS}>
              {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <button onClick={generateAiDraft} disabled={aiLoading || !aiBrief.trim()}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
            style={{ background: "#d4a017", color: "#000" }}>
            {aiLoading ? "Generating draft…" : "✨ Generate Package Draft"}
          </button>
          <div className="border-t border-slate-800 pt-4">
            <p className="text-xs text-slate-500 text-center mb-3">Or fill manually</p>
            <button onClick={() => setStep(2)} className="w-full py-2.5 rounded-xl text-sm font-semibold text-slate-300 border border-slate-700 hover:border-slate-600 transition-all">
              Fill Manually →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Edit Package */}
      {step === 2 && (
        <div className="flex flex-col gap-6">
          {/* Basic Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className={SECTION_TITLE}>📋 Basic Information</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className={SECTION_LABEL}>Package Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 5-Day Mecca Pilgrimage Package" className={INPUT_CLASS} />
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
        </div>
      )}

      {/* Step 3: Photos & Dates */}
      {step === 3 && (
        <div className="flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className={SECTION_TITLE}>📅 Available Dates</p>
            <label className={SECTION_LABEL}>Departure dates (comma-separated)</label>
            <input value={availableDates} onChange={e => setAvailableDates(e.target.value)}
              placeholder="2025-12-01, 2025-12-15, 2026-01-05"
              className={INPUT_CLASS} />
            <p className="text-xs text-slate-500 mt-1">Enter YYYY-MM-DD format, separated by commas</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className={SECTION_TITLE}>📸 Photos</p>
            <ImageGrid value={images} onChange={setImages} maxImages={8} />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className={SECTION_TITLE}>📞 Booking Contact</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className={SECTION_LABEL}>Phone</label>
                <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+91 98765 43210" className={INPUT_CLASS} />
              </div>
              <div>
                <label className={SECTION_LABEL}>WhatsApp</label>
                <input value={contactWhatsapp} onChange={e => setContactWhatsapp(e.target.value)} placeholder="+91 98765 43210" className={INPUT_CLASS} />
              </div>
              <div>
                <label className={SECTION_LABEL}>Email</label>
                <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="bookings@agency.com" className={INPUT_CLASS} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Preview & Publish */}
      {step === 4 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>👀 Preview</p>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Title</span>
              <span className="text-white font-medium">{title || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Category</span>
              <span className="text-white capitalize">{category}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Destinations</span>
              <span className="text-white">{destinations.join(", ") || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Duration</span>
              <span className="text-white">{durationDays}D / {durationNights}N</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Price/Person</span>
              <span className="text-white font-semibold">₹{pricePer.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Itinerary days</span>
              <span className="text-white">{itinerary.length}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Images</span>
              <span className="text-white">{images.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Available dates</span>
              <span className="text-white">{availableDates.split(",").filter(d => d.trim()).length} date(s)</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6 gap-3">
        {step > 1 ? (
          <button onClick={() => setStep(s => s - 1)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 border border-slate-700 hover:border-slate-600 transition-all">
            ← Back
          </button>
        ) : <div />}

        <div className="flex gap-3">
          {step === 4 ? (
            <>
              <button onClick={() => handleSave("draft")} disabled={loading}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-700 text-slate-300 hover:border-slate-600 transition-all disabled:opacity-50">
                {loading ? "Saving…" : "Save Draft"}
              </button>
              <button onClick={() => handleSave("published")} disabled={loading}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: "#1e3a8a" }}>
                {loading ? "Publishing…" : "Publish →"}
              </button>
            </>
          ) : (
            <button onClick={() => { setError(""); setStep(s => s + 1); }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: "#1e3a8a" }}>
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
