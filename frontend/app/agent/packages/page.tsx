"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Package {
  id: number;
  title: string;
  category: string;
  destinations: string[];
  duration_days: number;
  duration_nights: number;
  price_per_person: number;
  status: string;
  is_public: boolean;
  views_count: number;
  enquiries_count: number;
  updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-800 text-slate-400",
  published: "bg-green-900/40 text-green-400",
  archived: "bg-slate-800/40 text-slate-600",
};

const CATEGORY_EMOJI: Record<string, string> = {
  adventure: "🏔️", family: "👨‍👩‍👧", honeymoon: "💑", pilgrimage: "🕌",
  beach: "🏖️", cultural: "🏛️", wildlife: "🦁", budget: "💰", trekking: "🥾",
};

export default function PackagesPage() {
  const { data: session } = useSession();
  const [packages, setPackages] = useState<Package[]>([]);
  const [filter, setFilter] = useState<"all" | "draft" | "published">("all");
  const [loading, setLoading] = useState(true);

  const fetchPackages = async () => {
    if (!session?.user?.email) return;
    setLoading(true);
    try {
      const q = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`${API}/api/agent/packages${q}`, { headers: { "X-User-Email": session.user.email } });
      const data = await res.json();
      setPackages(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPackages(); }, [session, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePublic = async (pkg: Package) => {
    await fetch(`${API}/api/agent/packages/${pkg.id}/toggle`, {
      method: "PATCH", headers: { "X-User-Email": session!.user!.email! },
    });
    fetchPackages();
  };

  const deletePackage = async (pkg: Package) => {
    if (!confirm(`Delete "${pkg.title}"?`)) return;
    await fetch(`${API}/api/agent/packages/${pkg.id}`, {
      method: "DELETE", headers: { "X-User-Email": session!.user!.email! },
    });
    fetchPackages();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Tour Packages</h1>
          <p className="text-slate-400 text-sm mt-0.5">{packages.length} listings</p>
        </div>
        <Link href="/agent/packages/new"
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: "#1e3a8a" }}>
          ✨ New Package
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0 border-b border-slate-800 mb-6">
        {(["all", "draft", "published"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize transition-all border-b-2 -mb-px ${filter === f ? "border-[#d4a017] text-[#d4a017]" : "border-transparent text-slate-400 hover:text-slate-200"}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">🌍</div>
          <p className="text-slate-300 font-semibold">No packages yet</p>
          <p className="text-slate-500 text-sm mt-1">Create your first tour package with AI assistance</p>
          <Link href="/agent/packages/new" className="inline-block mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#1e3a8a" }}>✨ Create with AI</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {packages.map(pkg => (
            <div key={pkg.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4 hover:border-slate-700 transition-all">
              <div className="text-2xl">{CATEGORY_EMOJI[pkg.category] || "🌍"}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-white truncate">{pkg.title}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md flex-shrink-0 ${STATUS_COLORS[pkg.status] || "bg-slate-800 text-slate-400"}`}>{pkg.status}</span>
                </div>
                <p className="text-xs text-slate-400">{pkg.destinations?.join(" · ")} · {pkg.duration_days}D/{pkg.duration_nights}N · ₹{pkg.price_per_person?.toLocaleString()}/person</p>
                <p className="text-xs text-slate-600 mt-0.5">👁 {pkg.views_count} views · 💬 {pkg.enquiries_count} enquiries</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => togglePublic(pkg)}
                  className={`text-xs px-2 py-1 rounded-lg border transition-all ${pkg.is_public ? "border-green-700 text-green-400" : "border-slate-700 text-slate-500"}`}>
                  {pkg.is_public ? "Public" : "Private"}
                </button>
                <Link href={`/agent/packages/${pkg.id}/edit`}
                  className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all">Edit</Link>
                <button onClick={() => deletePackage(pkg)} className="text-xs px-2 py-1.5 text-red-500 hover:bg-red-900/20 rounded-lg transition-all">Del</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
