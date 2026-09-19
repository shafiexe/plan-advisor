"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const CAT_EMOJI: Record<string, string> = {
  adventure: "🏔️", family: "👨‍👩‍👧", honeymoon: "💑", pilgrimage: "🕌",
  beach: "🏖️", cultural: "🏛️", wildlife: "🦁", budget: "💰", trekking: "🥾",
};
const MODE_EMOJI: Record<string, string> = { bus: "🚌", train: "🚂", flight: "✈️", boat: "⛵", cab: "🚗" };

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌐";
  return code.toUpperCase().split("").map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join("");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export default function ExplorePage() {
  const [tab, setTab] = useState<"packages" | "tickets" | "visa">("packages");
  const [packages, setPackages] = useState<AnyRecord[]>([]);
  const [tickets, setTickets] = useState<AnyRecord[]>([]);
  const [visa, setVisa] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/explore/packages?limit=6`).then(r => r.json()),
      fetch(`${API}/api/explore/tickets?limit=6`).then(r => r.json()),
      fetch(`${API}/api/explore/visa?limit=6`).then(r => r.json()),
    ]).then(([p, t, v]) => {
      setPackages(Array.isArray(p) ? p : []);
      setTickets(Array.isArray(t) ? t : []);
      setVisa(Array.isArray(v) ? v : []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero */}
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Discover <span style={{ color: "#d4a017" }}>Tours, Tickets & Visa</span>
        </h1>
        <p className="text-slate-400 text-sm mb-8">Browse verified listings from travel agents across India</p>
        <div className="flex justify-center gap-3 flex-wrap">
          {(["packages", "tickets", "visa"] as const).map(t => (
            <Link key={t} href={`/explore/${t}`}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border"
              style={tab === t ? { background: "#1e3a8a", color: "#fff", borderColor: "#1e3a8a" } : { borderColor: "#334155", color: "#94a3b8" }}
              onClick={() => setTab(t)}>
              {t === "packages" ? "🌍 Packages" : t === "tickets" ? "🎫 Tickets" : "🛂 Visa"}
            </Link>
          ))}
        </div>
      </div>

      {/* Tab content preview */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white capitalize">
          {tab === "packages" ? "Tour Packages" : tab === "tickets" ? "Available Tickets" : "Visa Services"}
        </h2>
        <Link href={`/explore/${tab}`} className="text-sm font-medium transition-colors" style={{ color: "#d4a017" }}>Browse all →</Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tab === "packages" && packages.length === 0 && (
            <div className="col-span-3 text-center py-12">
              <div className="text-4xl mb-3">🌍</div>
              <p className="text-slate-400">No packages available yet</p>
              <Link href="/explore/packages" className="text-sm mt-2 inline-block" style={{ color: "#d4a017" }}>Browse all packages →</Link>
            </div>
          )}
          {tab === "packages" && packages.map(p => (
            <Link key={p.id} href={`/explore/packages/${p.slug}`}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-600 transition-all group">
              {p.images?.[0]
                ? <img src={p.images[0]} alt={p.title} className="w-full h-36 object-cover" />
                : <div className="w-full h-36 flex items-center justify-center text-4xl bg-slate-800">{CAT_EMOJI[p.category] || "🌍"}</div>
              }
              <div className="p-4">
                <p className="text-sm font-semibold text-white mb-1 line-clamp-1">{p.title}</p>
                <p className="text-xs text-slate-400">{p.destinations?.join(" · ")} · {p.duration_days}D/{p.duration_nights}N</p>
                <p className="text-sm font-bold mt-2" style={{ color: "#d4a017" }}>₹{p.price_per_person?.toLocaleString()}<span className="text-xs font-normal text-slate-400">/person</span></p>
                <p className="text-xs text-slate-500 mt-1">{p.agent?.name}</p>
              </div>
            </Link>
          ))}

          {tab === "tickets" && tickets.length === 0 && (
            <div className="col-span-3 text-center py-12">
              <div className="text-4xl mb-3">🎫</div>
              <p className="text-slate-400">No tickets available yet</p>
            </div>
          )}
          {tab === "tickets" && tickets.map(t => (
            <Link key={t.id} href={`/explore/tickets/${t.id}`}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{MODE_EMOJI[t.mode] || "🚌"}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                  t.status === "available" ? "bg-green-900/40 text-green-400"
                  : t.status === "filling_fast" ? "bg-yellow-900/40 text-yellow-400"
                  : "bg-red-900/40 text-red-400"}`}>
                  {t.status?.replace("_", " ")}
                </span>
              </div>
              <p className="text-sm font-semibold text-white mb-1 line-clamp-1">{t.title}</p>
              <p className="text-xs text-slate-400">{t.origin} → {t.destination}</p>
              <p className="text-xs text-slate-500">{t.travel_date} · {t.available_seats} seats left</p>
              <p className="text-sm font-bold mt-2" style={{ color: "#d4a017" }}>₹{t.price_per_seat?.toLocaleString()}<span className="text-xs font-normal text-slate-400">/seat</span></p>
            </Link>
          ))}

          {tab === "visa" && visa.length === 0 && (
            <div className="col-span-3 text-center py-12">
              <div className="text-4xl mb-3">🛂</div>
              <p className="text-slate-400">No visa services available yet</p>
            </div>
          )}
          {tab === "visa" && visa.map(v => (
            <Link key={v.id} href={`/explore/visa/${v.id}`}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{countryFlag(v.destination_country_code)}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 capitalize">{v.visa_type}</span>
              </div>
              <p className="text-sm font-semibold text-white mb-1 line-clamp-1">{v.title}</p>
              <p className="text-xs text-slate-400">{v.destination_country} · {v.validity_label}</p>
              <p className="text-xs text-slate-500">{v.processing_time_min}–{v.processing_time_max} working days</p>
              <p className="text-sm font-bold mt-2" style={{ color: "#d4a017" }}>₹{((v.govt_fee_amount || 0) + (v.agent_service_fee || 0))?.toLocaleString()}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Agents CTA */}
      <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
        <h3 className="text-lg font-semibold text-white mb-2">Looking for a travel agent?</h3>
        <p className="text-sm text-slate-400 mb-4">Connect with verified agents specialising in your destination</p>
        <Link href="/explore/agents"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: "#1e3a8a" }}>
          Browse Agents →
        </Link>
      </div>
    </div>
  );
}
