"use client";

import { useState } from "react";
import type { Itinerary, ItineraryDay, ItinerarySlot } from "@/types/itinerary";
import { useDestinationTime } from "@/hooks/useDestinationTime";

const TYPE_DOT: Record<ItinerarySlot["type"], string> = {
  sightseeing: "bg-[#1e40af]",
  food:        "bg-amber-500",
  transport:   "bg-slate-400",
  leisure:     "bg-emerald-500",
  shopping:    "bg-pink-500",
  adventure:   "bg-orange-500",
};

const PERIOD_ORDER: ItinerarySlot["period"][] = ["Morning", "Afternoon", "Evening"];

function SlotRow({ slot, isLast }: { slot: ItinerarySlot; isLast: boolean }) {
  return (
    <div className="flex gap-3 items-start">
      {/* Left: time + line */}
      <div className="flex flex-col items-center shrink-0 w-14">
        <span className="text-[10px] text-slate-500 leading-none mt-0.5">{slot.time}</span>
        {!isLast && <div className="w-px flex-1 bg-slate-700/60 mt-1" />}
      </div>

      {/* Dot */}
      <div className="relative mt-1 shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full ${TYPE_DOT[slot.type] ?? "bg-slate-500"} ring-2 ring-slate-900`} />
      </div>

      {/* Right: content */}
      <div className={`pb-4 flex-1 min-w-0 ${isLast ? "pb-0" : ""}`}>
        <p className="text-sm font-semibold text-slate-100 leading-snug">{slot.activity}</p>
        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{slot.description}</p>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700/60 text-[10px] text-slate-400">
            ⏱ {slot.duration}
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700/60 text-[10px] text-slate-400">
            📍 {slot.location}
          </span>
        </div>
        {slot.tip && (
          <p className="text-[11px] text-slate-500 italic mt-1.5">💡 {slot.tip}</p>
        )}
      </div>
    </div>
  );
}

function DayView({ day }: { day: ItineraryDay }) {
  const byPeriod: Record<string, ItinerarySlot[]> = {};
  for (const slot of day.slots) {
    (byPeriod[slot.period] ??= []).push(slot);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm font-semibold text-[#d4a017]">
        🌅 {day.theme}
      </p>
      {PERIOD_ORDER.map((period) => {
        const slots = byPeriod[period];
        if (!slots || slots.length === 0) return null;
        return (
          <div key={period}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              {period}
            </p>
            <div>
              {slots.map((slot, i) => (
                <SlotRow key={i} slot={slot} isLast={i === slots.length - 1} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function fmtDate(iso: string) {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return iso; }
}

export default function ItineraryCard({ data }: { data: Itinerary }) {
  const [activeDay, setActiveDay] = useState(0);
  const { time, offset } = useDestinationTime(data.destination);

  if (!data.days || data.days.length === 0) {
    return (
      <div className="w-full rounded-2xl bg-slate-800/80 border border-slate-700/60 p-4 text-slate-400 text-sm">
        No itinerary days available.
      </div>
    );
  }

  const currentDay = data.days[activeDay] ?? data.days[0];

  return (
    <div className="w-full rounded-2xl bg-slate-900 border border-slate-700/60 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-700/40 flex items-center gap-2">
        <span className="text-lg">🗓️</span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-100 leading-snug">
            {data.days.length}-Day Itinerary in {data.destination}
          </p>
          <p className="text-[11px] text-slate-500 leading-snug">
            {fmtDate(data.start_date)} — {fmtDate(data.end_date)}
          </p>
          {time && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
              <span className="text-slate-500">🕐</span>
              <span className="font-mono text-slate-300">{time}</span>
              <span className="text-slate-500">({offset})</span>
            </div>
          )}
        </div>
      </div>

      {/* Day tab strip */}
      <div className="flex overflow-x-auto gap-0 border-b border-slate-700/40 bg-slate-800/30">
        {data.days.map((d, i) => (
          <button
            key={d.day}
            onClick={() => setActiveDay(i)}
            className={`shrink-0 px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap border-b-2 ${
              i === activeDay
                ? "border-[#1e3a8a] text-[#d4a017] bg-[#172554]/30"
                : "border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600"
            }`}
          >
            Day {d.day}
          </button>
        ))}
      </div>

      {/* Timeline body */}
      <div className="px-4 py-4 max-h-[520px] overflow-y-auto">
        <DayView day={currentDay} />
      </div>
    </div>
  );
}
