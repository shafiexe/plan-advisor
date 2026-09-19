"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import EnquiryModal from "@/components/agent/EnquiryModal";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌐";
  return code.toUpperCase().split("").map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join("");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export default function VisaDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [visa, setVisa] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`${API}/api/explore/visa/${id}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setVisa(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-32 bg-slate-900 rounded-2xl border border-slate-800" />
      <div className="h-8 w-1/2 bg-slate-900 rounded-lg" />
    </div>
  );

  if (notFound || !visa) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">🛂</div>
      <h2 className="text-xl font-semibold text-white mb-2">Visa service not found</h2>
      <Link href="/explore/visa" className="text-sm px-4 py-2 rounded-lg text-white" style={{ background: "#1e3a8a" }}>← Back to visa services</Link>
    </div>
  );

  const agent = visa.agent || {};
  const totalCost = (visa.govt_fee_amount || 0) + (visa.agent_service_fee || 0);

  return (
    <>
      <EnquiryModal
        isOpen={enquiryOpen}
        onClose={() => setEnquiryOpen(false)}
        agentEmail={agent.email || ""}
        listingType="visa"
        listingId={visa.id}
        listingTitle={visa.title}
        agentPhone={agent.phone}
        agentWhatsapp={agent.whatsapp}
      />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
        <Link href="/explore" className="hover:text-slate-300">Explore</Link>
        <span>/</span>
        <Link href="/explore/visa" className="hover:text-slate-300">Visa</Link>
        <span>/</span>
        <span className="text-slate-400 line-clamp-1">{visa.title}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-5 mb-4">
              <span className="text-6xl">{countryFlag(visa.destination_country_code)}</span>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">{visa.title}</h1>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-900/40 text-blue-300 capitalize">{visa.visa_type}</span>
                  {visa.entry_type && <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 capitalize">{visa.entry_type} entry</span>}
                  {visa.status === "active" && <span className="text-xs px-2.5 py-1 rounded-full bg-green-900/40 text-green-400">Active</span>}
                </div>
              </div>
            </div>
            {visa.description && <p className="text-sm text-slate-400">{visa.description}</p>}
          </div>

          {/* At a glance */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">At a Glance</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {visa.validity_label && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Validity</p>
                  <p className="text-sm font-semibold text-white">{visa.validity_label}</p>
                </div>
              )}
              {visa.max_stay && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Max Stay</p>
                  <p className="text-sm font-semibold text-white">{visa.max_stay}</p>
                </div>
              )}
              {visa.entry_type && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Entry Type</p>
                  <p className="text-sm font-semibold text-white capitalize">{visa.entry_type}</p>
                </div>
              )}
              {(visa.processing_time_min || visa.processing_time_max) && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Processing Time</p>
                  <p className="text-sm font-semibold text-white">{visa.processing_time_min}–{visa.processing_time_max} days</p>
                </div>
              )}
              {visa.application_method && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Application</p>
                  <p className="text-sm font-semibold text-white capitalize">{visa.application_method}</p>
                </div>
              )}
            </div>

            {/* Eligible nationalities */}
            {visa.eligible_nationalities?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-2">Eligible Nationalities</p>
                <div className="flex flex-wrap gap-1.5">
                  {visa.eligible_nationalities.map((n: string) => (
                    <span key={n} className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{n}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Required Documents */}
          {visa.required_documents?.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Required Documents</h2>
              <ol className="space-y-2">
                {visa.required_documents.map((doc: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white" style={{ background: "#1e3a8a" }}>{i + 1}</span>
                    <span>{doc}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Photo Requirements */}
          {visa.photo_specs && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Photo Requirements</h2>
              {typeof visa.photo_specs === "string"
                ? <p className="text-sm text-slate-300">{visa.photo_specs}</p>
                : (
                  <div className="space-y-1.5 text-sm text-slate-300">
                    {Object.entries(visa.photo_specs).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="text-slate-500 capitalize">{k.replace(/_/g, " ")}:</span>
                        <span>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}

          {/* Fees */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Fee Breakdown</h2>
            <div className="space-y-2">
              {visa.govt_fee_amount != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Government Fee ({visa.govt_fee_currency || "INR"})</span>
                  <span className="text-white font-medium">₹{visa.govt_fee_amount?.toLocaleString()}</span>
                </div>
              )}
              {visa.agent_service_fee != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Service Fee</span>
                  <span className="text-white font-medium">₹{visa.agent_service_fee?.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-slate-800 pt-2 mt-2">
                <span className="font-semibold text-white">Total Estimated Cost</span>
                <span className="font-bold" style={{ color: "#d4a017" }}>₹{totalCost.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Process Steps */}
          {visa.process_steps?.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Application Process</h2>
              <ol className="space-y-4">
                {visa.process_steps.map((step: string | AnyRecord, i: number) => (
                  <li key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center text-white" style={{ background: "#1e3a8a" }}>{i + 1}</div>
                    <div className="pt-0.5">
                      {typeof step === "string"
                        ? <p className="text-sm text-slate-300">{step}</p>
                        : <>
                            {step.title && <p className="text-sm font-semibold text-white mb-0.5">{step.title}</p>}
                            {step.description && <p className="text-xs text-slate-400">{step.description}</p>}
                          </>
                      }
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Embassy Details */}
          {visa.embassy_details && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Embassy Details</h2>
              {typeof visa.embassy_details === "string"
                ? <p className="text-sm text-slate-300">{visa.embassy_details}</p>
                : (
                  <div className="space-y-1.5 text-sm text-slate-300">
                    {Object.entries(visa.embassy_details).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="text-slate-500 capitalize">{k.replace(/_/g, " ")}:</span>
                        <span>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}

          {/* Important Notes */}
          {visa.important_notes?.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-yellow-400 mb-3">⚠️ Important Notes</h2>
              <ul className="space-y-2">
                {visa.important_notes.map((note: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-yellow-200/80">
                    <span className="text-yellow-500 mt-0.5">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="lg:sticky lg:top-20 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-2xl font-bold mb-1" style={{ color: "#d4a017" }}>₹{totalCost.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mb-4">Total estimated cost</p>

              <div className="space-y-2 text-xs text-slate-400 mb-4">
                <div className="flex justify-between">
                  <span>Processing time</span>
                  <span className="text-white">{visa.processing_time_min}–{visa.processing_time_max} days</span>
                </div>
                {visa.entry_type && (
                  <div className="flex justify-between">
                    <span>Entry type</span>
                    <span className="text-white capitalize">{visa.entry_type}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setEnquiryOpen(true)}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all mb-2"
                style={{ background: "#1e3a8a" }}>
                Enquire Now
              </button>

              {(agent.whatsapp || agent.phone) && (
                <button
                  onClick={() => {
                    const number = (agent.whatsapp || agent.phone || "").replace(/\D/g, "");
                    const text = encodeURIComponent(`Hi, I need help with ${visa.title}. Please share more details.`);
                    window.open(`https://wa.me/${number}?text=${text}`, "_blank", "noopener,noreferrer");
                  }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
                  style={{ background: "#25d366" }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </button>
              )}
            </div>

            {agent.name && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Agent</h3>
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
                {agent.slug && (
                  <Link href={`/explore/agents/${agent.slug}`} className="block text-xs mt-3 transition-colors" style={{ color: "#d4a017" }}>
                    View profile →
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
