"use client";

import type { HotelSearchResult, Hotel } from "@/types/places";
import MarkdownBody from "./MarkdownBody";

function toMMT(date: string) {
  const p = date.split("-");
  return p.length === 3 ? `${p[2]}${p[1]}${p[0]}` : date;
}
function googleHotelsUrl(loc: string) {
  return `https://www.google.com/travel/hotels?q=hotels+in+${encodeURIComponent(loc)}`;
}
function bookingComUrl(loc: string, checkIn: string, checkOut: string) {
  return `https://www.booking.com/search.html?ss=${encodeURIComponent(loc)}&checkin=${checkIn}&checkout=${checkOut}`;
}
function makemytripHotelUrl(loc: string, checkIn: string, checkOut: string) {
  return `https://www.makemytrip.com/hotels/hotel-listing/?topHtlCt=${encodeURIComponent(loc)}&chkIn=${toMMT(checkIn)}&chkOut=${toMMT(checkOut)}&roomStayQualifier=2e0e`;
}

type Props = {
  data: HotelSearchResult;
  analysis?: string;
  streaming?: boolean;
};

function StarRating({ n }: { n: number }) {
  const full = Math.floor(n);
  const half = n - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`text-xs ${i < full ? "text-amber-400" : half && i === full ? "text-amber-400/60" : "text-slate-700"}`}>
          ★
        </span>
      ))}
      <span className="ml-1 text-[11px] text-slate-400">{n.toFixed(1)}</span>
    </span>
  );
}

function HotelRow({ hotel }: { hotel: Hotel }) {
  const hasThumb = !!hotel.thumbnail;

  return (
    <div className="flex gap-3 p-3 rounded-xl border border-slate-700/50 bg-slate-800/40
      hover:border-[#1e3a8a]/30 hover:bg-slate-800/70 transition-all group">

      {/* Thumbnail or placeholder */}
      <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-slate-700/60 flex items-center justify-center">
        {hasThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hotel.thumbnail} alt={hotel.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl">🏨</span>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">{hotel.name}</p>
            {hotel.hotel_class && (
              <p className="text-[10px] text-slate-500">{hotel.hotel_class}</p>
            )}
          </div>
          {hotel.price && (
            <div className="shrink-0 text-right">
              <p className="text-sm font-bold text-emerald-400">{hotel.price}</p>
              <p className="text-[10px] text-slate-600">/night</p>
            </div>
          )}
        </div>

        {hotel.rating > 0 && (
          <div className="mt-1 flex items-center gap-2">
            <StarRating n={hotel.rating} />
            {hotel.reviews > 0 && (
              <span className="text-[10px] text-slate-600">
                ({hotel.reviews.toLocaleString()} reviews)
              </span>
            )}
          </div>
        )}

        {hotel.amenities.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {hotel.amenities.slice(0, 5).map((a, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full
                bg-slate-700/60 text-slate-400 border border-slate-600/40">
                {a}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Book link */}
      {hotel.link && (
        <div className="shrink-0 flex items-center">
          <a
            href={hotel.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] px-2.5 py-1.5 rounded-lg border border-[#1e3a8a]/40
              text-[#d4a017] hover:bg-[#1e3a8a]/20 hover:text-[#d4a017] transition-all"
          >
            Book →
          </a>
        </div>
      )}
    </div>
  );
}

export default function HotelResultsCard({ data, analysis, streaming }: Props) {
  const { location, check_in, check_out, hotels_found, results } = data;

  return (
    <div className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/80
      shadow-xl shadow-black/30 overflow-hidden">

      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-3
        bg-gradient-to-r from-indigo-950/40 to-slate-900/40">
        <div className="w-9 h-9 rounded-xl bg-[#1e3a8a]/20 border border-[#1e3a8a]/30
          flex items-center justify-center text-lg">
          🏨
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-200">Hotels in {location}</p>
          {check_in && check_out && (
            <p className="text-[11px] text-slate-500">{check_in} → {check_out}</p>
          )}
        </div>
        <span className="text-xs text-slate-500 shrink-0">{hotels_found} found</span>
      </div>

      {/* Hotel list */}
      <div className="p-3 space-y-2">
        {results.map((hotel, i) => (
          <HotelRow key={i} hotel={hotel} />
        ))}
        {results.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-4">No hotels found for this search.</p>
        )}
      </div>

      {/* ── Book on strip ── */}
      {results.length > 0 && (
        <div className="mx-3 mb-3 rounded-xl border border-slate-700/40 bg-slate-900/50 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-700/30">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Book on
            </span>
          </div>
          <div className="flex divide-x divide-slate-700/40">
            {[
              { name: "Google Hotels", icon: "🏨", url: googleHotelsUrl(location), color: "hover:bg-blue-900/30 hover:text-blue-300" },
              { name: "Booking.com",   icon: "🛏️",  url: bookingComUrl(location, check_in, check_out), color: "hover:bg-blue-900/20 hover:text-blue-200" },
              { name: "MakeMyTrip",   icon: "🏷️",  url: makemytripHotelUrl(location, check_in, check_out), color: "hover:bg-red-900/20 hover:text-red-300" },
            ].map(p => (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-slate-500 transition-all ${p.color}`}
              >
                <span className="text-base">{p.icon}</span>
                <span className="text-[11px] font-semibold">{p.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Claude's analysis */}
      {(analysis || streaming) && (
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/40">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Plan Advisor Recommendation
          </p>
          <div className="text-sm text-slate-300 leading-relaxed">
            <MarkdownBody text={analysis ?? ""} />
            {streaming && (
              <span className="inline-block w-0.5 h-4 bg-indigo-300 ml-1 cursor-blink rounded-sm align-middle" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
