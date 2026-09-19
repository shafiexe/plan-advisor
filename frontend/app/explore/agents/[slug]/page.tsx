"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import EnquiryModal from "@/components/agent/EnquiryModal";

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

export default function AgentProfilePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [agent, setAgent] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<"packages" | "tickets" | "visa">("packages");
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`${API}/api/explore/agents/${slug}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setAgent(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-40 bg-slate-900 rounded-2xl border border-slate-800" />
      <div className="h-8 w-1/2 bg-slate-900 rounded-lg" />
    </div>
  );

  if (notFound || !agent) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">🧳</div>
      <h2 className="text-xl font-semibold text-white mb-2">Agent not found</h2>
      <Link href="/explore/agents" className="text-sm px-4 py-2 rounded-lg text-white" style={{ background: "#1e3a8a" }}>← Back to agents</Link>
    </div>
  );

  const packages: AnyRecord[] = Array.isArray(agent.packages) ? agent.packages : [];
  const tickets: AnyRecord[] = Array.isArray(agent.tickets) ? agent.tickets : [];
  const visas: AnyRecord[] = Array.isArray(agent.visa) ? agent.visa : [];

  const tabs = [
    { key: "packages" as const, label: "Packages", count: packages.length },
    { key: "tickets" as const, label: "Tickets", count: tickets.length },
    { key: "visa" as const, label: "Visa", count: visas.length },
  ];

  return (
    <>
      <EnquiryModal
        isOpen={enquiryOpen}
        onClose={() => setEnquiryOpen(false)}
        agentEmail={agent.email || ""}
        listingType="package"
        listingId={0}
        listingTitle={`Enquiry for ${agent.name}`}
        agentPhone={agent.phone}
        agentWhatsapp={agent.whatsapp}
      />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
        <Link href="/explore" className="hover:text-slate-300">Explore</Link>
        <span>/</span>
        <Link href="/explore/agents" className="hover:text-slate-300">Agents</Link>
        <span>/</span>
        <span className="text-slate-400">{agent.name}</span>
      </div>

      {/* Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Avatar/Logo */}
          <div className="flex-shrink-0">
            {agent.logo_url
              ? <img src={agent.logo_url} alt={agent.name} className="w-20 h-20 rounded-2xl object-cover" />
              : <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-3xl" style={{ background: "#1e3a8a" }}>{agent.name?.[0]?.toUpperCase()}</div>
            }
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-xl font-bold text-white">{agent.name}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 capitalize">{agent.agent_type || agent.type}</span>
              {agent.is_verified && <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-900/40 text-green-400">✓ Verified</span>}
            </div>

            {agent.location && <p className="text-sm text-slate-400 mb-2">📍 {agent.location}</p>}
            {agent.description && <p className="text-sm text-slate-300 mb-3 line-clamp-3">{agent.description}</p>}

            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
              {agent.experience_years && <span>🏆 {agent.experience_years} years experience</span>}
              {agent.languages?.length > 0 && <span>🗣 {agent.languages.join(", ")}</span>}
              {agent.website && (
                <a href={agent.website} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" style={{ color: "#d4a017" }}>
                  🌐 Website →
                </a>
              )}
            </div>

            {/* Specializations */}
            {agent.specializations?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {agent.specializations.map((s: string) => (
                  <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-blue-900/30 text-blue-300 capitalize">{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="flex-shrink-0 flex flex-col gap-2 min-w-36">
            <button
              onClick={() => setEnquiryOpen(true)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all text-center"
              style={{ background: "#1e3a8a" }}>
              Send Enquiry
            </button>
            {(agent.whatsapp || agent.phone) && (
              <button
                onClick={() => {
                  const number = (agent.whatsapp || agent.phone || "").replace(/\D/g, "");
                  const text = encodeURIComponent(`Hi ${agent.name}, I'd like to inquire about your travel services.`);
                  window.open(`https://wa.me/${number}?text=${text}`, "_blank", "noopener,noreferrer");
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
                style={{ background: "#25d366" }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </button>
            )}
            {agent.phone && (
              <a href={`tel:${agent.phone}`}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 transition-all text-center">
                📞 Call
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 mb-5 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === t.key ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}`}>
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === t.key ? "bg-slate-700 text-slate-300" : "bg-slate-800 text-slate-500"}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "packages" && (
        packages.length === 0
          ? <EmptyState emoji="🌍" message="No packages listed yet" />
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map(p => (
                <Link key={p.id} href={`/explore/packages/${p.slug}`}
                  className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-600 transition-all">
                  {p.images?.[0]
                    ? <img src={p.images[0]} alt={p.title} className="w-full h-36 object-cover" />
                    : <div className="w-full h-36 flex items-center justify-center text-4xl bg-slate-800">{CAT_EMOJI[p.category] || "🌍"}</div>
                  }
                  <div className="p-4">
                    <p className="text-sm font-semibold text-white mb-1 line-clamp-1">{p.title}</p>
                    <p className="text-xs text-slate-400">{p.destinations?.join(" · ")} · {p.duration_days}D/{p.duration_nights}N</p>
                    <p className="text-sm font-bold mt-2" style={{ color: "#d4a017" }}>₹{p.price_per_person?.toLocaleString()}<span className="text-xs font-normal text-slate-400">/person</span></p>
                  </div>
                </Link>
              ))}
            </div>
      )}

      {activeTab === "tickets" && (
        tickets.length === 0
          ? <EmptyState emoji="🎫" message="No tickets listed yet" />
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tickets.map(t => (
                <Link key={t.id} href={`/explore/tickets/${t.id}`}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{MODE_EMOJI[t.mode] || "🚌"}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${t.status === "available" ? "bg-green-900/40 text-green-400" : "bg-slate-800 text-slate-400"}`}>{t.status?.replace("_", " ")}</span>
                  </div>
                  <p className="text-sm font-semibold text-white mb-1 line-clamp-1">{t.title}</p>
                  <p className="text-xs text-slate-400">{t.origin} → {t.destination}</p>
                  <p className="text-xs text-slate-500">{t.travel_date}</p>
                  <p className="text-sm font-bold mt-2" style={{ color: "#d4a017" }}>₹{t.price_per_seat?.toLocaleString()}<span className="text-xs font-normal text-slate-400">/seat</span></p>
                </Link>
              ))}
            </div>
      )}

      {activeTab === "visa" && (
        visas.length === 0
          ? <EmptyState emoji="🛂" message="No visa services listed yet" />
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visas.map(v => (
                <Link key={v.id} href={`/explore/visa/${v.id}`}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{countryFlag(v.destination_country_code)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 capitalize">{v.visa_type}</span>
                  </div>
                  <p className="text-sm font-semibold text-white mb-1 line-clamp-1">{v.title}</p>
                  <p className="text-xs text-slate-400">{v.destination_country}</p>
                  <p className="text-sm font-bold mt-2" style={{ color: "#d4a017" }}>₹{((v.govt_fee_amount || 0) + (v.agent_service_fee || 0)).toLocaleString()}</p>
                </Link>
              ))}
            </div>
      )}
    </>
  );
}

function EmptyState({ emoji, message }: { emoji: string; message: string }) {
  return (
    <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
      <div className="text-4xl mb-3">{emoji}</div>
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  );
}
