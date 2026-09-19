"use client";

import type { TripTimeline, TimelineFlight } from "@/types/timeline";

function formatTime(dt: string): string {
  if (!dt) return "";
  // Handle "YYYY-MM-DD HH:MM" or ISO datetime
  try {
    const date = new Date(dt.includes("T") ? dt : dt.replace(" ", "T"));
    if (isNaN(date.getTime())) return dt;
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return dt;
  }
}

function formatShortDate(dt: string): string {
  if (!dt) return "";
  try {
    const date = new Date(dt.includes("T") ? dt : dt.replace(" ", "T"));
    if (isNaN(date.getTime())) return dt;
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  } catch {
    return dt;
  }
}

function getDateRange(data: TripTimeline): string {
  const dates: string[] = [];
  if (data.outbound_flight?.departure_datetime) dates.push(data.outbound_flight.departure_datetime);
  if (data.hotel?.check_in_date) dates.push(data.hotel.check_in_date);
  if (data.itinerary_days?.[0]?.date) dates.push(data.itinerary_days[0].date);

  const endDates: string[] = [];
  if (data.return_flight?.arrival_datetime) endDates.push(data.return_flight.arrival_datetime);
  if (data.hotel?.check_out_date) endDates.push(data.hotel.check_out_date);
  const lastDay = data.itinerary_days?.[data.itinerary_days.length - 1];
  if (lastDay?.date) endDates.push(lastDay.date);

  const start = dates[0] ? formatShortDate(dates[0]) : "";
  const end = endDates[0] ? formatShortDate(endDates[0]) : "";
  if (start && end && start !== end) return `${start} – ${end}`;
  if (start) return start;
  return "";
}

function FlightRow({ flight, label }: { flight: TimelineFlight; label: string }) {
  const depTime = formatTime(flight.departure_datetime);
  const arrTime = formatTime(flight.arrival_datetime);
  const dateLabel = formatShortDate(flight.departure_datetime);

  return (
    <div className="flex items-start gap-3">
      {/* Spine dot */}
      <div className="flex flex-col items-center shrink-0" style={{ width: 20 }}>
        <div className="w-3 h-3 rounded-full bg-[#1e40af] border-2 border-[#1e40af] mt-0.5" />
        <div className="w-px flex-1 bg-slate-700/60 mt-1" style={{ minHeight: 20 }} />
      </div>

      {/* Content */}
      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-base">✈️</span>
            <span className="text-xs font-semibold text-[#d4a017] uppercase tracking-wide">{label}</span>
          </div>
          {dateLabel && (
            <span className="text-[11px] text-slate-400 shrink-0">{dateLabel}</span>
          )}
        </div>
        <div className="mt-0.5 text-sm text-slate-200">
          <span className="font-medium">{flight.departure_airport}</span>
          <span className="text-slate-400 mx-1.5">→</span>
          <span className="font-medium">{flight.arrival_airport}</span>
        </div>
        <div className="mt-0.5 text-xs text-slate-400 flex items-center gap-2">
          {flight.airline && <span>{flight.airline}</span>}
          {flight.flight_number && <span className="text-slate-500">·</span>}
          {flight.flight_number && <span>{flight.flight_number}</span>}
          {(depTime || arrTime) && <span className="text-slate-500">·</span>}
          {depTime && arrTime && <span>{depTime} → {arrTime}</span>}
          {depTime && !arrTime && <span>{depTime}</span>}
        </div>
      </div>
    </div>
  );
}

function HotelRow({ name, location, date, isCheckout }: { name: string; location: string; date: string; isCheckout: boolean }) {
  const dateLabel = formatShortDate(date);
  return (
    <div className="flex items-start gap-3">
      {/* Spine dot */}
      <div className="flex flex-col items-center shrink-0" style={{ width: 20 }}>
        <div className="w-3 h-3 rounded-full bg-[#1e40af] border-2 border-purple-400 mt-0.5" />
        <div className="w-px flex-1 bg-slate-700/60 mt-1" style={{ minHeight: 20 }} />
      </div>

      {/* Content */}
      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-base">🏨</span>
            <span className="text-xs font-semibold text-[#d4a017] uppercase tracking-wide">
              {isCheckout ? "Check-out" : "Check-in"}
            </span>
          </div>
          {dateLabel && (
            <span className="text-[11px] text-slate-400 shrink-0">{dateLabel}</span>
          )}
        </div>
        <div className="mt-0.5 text-sm text-slate-200 font-medium">{name}</div>
        {location && <div className="text-xs text-slate-400 mt-0.5">{location}</div>}
      </div>
    </div>
  );
}

function DayRow({ day, date, theme, highlight }: { day: number; date: string; theme: string; highlight?: string }) {
  const dateLabel = formatShortDate(date);
  return (
    <div className="flex items-start gap-3">
      {/* Spine dot */}
      <div className="flex flex-col items-center shrink-0" style={{ width: 20 }}>
        <div className="w-2.5 h-2.5 rounded-full bg-slate-500 border-2 border-slate-400 mt-1" />
        <div className="w-px flex-1 bg-slate-700/60 mt-1" style={{ minHeight: 20 }} />
      </div>

      {/* Content */}
      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300">Day {day}</span>
            {theme && (
              <span className="text-xs text-slate-400">· {theme}</span>
            )}
          </div>
          {dateLabel && (
            <span className="text-[11px] text-slate-500 shrink-0">{dateLabel}</span>
          )}
        </div>
        {highlight && (
          <div className="mt-0.5 text-xs text-[#d4a017]/80 italic truncate">{highlight}</div>
        )}
      </div>
    </div>
  );
}

export default function TripTimelineCard({ data }: { data: TripTimeline }) {
  const dateRange = getDateRange(data);

  return (
    <div className="w-full rounded-2xl bg-slate-900 border border-slate-700/60 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-700/40 flex items-center gap-2">
        <span className="text-lg">🗺️</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-100">Trip Timeline</div>
          <div className="text-xs text-slate-400 mt-0.5 truncate">
            {data.destination}
            {dateRange && <span className="ml-1 text-slate-500">· {dateRange}</span>}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 pt-4 pb-0">
        {/* Outbound flight */}
        {data.outbound_flight && (
          <FlightRow flight={data.outbound_flight} label="Outbound" />
        )}

        {/* Hotel check-in */}
        {data.hotel && (
          <HotelRow
            name={data.hotel.name}
            location={data.hotel.location}
            date={data.hotel.check_in_date}
            isCheckout={false}
          />
        )}

        {/* Itinerary days */}
        {data.itinerary_days?.map((d) => (
          <DayRow
            key={d.day}
            day={d.day}
            date={d.date}
            theme={d.theme}
            highlight={d.highlight}
          />
        ))}

        {/* Hotel check-out */}
        {data.hotel && (
          <HotelRow
            name={data.hotel.name}
            location={data.hotel.location}
            date={data.hotel.check_out_date}
            isCheckout={true}
          />
        )}

        {/* Return flight */}
        {data.return_flight && (
          <FlightRow flight={data.return_flight} label="Return" />
        )}
      </div>
    </div>
  );
}
