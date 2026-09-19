"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import EnquiryModal from "@/components/agent/EnquiryModal";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export default function PackageDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [pkg, setPkg] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [openDays, setOpenDays] = useState<Set<number>>(new Set([0]));

  useEffect(() => {
    if (!slug) return;
    fetch(`${API}/api/explore/packages/${slug}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setPkg(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  function toggleDay(i: number) {
    setOpenDays(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-72 bg-slate-900 rounded-2xl border border-slate-800" />
      <div className="h-8 w-1/2 bg-slate-900 rounded-lg" />
      <div className="h-4 w-3/4 bg-slate-900 rounded" />
    </div>
  );

  if (notFound || !pkg) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">🔍</div>
      <h2 className="text-xl font-semibold text-white mb-2">Package not found</h2>
      <p className="text-slate-400 text-sm mb-4">This package may have been removed or the link is incorrect.</p>
      <Link href="/explore/packages" className="text-sm px-4 py-2 rounded-lg text-white" style={{ background: "#1e3a8a" }}>← Back to packages</Link>
    </div>
  );

  const images: string[] = Array.isArray(pkg.images) ? pkg.images : [];
  const agent = pkg.agent || {};
  const totalCost = (pkg.govt_fee_amount || 0) + (pkg.agent_service_fee || 0);

  return (
    <>
      <EnquiryModal
        isOpen={enquiryOpen}
        onClose={() => setEnquiryOpen(false)}
        agentEmail={agent.email || ""}
        listingType="package"
        listingId={pkg.id}
        listingTitle={pkg.title}
        agentPhone={agent.phone}
        agentWhatsapp={agent.whatsapp}
      />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
        <Link href="/explore" className="hover:text-slate-300">Explore</Link>
        <span>/</span>
        <Link href="/explore/packages" className="hover:text-slate-300">Packages</Link>
        <span>/</span>
        <span className="text-slate-400 line-clamp-1">{pkg.title}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Image Gallery */}
          {images.length > 0 && (
            <div className="mb-6">
              <div className="rounded-2xl overflow-hidden border border-slate-800 mb-2">
                <img src={images[activeImage]} alt={pkg.title} className="w-full h-72 object-cover" />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img: string, i: number) => (
                    <button key={i} onClick={() => setActiveImage(i)}
                      className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${i === activeImage ? "border-blue-500" : "border-slate-700 opacity-60 hover:opacity-100"}`}>
                      <img src={img} alt="" className="w-20 h-14 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Title & Badges */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 mb-3">
              {pkg.category && <span className="text-xs px-2.5 py-1 rounded-full bg-blue-900/40 text-blue-300 capitalize">{pkg.category}</span>}
              {pkg.difficulty && <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 capitalize">{pkg.difficulty}</span>}
              {pkg.status === "published" && <span className="text-xs px-2.5 py-1 rounded-full bg-green-900/40 text-green-400">Verified</span>}
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{pkg.title}</h1>
            <p className="text-slate-400 text-sm">{pkg.destinations?.join(" · ")} · {pkg.duration_days} days / {pkg.duration_nights} nights</p>
          </div>

          {/* Highlights */}
          {pkg.highlights?.length > 0 && (
            <section className="mb-6">
              <h2 className="text-base font-semibold text-white mb-3">Highlights</h2>
              <ul className="space-y-2">
                {pkg.highlights.map((h: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Itinerary */}
          {pkg.itinerary?.length > 0 && (
            <section className="mb-6">
              <h2 className="text-base font-semibold text-white mb-3">Day-by-Day Itinerary</h2>
              <div className="space-y-2">
                {pkg.itinerary.map((day: AnyRecord, i: number) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleDay(i)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg text-white" style={{ background: "#1e3a8a" }}>Day {day.day || i + 1}</span>
                        <span className="text-sm font-medium text-white">{day.title}</span>
                      </div>
                      <span className="text-slate-500 text-sm">{openDays.has(i) ? "▲" : "▼"}</span>
                    </button>
                    {openDays.has(i) && (
                      <div className="px-4 pb-4 border-t border-slate-800">
                        {day.description && <p className="text-sm text-slate-400 mt-3 mb-3">{day.description}</p>}
                        {day.activities?.length > 0 && (
                          <ul className="space-y-1">
                            {day.activities.map((act: string, j: number) => (
                              <li key={j} className="flex items-start gap-2 text-sm text-slate-300">
                                <span className="text-blue-400 mt-0.5">•</span>
                                <span>{act}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {day.accommodation && <p className="text-xs text-slate-500 mt-2">🏨 {day.accommodation}</p>}
                        {day.meals && <p className="text-xs text-slate-500 mt-1">🍽️ Meals: {day.meals}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Inclusions & Exclusions */}
          {(pkg.inclusions?.length > 0 || pkg.exclusions?.length > 0) && (
            <section className="mb-6">
              <h2 className="text-base font-semibold text-white mb-3">Inclusions & Exclusions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pkg.inclusions?.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-green-400 mb-3">✓ Included</h3>
                    <ul className="space-y-1.5">
                      {pkg.inclusions.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <span className="text-green-400">✓</span><span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {pkg.exclusions?.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-red-400 mb-3">✗ Excluded</h3>
                    <ul className="space-y-1.5">
                      {pkg.exclusions.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <span className="text-red-400">✗</span><span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* What to Carry */}
          {pkg.what_to_carry?.length > 0 && (
            <section className="mb-6">
              <h2 className="text-base font-semibold text-white mb-3">What to Carry</h2>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {pkg.what_to_carry.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <span className="text-yellow-400">•</span><span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Cancellation Policy */}
          {pkg.cancellation_policy && (
            <section className="mb-6">
              <h2 className="text-base font-semibold text-white mb-3">Cancellation Policy</h2>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <p className="text-sm text-slate-300 whitespace-pre-line">{pkg.cancellation_policy}</p>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="lg:sticky lg:top-20 space-y-4">
            {/* Booking Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="mb-4">
                <p className="text-2xl font-bold" style={{ color: "#d4a017" }}>
                  ₹{pkg.price_per_person?.toLocaleString()}
                  <span className="text-sm font-normal text-slate-400">/person</span>
                </p>
                {pkg.price_couple && (
                  <p className="text-sm text-slate-400">Couple: ₹{pkg.price_couple?.toLocaleString()}</p>
                )}
                {pkg.price_child && (
                  <p className="text-sm text-slate-400">Child: ₹{pkg.price_child?.toLocaleString()}</p>
                )}
              </div>

              <div className="space-y-2 mb-4 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Duration</span>
                  <span className="text-white">{pkg.duration_days}D / {pkg.duration_nights}N</span>
                </div>
                {pkg.min_group_size && (
                  <div className="flex justify-between">
                    <span>Group size</span>
                    <span className="text-white">{pkg.min_group_size}–{pkg.max_group_size} people</span>
                  </div>
                )}
              </div>

              {/* Available dates */}
              {pkg.available_dates?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-400 mb-2">Available Dates</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pkg.available_dates.map((d: string) => (
                      <span key={d} className="text-xs px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300">{d}</span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setEnquiryOpen(true)}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all mb-2"
                style={{ background: "#1e3a8a" }}
              >
                Enquire Now
              </button>

              {(agent.whatsapp || agent.phone) && (
                <button
                  onClick={() => {
                    const number = (agent.whatsapp || agent.phone || "").replace(/\D/g, "");
                    const text = encodeURIComponent(`Hi, I'm interested in ${pkg.title}. Could you please share more details?`);
                    window.open(`https://wa.me/${number}?text=${text}`, "_blank", "noopener,noreferrer");
                  }}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
                  style={{ background: "#25d366" }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </button>
              )}
            </div>

            {/* Agent Info */}
            {agent.name && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Listed by</h3>
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
                {agent.phone && <p className="text-xs text-slate-400 mt-3">📞 {agent.phone}</p>}
                {agent.slug && (
                  <Link href={`/explore/agents/${agent.slug}`}
                    className="block text-xs mt-3 transition-colors" style={{ color: "#d4a017" }}>
                    View agent profile →
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
