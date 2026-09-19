"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface VisaService {
  id: number;
  destination_country: string;
  country_code: string;
  visa_type: string;
  validity_label: string;
  max_stay_days: number;
  entry_type: string;
  processing_time_min: number;
  processing_time_max: number;
  govt_fee_amount: number;
  govt_fee_currency: string;
  agent_service_fee: number;
  status: string;
  is_public: boolean;
}

function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  const codePoints = [...code.toUpperCase()].map(c => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

const VISA_TYPE_COLORS: Record<string, string> = {
  tourist: "bg-blue-900/40 text-blue-400",
  visiting: "bg-purple-900/40 text-purple-400",
  work: "bg-amber-900/40 text-amber-400",
  student: "bg-green-900/40 text-green-400",
  transit: "bg-slate-800 text-slate-400",
  medical: "bg-red-900/40 text-red-400",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-900/40 text-green-400",
  paused: "bg-amber-900/40 text-amber-400",
};

export default function VisaPage() {
  const { data: session } = useSession();
  const [visas, setVisas] = useState<VisaService[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVisas = async () => {
    if (!session?.user?.email) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/agent/visa`, { headers: { "X-User-Email": session.user.email } });
      const data = await res.json();
      setVisas(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVisas(); }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteVisa = async (visa: VisaService) => {
    if (!confirm(`Delete visa service for ${visa.destination_country}?`)) return;
    await fetch(`${API}/api/agent/visa/${visa.id}`, {
      method: "DELETE", headers: { "X-User-Email": session!.user!.email! },
    });
    fetchVisas();
  };

  const totalFee = (visa: VisaService) => {
    const govt = visa.govt_fee_amount || 0;
    const service = visa.agent_service_fee || 0;
    return govt + service;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Visa Services</h1>
          <p className="text-slate-400 text-sm mt-0.5">{visas.length} services listed</p>
        </div>
        <Link href="/agent/visa/new"
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: "#1e3a8a" }}>
          + New Visa Service
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}
        </div>
      ) : visas.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">🛂</div>
          <p className="text-slate-300 font-semibold">No visa services yet</p>
          <p className="text-slate-500 text-sm mt-1">Add visa assistance services for your clients</p>
          <Link href="/agent/visa/new" className="inline-block mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#1e3a8a" }}>+ Add Visa Service</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visas.map(visa => (
            <div key={visa.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all">
              <div className="flex items-start gap-3">
                <div className="text-3xl flex-shrink-0">{countryCodeToFlag(visa.country_code)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-semibold text-white">{visa.destination_country}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md capitalize ${VISA_TYPE_COLORS[visa.visa_type] || "bg-slate-800 text-slate-400"}`}>
                      {visa.visa_type}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md capitalize ${STATUS_BADGE[visa.status] || "bg-slate-800 text-slate-400"}`}>
                      {visa.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-2">
                    {visa.validity_label && <span>🗓 {visa.validity_label}</span>}
                    {visa.max_stay_days && <span>⏱ Max {visa.max_stay_days} days</span>}
                    <span className="capitalize">↩ {visa.entry_type} entry</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-[#d4a017] font-semibold">
                      Total: {visa.govt_fee_currency || "AED"} {totalFee(visa).toLocaleString()}
                    </span>
                    {visa.processing_time_min != null && (
                      <span className="text-slate-400">
                        ⏳ {visa.processing_time_min}–{visa.processing_time_max} days processing
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1 flex-shrink-0">
                  <Link href={`/agent/visa/${visa.id}/edit`}
                    className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all text-center">
                    Edit
                  </Link>
                  <button onClick={() => deleteVisa(visa)} className="text-xs px-2 py-1.5 text-red-500 hover:bg-red-900/20 rounded-lg transition-all">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
