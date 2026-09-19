"use client";

import { useState } from "react";
import type { GroupTripPlan } from "@/types/groupTrip";

type Props = {
  data: GroupTripPlan;
  onClose: () => void;
};

function memberText(data: GroupTripPlan, n: number): string {
  const lines: string[] = [];

  // Header
  lines.push(`MEMBER #${n} | SEAT ${n}`);
  lines.push(`${data.origin} → ${data.destination} | ${data.travel_date}`);
  lines.push("");

  // Schedule (top 5 items)
  lines.push("TODAY'S PLAN:");
  data.timeline.slice(0, 5).forEach((t) => {
    lines.push(`  ${t.time} — ${t.activity}`);
  });
  lines.push("");

  // Namaz
  if (data.prayer_schedule.length > 0) {
    lines.push("NAMAZ:");
    data.prayer_schedule.forEach((p) => {
      lines.push(`  ${p.prayer}: ${p.time} @ ${p.location}`);
    });
    lines.push("");
  }

  // Carry
  const carry = data.packing_list.mandatory_everyone?.slice(0, 6);
  if (carry?.length) {
    lines.push(`CARRY: ${carry.join(", ")}`);
    lines.push("");
  }

  // Food (lunch)
  const lunch = data.food_plan.meals.find(
    (m) => m.meal.toLowerCase().includes("lunch")
  ) ?? data.food_plan.meals[0];
  if (lunch) {
    lines.push(`FOOD: ${lunch.meal} @ ${lunch.time} — ${lunch.option}`);
    lines.push("");
  }

  // Emergency
  lines.push(`EMERGENCY: ${data.emergency_info.ambulance}`);
  lines.push(`Group leader: Seat 1`);
  lines.push("");
  lines.push(`Plan Advisor | ${data.travel_date}`);

  return lines.join("\n");
}

function SingleCard({ data, n }: { data: GroupTripPlan; n: number }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(memberText(data, n));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Copy this text:", memberText(data, n));
    }
  };

  // Key timeline events
  const keyStops = data.timeline.slice(0, 5);

  return (
    <div className="bg-white text-gray-900 rounded-xl p-4 w-72 shrink-0 flex flex-col gap-3 shadow-lg print:shadow-none">
      {/* Header banner */}
      <div className="bg-indigo-600 text-white rounded-lg px-3 py-2">
        <div className="font-bold text-sm tracking-wide">MEMBER #{n} | SEAT {n}</div>
        <div className="text-xs text-indigo-200 mt-0.5">
          {data.origin} → {data.destination}
        </div>
      </div>

      {/* Today's plan */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Today's Plan</div>
        {keyStops.map((t, i) => (
          <div key={i} className="flex gap-2 text-xs py-0.5">
            <span className="font-mono text-indigo-600 shrink-0 w-10">{t.time}</span>
            <span className="text-gray-700 truncate">{t.activity}</span>
          </div>
        ))}
      </div>

      {/* Namaz */}
      {data.prayer_schedule.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Namaz</div>
          {data.prayer_schedule.map((p, i) => (
            <div key={i} className="flex gap-2 text-xs py-0.5">
              <span className="text-emerald-600 font-medium shrink-0">{p.prayer}</span>
              <span className="font-mono text-gray-600">{p.time}</span>
            </div>
          ))}
        </div>
      )}

      {/* Carry */}
      {data.packing_list.mandatory_everyone?.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Carry</div>
          <div className="text-xs text-gray-700 leading-relaxed">
            {data.packing_list.mandatory_everyone.slice(0, 6).join(" • ")}
          </div>
        </div>
      )}

      {/* Food */}
      {data.food_plan.meals.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Food</div>
          {(() => {
            const lunch = data.food_plan.meals.find((m) =>
              m.meal.toLowerCase().includes("lunch")
            ) ?? data.food_plan.meals[0];
            return lunch ? (
              <div className="text-xs text-gray-700">
                {lunch.meal} @ {lunch.time} — {lunch.option}
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* Emergency */}
      <div className="border-t border-gray-100 pt-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Emergency</div>
        <div className="text-xs text-red-700">📞 {data.emergency_info.ambulance}</div>
        <div className="text-xs text-gray-500 mt-0.5">Group leader: Seat 1</div>
      </div>

      {/* Footer */}
      <div className="text-[10px] text-gray-400 mt-auto border-t border-gray-100 pt-1">
        Plan Advisor | {data.travel_date}
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="text-xs py-1.5 px-3 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors font-medium print:hidden"
      >
        {copied ? "Copied!" : `📲 Copy Card #${n}`}
      </button>
    </div>
  );
}

export default function MemberShareCard({ data, onClose }: Props) {
  const memberCount = data.group_size;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-slate-900 border-b border-slate-700/50 print:hidden">
        <div>
          <h2 className="text-base font-semibold text-slate-100">👤 Individual Member Cards</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Scroll → to see all {memberCount} members
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors"
          >
            🖨️ Print all
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Cards — horizontal scroll */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex gap-4 min-w-max print:flex-wrap print:min-w-0">
          {Array.from({ length: memberCount }, (_, i) => i + 1).map((n) => (
            <SingleCard key={n} data={data} n={n} />
          ))}
        </div>
      </div>
    </div>
  );
}
