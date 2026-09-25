"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const CAT_EMOJI: Record<string, string> = {
  adventure: "🏔️", family: "👨‍👩‍👧", honeymoon: "💑", pilgrimage: "🕌",
  beach: "🏖️", cultural: "🏛️", wildlife: "🦁", budget: "💰", trekking: "🥾",
};

const CATEGORIES = ["All", "adventure", "family", "honeymoon", "pilgrimage", "beach", "cultural", "wildlife", "budget", "trekking"];
const DIFFICULTIES = ["All", "easy", "moderate", "challenging", "extreme"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

function autoImage(p: AnyRecord): string | null {
  if (p.images?.[0]) return p.images[0];
  const keyword = encodeURIComponent(
    (p.destinations?.[0] || p.category || "travel india")
      .replace(/\s+/g, ",")
  );
  return `https://source.unsplash.com/featured/800x500/?${keyword},travel`;
}

function PackageCard({ p }: { p: AnyRecord }) {
  const [expanded, setExpanded] = useState(false);
  const imgSrc = autoImage(p);

  const whatsappHref = p.booking_whatsapp
    ? `https://wa.me/${p.booking_whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in the package: ${p.title}`)}`
    : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all hover:border-slate-700">
      {/* Collapsed card — horizontal layout */}
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="relative sm:w-72 flex-shrink-0">
          {imgSrc ? (
            <img src={imgSrc} alt={p.title} className="w-full h-52 sm:h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <div className="w-full h-52 sm:h-full flex items-center justify-center text-6xl bg-slate-800 min-h-[13rem]">
              {CAT_EMOJI[p.category] || "🌍"}
            </div>
          )}
          <span className="absolute bottom-2 left-2 text-xs px-2 py-0.5 rounded font-mono text-white/70 bg-black/60">
            #{p.id}
          </span>
          <span className="absolute top-2 left-2 text-xs px-2 py-1 rounded-full font-semibold capitalize"
            style={{ background: "#1e3a8a", color: "#fff" }}>
            {p.category}
          </span>
        </div>

        {/* Details */}
        <div className="flex-1 p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white leading-snug mb-1 line-clamp-2">{p.title}</h2>

            {/* Difficulty badge */}
            {p.difficulty && (
              <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-700 text-slate-400 capitalize mr-2">
                {p.difficulty}
              </span>
            )}

            {/* Highlights bullets */}
            {p.highlights?.length > 0 && (
              <ul className="mt-3 space-y-1">
                {p.highlights.slice(0, 3).map((h: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="mt-0.5 text-[#d4a017] flex-shrink-0">•</span>
                    <span className="line-clamp-1">{h}</span>
                  </li>
                ))}
                {p.highlights.length > 3 && (
                  <li className="text-xs text-slate-500 pl-4">+{p.highlights.length - 3} more highlights</li>
                )}
              </ul>
            )}
          </div>

          {/* Bottom row */}
          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">
                <span className="font-medium text-slate-400">Destinations:</span>{" "}
                {p.destinations?.join(" · ") || "—"}
              </p>
              <p className="text-xs text-slate-500">
                <span className="font-medium text-slate-400">{p.duration_days} days</span>
                {p.duration_nights > 0 && ` / ${p.duration_nights} nights`}
                {p.agent?.name && <span className="ml-2 text-slate-600">· by {p.agent.name}</span>}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xl font-bold" style={{ color: "#d4a017" }}>
                  ₹{p.price_per_person?.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-500">per person</p>
              </div>
              <button
                onClick={() => setExpanded(e => !e)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: expanded ? "#172554" : "#1e3a8a" }}>
                {expanded ? "Hide Details" : "See Details"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-slate-800 p-5 grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Itinerary */}
          {p.itinerary?.length > 0 && (
            <div className="md:col-span-2">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <span style={{ color: "#d4a017" }}>📅</span> Day-by-Day Itinerary
              </h3>
              <div className="space-y-3">
                {p.itinerary.map((day: AnyRecord) => (
                  <div key={day.day} className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: "#1e3a8a" }}>
                      {day.day}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{day.title}</p>
                      {day.activities?.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {day.activities.map((a: string, i: number) => (
                            <li key={i} className="text-xs text-slate-400 flex gap-1.5">
                              <span className="text-slate-600 flex-shrink-0">—</span>{a}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inclusions */}
          {p.inclusions?.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <span className="text-green-400">✓</span> Inclusions
              </h3>
              <ul className="space-y-1">
                {p.inclusions.map((item: string, i: number) => (
                  <li key={i} className="text-xs text-slate-300 flex gap-2">
                    <span className="text-green-500 flex-shrink-0">✓</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Exclusions */}
          {p.exclusions?.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <span className="text-red-400">✗</span> Exclusions
              </h3>
              <ul className="space-y-1">
                {p.exclusions.map((item: string, i: number) => (
                  <li key={i} className="text-xs text-slate-400 flex gap-2">
                    <span className="text-red-500 flex-shrink-0">✗</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* What to carry */}
          {p.what_to_carry?.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-white mb-2">🎒 What to Carry</h3>
              <ul className="space-y-1">
                {p.what_to_carry.map((item: string, i: number) => (
                  <li key={i} className="text-xs text-slate-400 flex gap-2">
                    <span className="text-slate-600 flex-shrink-0">·</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Cancellation policy */}
          {p.cancellation_policy && (
            <div>
              <h3 className="text-sm font-bold text-white mb-2">📋 Cancellation Policy</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{p.cancellation_policy}</p>
            </div>
          )}

          {/* Agent + contact */}
          <div className="md:col-span-2 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
            {p.agent?.name && (
              <div>
                <p className="text-xs text-slate-500">Listed by</p>
                <p className="text-sm font-semibold text-white">{p.agent.name}</p>
                {p.agent.location && <p className="text-xs text-slate-400">{p.agent.location}</p>}
              </div>
            )}
            <div className="flex gap-3">
              {whatsappHref && (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: "#25d366" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </a>
              )}
              {p.booking_phone && (
                <a href={`tel:${p.booking_phone}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-700 text-white hover:border-slate-500 transition-all">
                  📞 Call
                </a>
              )}
              {p.booking_email && (
                <a href={`mailto:${p.booking_email}?subject=Enquiry: ${encodeURIComponent(p.title)}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-700 text-white hover:border-slate-500 transition-all">
                  ✉️ Email
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PackagesPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [packages, setPackages] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [destination, setDestination] = useState(searchParams.get("destination") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "All");
  const [priceMax, setPriceMax] = useState(searchParams.get("price_max") || "");
  const [difficulty, setDifficulty] = useState(searchParams.get("difficulty") || "All");

  const fetchPackages = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (destination) params.set("destination", destination);
    if (category && category !== "All") params.set("category", category);
    if (priceMax) params.set("price_max", priceMax);
    if (difficulty && difficulty !== "All") params.set("difficulty", difficulty);
    router.replace(`/explore/packages?${params.toString()}`, { scroll: false });
    fetch(`${API}/api/explore/packages?${params.toString()}`)
      .then(r => r.json())
      .then(data => setPackages(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [destination, category, priceMax, difficulty, router]);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Tour Packages</h1>
        <p className="text-slate-400 text-sm mt-1">Explore curated travel packages from verified agents</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={destination} onChange={e => setDestination(e.target.value)}
            placeholder="Search destination…"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-600" />
          <input
            value={priceMax} onChange={e => setPriceMax(e.target.value)}
            placeholder="Max price (₹)" type="number" min="0"
            className="w-40 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-600" />
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-600">
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d === "All" ? "Any difficulty" : d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all border"
              style={category === cat
                ? { background: "#1e3a8a", color: "#fff", borderColor: "#1e3a8a" }
                : { borderColor: "#334155", color: "#94a3b8" }}>
              {cat === "All" ? "All" : `${CAT_EMOJI[cat] || ""} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
            </button>
          ))}
        </div>
      </div>

      {!loading && (
        <p className="text-xs text-slate-500 mb-4">{packages.length} package{packages.length !== 1 ? "s" : ""} found</p>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-52 bg-slate-900 rounded-2xl animate-pulse border border-slate-800" />)}
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-white mb-2">No packages found</h3>
          <p className="text-sm text-slate-400 mb-4">Try adjusting your filters or search for a different destination</p>
          <button onClick={() => { setDestination(""); setCategory("All"); setPriceMax(""); setDifficulty("All"); }}
            className="text-sm px-4 py-2 rounded-xl text-white transition-all" style={{ background: "#1e3a8a" }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {packages.map(p => <PackageCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}

export default function PackagesPage() {
  return (
    <Suspense fallback={<div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-52 bg-slate-900 rounded-2xl animate-pulse border border-slate-800" />)}</div>}>
      <PackagesPageInner />
    </Suspense>
  );
}
