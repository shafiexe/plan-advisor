"use client";

import { useState } from "react";
import type { NearbyAttractions, Attraction } from "@/types/attractions";

function attractionEmoji(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("museum") || t.includes("monument") || t.includes("memorial") || t.includes("historic")) return "🏛️";
  if (t.includes("beach") || t.includes("coast") || t.includes("shore")) return "🏖️";
  if (t.includes("park") || t.includes("garden") || t.includes("nature") || t.includes("forest")) return "🌿";
  if (t.includes("temple") || t.includes("mosque") || t.includes("church") || t.includes("shrine") || t.includes("mandir") || t.includes("masjid")) return "🕌";
  if (t.includes("hill") || t.includes("peak") || t.includes("mountain") || t.includes("trek")) return "🏔️";
  return "📍";
}

function AttractionCard({ attraction }: { attraction: Attraction }) {
  const [imgError, setImgError] = useState(false);
  const showImg = !!attraction.thumbnail && !imgError;

  return (
    <div className="bg-slate-800 rounded-xl p-3 flex flex-col gap-1.5">
      {showImg ? (
        <img
          src={attraction.thumbnail}
          alt={attraction.name}
          className="object-cover h-24 w-full rounded-lg mb-1"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="h-24 w-full rounded-lg mb-1 bg-slate-700 flex items-center justify-center text-3xl">
          {attractionEmoji(attraction.type)}
        </div>
      )}

      <p className="font-semibold text-sm text-white truncate">{attraction.name}</p>

      {(attraction.rating > 0 || attraction.reviews > 0) && (
        <p className="text-xs text-slate-400">
          <span className="text-amber-400">★ {attraction.rating}</span>
          {attraction.reviews > 0 && (
            <span className="ml-1">({attraction.reviews.toLocaleString()})</span>
          )}
        </p>
      )}

      {attraction.type && (
        <span className="text-[10px] bg-slate-700 text-slate-300 rounded px-1.5 py-0.5 self-start">
          {attraction.type}
        </span>
      )}

      {attraction.address && (
        <p className="text-xs text-slate-500 truncate">{attraction.address}</p>
      )}

      {attraction.hours && (
        <p className="text-xs text-emerald-400">🕐 {attraction.hours}</p>
      )}

      {attraction.price && (
        <p className="text-xs text-amber-400">{attraction.price}</p>
      )}
    </div>
  );
}

export default function NearbyAttractionsCard({ data }: { data: NearbyAttractions }) {
  const defaultCategory = "tourist attractions";
  const showBadge = data.category && data.category !== defaultCategory;

  if (!data.attractions || data.attractions.length === 0) {
    return (
      <div className="w-full bg-slate-900 rounded-2xl p-4 border border-slate-700/60 text-center text-slate-400 text-sm">
        📍 No attractions found — try a broader search
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900 rounded-2xl border border-slate-700/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <span className="text-lg">📍</span>
          <div>
            <p className="font-semibold text-sm text-white">
              Things to Do in {data.location}
            </p>
            <p className="text-xs text-slate-500">{data.attractions_found} places found</p>
          </div>
        </div>
        {showBadge && (
          <span className="text-[11px] bg-[#1e3a8a]/60 text-[#d4a017] border border-indigo-700/40 rounded-full px-2.5 py-0.5">
            {data.category}
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.attractions.map((attraction, i) => (
          <AttractionCard key={`${attraction.name}-${i}`} attraction={attraction} />
        ))}
      </div>
    </div>
  );
}
