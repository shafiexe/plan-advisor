"use client";

import { useState } from "react";
import type { GroupTripPlan, TimelineItem, TripPlace, PackingList, TrafficForecast } from "@/types/groupTrip";
import { generateWhatsAppText, generateICS, downloadICS } from "@/utils/exportUtils";
import MemberShareCard from "./MemberShareCard";

type Props = { data: GroupTripPlan };

const TYPE_DOT: Record<TimelineItem["type"], string> = {
  travel:      "bg-slate-500",
  prayer:      "bg-emerald-500",
  food:        "bg-amber-500",
  toilet:      "bg-blue-500",
  sightseeing: "bg-indigo-500",
  activity:    "bg-purple-500",
  rest:        "bg-slate-400",
  hotel:       "bg-purple-600",
};

function PlaceActivityCard({ place, adults, children }: { place: TripPlace; adults: number; children: number }) {
  const groupTotal = place.entry_fee_adult * adults + place.entry_fee_child * children;
  const emoji =
    place.name.toLowerCase().includes("garden") ? "🌺" :
    place.name.toLowerCase().includes("lake") ? "🌊" :
    place.name.toLowerCase().includes("train") ? "🚂" :
    place.name.toLowerCase().includes("museum") ? "🏛️" :
    place.name.toLowerCase().includes("fort") ? "🏰" :
    place.name.toLowerCase().includes("beach") ? "🏖️" :
    place.name.toLowerCase().includes("temple") ? "🛕" :
    place.name.toLowerCase().includes("market") ? "🛍️" :
    "🎯";

  return (
    <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <span className="font-semibold text-sm text-slate-100">{place.name}</span>
        </div>
        {place.plastic_restricted && (
          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950/60 border border-red-700/50 text-red-300">
            ⚠️ No plastic
          </span>
        )}
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">{place.notes}</p>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-0.5 rounded-full bg-indigo-900/40 border border-indigo-700/30 text-indigo-300 font-medium">
          ⏱ {place.duration_recommended}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300">
          🌅 Best: {place.best_time}
        </span>
        {place.opening_hours && (
          <span className="px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300">
            🕐 {place.opening_hours}
          </span>
        )}
        {place.real_rating != null && (
          <span className="px-2 py-0.5 rounded-full bg-amber-950/40 border border-amber-700/30 text-amber-300">
            ⭐ {place.real_rating}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs border-t border-slate-700/40 pt-2 mt-1">
        {place.entry_fee_adult > 0 && (
          <span className="text-slate-300">Adult ₹{place.entry_fee_adult}</span>
        )}
        {place.entry_fee_child > 0 && (
          <span className="text-slate-300">Child ₹{place.entry_fee_child}</span>
        )}
        {(place.entry_fee_adult === 0 && place.entry_fee_child === 0) && (
          <span className="text-emerald-400 font-medium">Free entry</span>
        )}
        {groupTotal > 0 && (
          <span className="ml-auto font-semibold text-emerald-400">
            Group total ₹{groupTotal.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}

const TRAFFIC_CONFIG: Record<TrafficForecast["traffic_level"], {
  pill: string;
  dot: string;
  label: string;
  advice_color: string;
}> = {
  light:      { pill: "bg-emerald-950/60 border-emerald-700/40 text-emerald-300", dot: "🟢", label: "Light traffic",                  advice_color: "text-emerald-400" },
  normal:     { pill: "bg-blue-950/60 border-blue-700/40 text-blue-300",          dot: "🔵", label: "Normal traffic",                 advice_color: "text-blue-400" },
  heavy:      { pill: "bg-amber-950/60 border-amber-700/40 text-amber-300",       dot: "🟡", label: "Heavy traffic — depart early",   advice_color: "text-amber-400" },
  very_heavy: { pill: "bg-red-950/60 border-red-700/40 text-red-300",             dot: "🔴", label: "Very heavy traffic — depart by 5AM", advice_color: "text-red-400" },
};

function TrafficBanner({ tf, origin, destination }: { tf: TrafficForecast; origin: string; destination: string }) {
  const cfg = TRAFFIC_CONFIG[tf.traffic_level];
  return (
    <div className="px-4 py-2.5 border-b border-slate-700/40 bg-slate-900/30 flex flex-col gap-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.pill}`}>
          {cfg.dot} {cfg.label}
        </span>
        <span className="text-xs text-slate-400">
          🚌 {origin} → {destination}: ~{tf.estimated_hours_str} (with traffic)
        </span>
      </div>
      <p className={`text-xs ${cfg.advice_color}`}>{tf.advice}</p>
    </div>
  );
}

function PackingSection({ label, icon, items }: { label: string; icon: string; items: string[] }) {
  const [open, setOpen] = useState(true);
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-700/50 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-800/60 hover:bg-slate-700/40 transition-colors"
      >
        <span className="font-medium text-sm text-slate-200">{icon} {label}</span>
        <span className="text-slate-500 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 py-3 flex flex-col gap-1.5 bg-slate-900/30">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0 mt-1.5" />
              <span className="text-sm text-slate-300">{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PACKING_SECTIONS: { key: keyof PackingList; label: string; icon: string }[] = [
  { key: "mandatory_everyone",  label: "Everyone must carry",  icon: "👤" },
  { key: "group_coordinator",   label: "Group coordinator",    icon: "🎯" },
  { key: "for_kids",            label: "For kids",             icon: "👶" },
  { key: "for_elderly",         label: "For elderly",          icon: "👴" },
  { key: "catering_team",       label: "Catering team",        icon: "🍲" },
  { key: "bus_travel",          label: "Bus travel",           icon: "🚌" },
  { key: "muslim_specific",     label: "Muslim specific",      icon: "🕌" },
  { key: "weather_specific",    label: "Weather",              icon: "🌤️" },
];

export default function GroupTripCard({ data }: Props) {
  const hasPrayer = data.prayer_schedule && data.prayer_schedule.length > 0;

  // Build tab list dynamically
  const tabs: { id: string; label: string }[] = [
    { id: "timeline",   label: "⏱️ Timeline" },
    ...(hasPrayer ? [{ id: "prayer", label: "🕌 Prayer" }] : []),
    { id: "places",     label: "📍 Places" },
    { id: "activities", label: "🎯 Activities" },
    { id: "food",       label: "🍱 Food" },
    { id: "costs",      label: "💰 Costs" },
    { id: "packing",    label: "🎒 Packing" },
    { id: "emergency",  label: "🚨 Emergency" },
  ];

  const [activeTab, setActiveTab] = useState("timeline");
  const [whatsappCopied, setWhatsappCopied] = useState(false);
  const [showMemberCards, setShowMemberCards] = useState(false);

  const adults   = (data as GroupTripPlan & { adults?: number }).adults   ?? data.group_size;
  const children = (data as GroupTripPlan & { children?: number }).children ?? 0;

  const handleWhatsApp = async () => {
    const text = generateWhatsAppText(data);
    try {
      await navigator.clipboard.writeText(text);
      setWhatsappCopied(true);
      setTimeout(() => setWhatsappCopied(false), 2500);
    } catch {
      // fallback: open WhatsApp directly
    }
    // Also try to open WhatsApp on mobile
    try {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    } catch {}
  };

  const handleCalendar = () => {
    const ics = generateICS(data);
    const slug = data.destination.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadICS(ics, `trip-${slug}-${data.travel_date}.ics`);
  };

  return (
    <>
    {showMemberCards && (
      <MemberShareCard data={data} onClose={() => setShowMemberCards(false)} />
    )}
    <div className="w-full rounded-2xl border border-slate-700/50 bg-slate-900/60 overflow-hidden text-sm">

      {/* Header */}
      <div className="px-5 py-4 bg-slate-800/60 border-b border-slate-700/40">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base text-slate-100">
                🗺️ {data.origin} → {data.destination}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950/60 border border-indigo-700/50 text-indigo-300 capitalize">
                {data.group_type.replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
              <span>📅 {data.travel_date}</span>
              <span>👥 {data.group_size} people</span>
              <span className="capitalize">🕐 {data.duration}</span>
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-900/50 border border-emerald-700/50 text-emerald-300 text-xs font-medium hover:bg-emerald-800/50 transition-colors"
              title="Copy WhatsApp-ready summary"
            >
              📲 {whatsappCopied ? "Copied!" : "WhatsApp"}
            </button>
            <button
              onClick={handleCalendar}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-900/50 border border-blue-700/50 text-blue-300 text-xs font-medium hover:bg-blue-800/50 transition-colors"
              title="Download .ics for Google Calendar / Apple Calendar"
            >
              📅 Calendar
            </button>
            <button
              onClick={() => setShowMemberCards(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 text-xs font-medium hover:bg-indigo-800/50 transition-colors"
              title="View per-member briefing cards"
            >
              👤 Member Cards
            </button>
          </div>
        </div>
        {data.summary && (
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">{data.summary}</p>
        )}
      </div>

      {/* Alerts strip — always visible */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="flex flex-col gap-1.5 px-4 py-3 border-b border-slate-700/40 bg-slate-900/40">
          {data.alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 px-3 py-2 rounded-lg border-l-4 text-xs ${
                alert.severity === "high"
                  ? "bg-red-950/50 border-red-500 text-red-200"
                  : alert.severity === "medium"
                  ? "bg-amber-950/50 border-amber-500 text-amber-200"
                  : "bg-blue-950/50 border-blue-500 text-blue-200"
              }`}
            >
              <span className="shrink-0">
                {alert.severity === "high" ? "⛔" : alert.severity === "medium" ? "⚠️" : "ℹ️"}
              </span>
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Traffic forecast banner */}
      {data.traffic_forecast && (
        <TrafficBanner tf={data.traffic_forecast} origin={data.origin} destination={data.destination} />
      )}

      {/* Tab bar */}
      <div className="flex overflow-x-auto gap-0.5 px-3 pt-3 pb-0 border-b border-slate-700/40 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-slate-800 text-indigo-300 border border-b-transparent border-slate-700/50"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">

        {/* Tab: Timeline */}
        {activeTab === "timeline" && (
          <div className="flex flex-col gap-0">
            {data.timeline.map((item, i) => (
              <div key={i} className="flex gap-3 relative">
                {/* Vertical line */}
                {i < data.timeline.length - 1 && (
                  <div className="absolute left-[7px] top-5 bottom-0 w-px bg-slate-700/50" />
                )}
                {/* Dot */}
                <div className={`w-3.5 h-3.5 rounded-full mt-1.5 shrink-0 z-10 ${TYPE_DOT[item.type] ?? "bg-slate-500"}`} />
                <div className="flex-1 pb-4">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-mono text-xs text-indigo-300">{item.time}</span>
                    <span className="font-semibold text-slate-100">{item.activity}</span>
                    {item.cost_per_person > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/60 border border-emerald-700/40 text-emerald-300">
                        ₹{item.cost_per_person}/person
                      </span>
                    )}
                  </div>
                  {item.location && (
                    <div className="text-xs text-slate-400 mt-0.5">📍 {item.location}</div>
                  )}
                  {item.notes && (
                    <div className="text-xs text-slate-500 italic mt-0.5">{item.notes}</div>
                  )}
                  {item.duration_min > 0 && (
                    <div className="text-xs text-slate-500 mt-0.5">⏱ {item.duration_min} min</div>
                  )}
                  {item.alert && (
                    <div className="mt-1.5 flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-950/50 border border-amber-700/40 text-amber-200 text-xs">
                      <span className="shrink-0">⚠️</span>
                      <span>{item.alert}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {data.timeline.length === 0 && (
              <p className="text-slate-500 text-xs text-center py-6">No timeline data available</p>
            )}
          </div>
        )}

        {/* Tab: Prayer */}
        {activeTab === "prayer" && hasPrayer && (
          <div className="flex flex-col gap-3">
            {data.prayer_schedule.map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/30">
                <div className="w-8 h-8 rounded-full bg-emerald-900/50 border border-emerald-700/40 flex items-center justify-center text-base shrink-0">
                  🕌
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-emerald-300">{p.prayer}</span>
                    <span className="font-mono text-xs text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full">{p.time}</span>
                    <span className="text-[10px] text-slate-500">⏱ {p.duration_min} min</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">📍 {p.location}</div>
                  {p.notes && <div className="text-xs text-slate-500 italic mt-0.5">{p.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Places */}
        {activeTab === "places" && (
          <div className="flex flex-col gap-3">
            {data.places.map((place, i) => (
              <div key={i} className="rounded-xl bg-slate-800/50 border border-slate-700/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-slate-100 text-sm">{place.name}</span>
                  {place.plastic_restricted && (
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950/60 border border-red-700/50 text-red-300">
                      ⚠️ No plastic
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                  {place.entry_fee_adult > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300">
                      Adult ₹{place.entry_fee_adult}
                    </span>
                  )}
                  {place.entry_fee_child > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300">
                      Child ₹{place.entry_fee_child}
                    </span>
                  )}
                  {(place.entry_fee_adult === 0 && place.entry_fee_child === 0) && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400">Free</span>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-indigo-900/40 border border-indigo-700/30 text-indigo-300 font-medium">
                    ⏱ {place.duration_recommended}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300">
                    🌅 {place.best_time}
                  </span>
                  {place.opening_hours && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300">
                      🕐 {place.opening_hours}
                    </span>
                  )}
                  {place.real_rating != null && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-950/40 border border-amber-700/30 text-amber-300">
                      ⭐ {place.real_rating}
                    </span>
                  )}
                </div>
                {place.notes && (
                  <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{place.notes}</p>
                )}
              </div>
            ))}
            {data.places.length === 0 && (
              <p className="text-slate-500 text-xs text-center py-6">No places data</p>
            )}
            {/* Toilet stops */}
            {data.toilet_stops && data.toilet_stops.length > 0 && (
              <div className="mt-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">🚻 Toilet Stops</h4>
                <div className="flex flex-col gap-2">
                  {data.toilet_stops.map((stop, i) => (
                    <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-950/20 border border-blue-800/20 text-xs">
                      <span className="font-mono text-blue-400 shrink-0">{stop.approx_time}</span>
                      <span className="text-slate-300">{stop.location}</span>
                      <span className="ml-auto text-slate-500 capitalize">{stop.type.replace(/_/g, " ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Activities (detailed with group cost) */}
        {activeTab === "activities" && (
          <div className="flex flex-col gap-3">
            {data.places.map((place, i) => (
              <PlaceActivityCard key={i} place={place} adults={adults} children={children} />
            ))}
            {data.places.length === 0 && (
              <p className="text-slate-500 text-xs text-center py-6">No activities listed</p>
            )}
            {data.places.length > 0 && (
              <p className="text-[11px] text-slate-500 italic px-1">
                ⏱ Time includes boarding buffer for {data.group_size} people
              </p>
            )}
            {/* Activities breakdown from cost_breakdown */}
            {data.cost_breakdown.activities_breakdown && data.cost_breakdown.activities_breakdown.length > 0 && (
              <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 p-3 mt-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">💰 Entry Fee Summary</h4>
                <div className="flex flex-col gap-1.5">
                  {data.cost_breakdown.activities_breakdown.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{a.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">
                          Adult ₹{a.fee_adult}{a.fee_child > 0 ? ` + Child ₹${a.fee_child}` : ""}
                        </span>
                        <span className="font-semibold text-emerald-400">₹{a.group_total.toLocaleString()} total</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Food */}
        {activeTab === "food" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-950/60 border border-amber-700/40 text-amber-300 capitalize">
                {data.food_plan.plan_type}
              </span>
            </div>

            {data.food_plan.halal_note && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-950/30 border border-emerald-700/30 text-xs text-emerald-300">
                <span>✅</span>
                <span>{data.food_plan.halal_note}</span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {data.food_plan.meals.map((meal, i) => (
                <div key={i} className="rounded-xl bg-slate-800/50 border border-slate-700/40 p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-full">{meal.time}</span>
                    <span className="font-semibold text-slate-100">{meal.meal}</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1">{meal.option}</div>
                  {meal.location && <div className="text-xs text-slate-400 mt-0.5">📍 {meal.location}</div>}
                  {meal.notes && <div className="text-xs text-slate-500 italic mt-0.5">{meal.notes}</div>}
                </div>
              ))}
            </div>

            {data.food_plan.catering_checklist && data.food_plan.catering_checklist.length > 0 && (
              <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 p-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">📦 Catering Checklist</h4>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {data.food_plan.catering_checklist.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <span className="text-emerald-400 shrink-0">✅</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Costs */}
        {activeTab === "costs" && (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl overflow-hidden border border-slate-700/40">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-800/60 text-slate-400 uppercase tracking-wide">
                    <th className="text-left px-3 py-2">Item</th>
                    <th className="text-right px-3 py-2">Per Person</th>
                    <th className="text-right px-3 py-2">Group Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Transport",     val: data.cost_breakdown.transport_per_person },
                    { label: "Entry fees",    val: data.cost_breakdown.entry_fees_per_person },
                    { label: "Food",          val: data.cost_breakdown.food_per_person },
                    { label: "Toy train",     val: data.cost_breakdown.toy_train_per_person },
                    { label: "Miscellaneous", val: data.cost_breakdown.miscellaneous_per_person },
                  ].filter(r => r.val > 0).map((row, i) => (
                    <tr key={i} className="border-t border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                      <td className="px-3 py-2 text-slate-300">{row.label}</td>
                      <td className="px-3 py-2 text-right text-slate-300">₹{row.val.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-slate-400">
                        ₹{(row.val * data.group_size).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-600 bg-slate-800/40 font-semibold">
                    <td className="px-3 py-2.5 text-slate-100">Total</td>
                    <td className="px-3 py-2.5 text-right text-emerald-300">
                      ₹{data.cost_breakdown.total_per_person.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right text-emerald-300">
                      ₹{data.cost_breakdown.total_group.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {data.cost_breakdown.activities_breakdown && data.cost_breakdown.activities_breakdown.length > 0 && (
              <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 p-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">🎯 Entry Fees Breakdown</h4>
                <div className="flex flex-col gap-1.5">
                  {data.cost_breakdown.activities_breakdown.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{a.name}</span>
                      <span className="font-semibold text-emerald-400">₹{a.group_total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.cost_breakdown.petrol_estimate && (
              <div className="text-xs text-amber-300 bg-amber-950/30 border border-amber-800/30 rounded-lg px-3 py-2">
                ⛽ {data.cost_breakdown.petrol_estimate}
              </div>
            )}

            {data.cost_breakdown.notes && (
              <p className="text-xs text-slate-400 italic">{data.cost_breakdown.notes}</p>
            )}
          </div>
        )}

        {/* Tab: Packing */}
        {activeTab === "packing" && (
          <div className="flex flex-col gap-2">
            {PACKING_SECTIONS.map(({ key, label, icon }) => {
              const items = data.packing_list[key];
              if (!items || items.length === 0) return null;
              return (
                <PackingSection
                  key={key}
                  label={label}
                  icon={icon}
                  items={items}
                />
              );
            })}
          </div>
        )}

        {/* Tab: Emergency */}
        {activeTab === "emergency" && (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl bg-slate-800/50 border border-slate-700/40 p-3 flex flex-col gap-2">
              {data.emergency_info.nearest_hospital && (
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-red-400 shrink-0">🏥</span>
                  <span className="text-slate-200">{data.emergency_info.nearest_hospital}</span>
                </div>
              )}
              {data.emergency_info.police && (
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-blue-400 shrink-0">👮</span>
                  <span className="text-slate-200">{data.emergency_info.police}</span>
                </div>
              )}
              {data.emergency_info.ambulance && (
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-red-400 shrink-0">🚑</span>
                  <span className="text-slate-200">Ambulance: {data.emergency_info.ambulance}</span>
                </div>
              )}
            </div>

            {data.emergency_info.tour_coordinator_tip && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-700/30 text-xs text-amber-200">
                <span className="shrink-0">💡</span>
                <span>{data.emergency_info.tour_coordinator_tip}</span>
              </div>
            )}

            {data.dinner_hotel_suggestion && (
              <div className="rounded-xl bg-slate-800/50 border border-slate-700/40 p-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">🍽️ Dinner Hotel on Return Route</h4>
                <div className="font-semibold text-slate-100">{data.dinner_hotel_suggestion.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">📍 {data.dinner_hotel_suggestion.location}</div>
                <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap">
                  <span className="text-slate-300">₹{data.dinner_hotel_suggestion.approx_cost_per_head}/head</span>
                  <span className="text-slate-400">{data.dinner_hotel_suggestion.cuisine}</span>
                </div>
                {data.dinner_hotel_suggestion.notes && (
                  <p className="text-xs text-slate-400 mt-1.5 italic">{data.dinner_hotel_suggestion.notes}</p>
                )}
                <div className="mt-1.5 text-xs text-amber-300">
                  📞 Call ahead for {data.group_size} pax reservation
                </div>
              </div>
            )}

            {data.group_tips && data.group_tips.length > 0 && (
              <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 p-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">💡 Group Tips</h4>
                <div className="flex flex-col gap-1.5">
                  {data.group_tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <span className="text-indigo-400 shrink-0 font-bold">{i + 1}.</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
    </>
  );
}
