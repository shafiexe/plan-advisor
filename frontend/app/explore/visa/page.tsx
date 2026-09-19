"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const VISA_TYPES = ["All", "tourist", "visiting", "work", "student", "transit", "medical"];

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌐";
  return code.toUpperCase().split("").map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join("");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

function VisaPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [visas, setVisas] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [country, setCountry] = useState(searchParams.get("country") || "");
  const [visaType, setVisaType] = useState(searchParams.get("visa_type") || "All");

  const fetchVisas = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    if (visaType && visaType !== "All") params.set("visa_type", visaType);

    router.replace(`/explore/visa?${params.toString()}`, { scroll: false });

    fetch(`${API}/api/explore/visa?${params.toString()}`)
      .then(r => r.json())
      .then(data => setVisas(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [country, visaType, router]);

  useEffect(() => {
    fetchVisas();
  }, [fetchVisas]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Visa Services</h1>
        <p className="text-slate-400 text-sm mt-1">Find visa assistance services for your destination</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <input
            value={country}
            onChange={e => setCountry(e.target.value)}
            placeholder="Search country..."
            className="flex-1 min-w-40 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-600"
          />
          <select
            value={visaType}
            onChange={e => setVisaType(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-600"
          >
            {VISA_TYPES.map(t => <option key={t} value={t}>{t === "All" ? "All visa types" : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {!loading && <p className="text-xs text-slate-500 mb-4">{visas.length} visa service{visas.length !== 1 ? "s" : ""} found</p>}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-44 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}
        </div>
      ) : visas.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🛂</div>
          <h3 className="text-lg font-semibold text-white mb-2">No visa services found</h3>
          <p className="text-sm text-slate-400 mb-4">Try searching for a different country or visa type</p>
          <button
            onClick={() => { setCountry(""); setVisaType("All"); }}
            className="text-sm px-4 py-2 rounded-lg text-white" style={{ background: "#1e3a8a" }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visas.map(v => {
            const totalCost = (v.govt_fee_amount || 0) + (v.agent_service_fee || 0);
            return (
              <Link key={v.id} href={`/explore/visa/${v.id}`}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{countryFlag(v.destination_country_code)}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{v.destination_country}</p>
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 capitalize">{v.visa_type}</span>
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-200 mb-2 line-clamp-1">{v.title}</p>
                <div className="space-y-1 text-xs text-slate-400">
                  {v.validity_label && <p>📅 Validity: {v.validity_label}</p>}
                  {v.entry_type && <p>🔄 Entry: <span className="capitalize">{v.entry_type}</span></p>}
                  {(v.processing_time_min || v.processing_time_max) && (
                    <p>⏱ Processing: {v.processing_time_min}–{v.processing_time_max} working days</p>
                  )}
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <p className="text-sm font-bold" style={{ color: "#d4a017" }}>₹{totalCost.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">{v.agent?.name}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function VisaPage() {
  return (
    <Suspense fallback={<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}</div>}>
      <VisaPageInner />
    </Suspense>
  );
}
