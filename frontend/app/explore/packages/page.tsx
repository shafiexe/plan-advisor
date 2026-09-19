"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
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

    // Update URL
    router.replace(`/explore/packages?${params.toString()}`, { scroll: false });

    fetch(`${API}/api/explore/packages?${params.toString()}`)
      .then(r => r.json())
      .then(data => setPackages(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [destination, category, priceMax, difficulty, router]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Tour Packages</h1>
        <p className="text-slate-400 text-sm mt-1">Explore curated travel packages from verified agents</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={destination}
            onChange={e => setDestination(e.target.value)}
            placeholder="Search destination..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-600"
          />
          <input
            value={priceMax}
            onChange={e => setPriceMax(e.target.value)}
            placeholder="Max price (₹)"
            type="number"
            min="0"
            className="w-40 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-600"
          />
          <select
            value={difficulty}
            onChange={e => setDifficulty(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-600"
          >
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d === "All" ? "Any difficulty" : d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
        </div>
        {/* Category pills */}
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

      {/* Results count */}
      {!loading && (
        <p className="text-xs text-slate-500 mb-4">{packages.length} package{packages.length !== 1 ? "s" : ""} found</p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-56 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-white mb-2">No packages found</h3>
          <p className="text-sm text-slate-400 mb-4">Try adjusting your filters or search for a different destination</p>
          <button onClick={() => { setDestination(""); setCategory("All"); setPriceMax(""); setDifficulty("All"); }}
            className="text-sm px-4 py-2 rounded-lg transition-all" style={{ background: "#1e3a8a", color: "#fff" }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map(p => (
            <Link key={p.id} href={`/explore/packages/${p.slug}`}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-600 transition-all group">
              {p.images?.[0]
                ? <img src={p.images[0]} alt={p.title} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" />
                : <div className="w-full h-44 flex items-center justify-center text-5xl bg-slate-800">{CAT_EMOJI[p.category] || "🌍"}</div>
              }
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 capitalize">{p.category}</span>
                  {p.difficulty && <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 capitalize">{p.difficulty}</span>}
                </div>
                <p className="text-sm font-semibold text-white mb-1 line-clamp-2">{p.title}</p>
                <p className="text-xs text-slate-400 mb-1">{p.destinations?.join(" · ")}</p>
                <p className="text-xs text-slate-500">{p.duration_days}D / {p.duration_nights}N · Group {p.min_group_size}–{p.max_group_size}</p>
                <div className="flex items-end justify-between mt-3">
                  <div>
                    <p className="text-sm font-bold" style={{ color: "#d4a017" }}>₹{p.price_per_person?.toLocaleString()}<span className="text-xs font-normal text-slate-400">/person</span></p>
                  </div>
                  <p className="text-xs text-slate-500">{p.agent?.name}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PackagesPage() {
  return (
    <Suspense fallback={<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}</div>}>
      <PackagesPageInner />
    </Suspense>
  );
}
