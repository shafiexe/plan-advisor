"use client";

import { useState } from "react";
import type { PackingList, PackingItem } from "@/types/packingList";

const CATEGORY_EMOJI: Record<string, string> = {
  "Clothing": "👕",
  "Electronics": "🔌",
  "Toiletries": "🪥",
  "Documents": "📄",
  "Medicines": "💊",
  "Medications": "💊",
  "Accessories": "💍",
  "Food & Snacks": "🍱",
  "Others": "🎒",
};

function normStr(s: string) {
  return s.toLowerCase().trim();
}

function ItemRow({
  item,
  checked,
  onToggle,
  isYours,
}: {
  item: PackingItem;
  checked: boolean;
  onToggle: () => void;
  isYours?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 py-2 cursor-pointer group select-none">
      <div className="mt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="sr-only"
        />
        <div
          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
            checked
              ? "bg-indigo-600 border-indigo-500"
              : "bg-slate-800 border-slate-600 group-hover:border-indigo-400"
          }`}
        >
          {checked && (
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
              <path
                d="M1.5 5l2.5 2.5L8.5 2"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>

      <div className={`flex-1 min-w-0 transition-opacity ${checked ? "opacity-40" : "opacity-100"}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm transition-colors ${
              checked
                ? "line-through text-slate-500"
                : item.essential
                ? "text-slate-100 font-medium"
                : "text-slate-400"
            }`}
          >
            {item.item}
          </span>
          {isYours && !checked && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-900/40 border border-amber-600/40 text-amber-400">
              ⭐ Yours
            </span>
          )}
          {!item.essential && !isYours && !checked && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/60 border border-slate-600/60 text-slate-500">
              optional
            </span>
          )}
        </div>
        {item.note && (
          <p className="text-[11px] text-slate-500 italic mt-0.5 leading-snug">{item.note}</p>
        )}
      </div>
    </label>
  );
}

export default function PackingListCard({
  data,
  userEssentials,
}: {
  data: PackingList;
  userEssentials?: string[];
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  if (!data.categories || data.categories.length === 0) {
    return (
      <div className="w-full rounded-2xl bg-slate-800/80 border border-slate-700/60 p-4 text-slate-400 text-sm">
        No packing list available.
      </div>
    );
  }

  const essentialsSet = new Set((userEssentials ?? []).map(normStr));

  const totalItems = data.categories.reduce((sum, cat) => sum + cat.items.length, 0);
  const checkedCount = checked.size;
  const progressPct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  const toggleItem = (catIdx: number, itemIdx: number) => {
    const key = `${catIdx}:${itemIdx}`;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const packAll = () => {
    const all = new Set<string>();
    data.categories.forEach((cat, ci) =>
      cat.items.forEach((_, ii) => all.add(`${ci}:${ii}`))
    );
    setChecked(all);
  };

  const resetAll = () => setChecked(new Set());

  const activeCategory = data.categories[activeTab] ?? data.categories[0];
  const catEmoji = (cat: { emoji?: string; name?: string }) =>
    cat.emoji || CATEGORY_EMOJI[cat.name ?? ""] || "🎒";

  return (
    <div className="w-full rounded-2xl bg-slate-900 border border-slate-700/60 overflow-hidden shadow-lg">
      {/* Progress bar */}
      <div className="h-1 bg-slate-800">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Header */}
      <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-700/40 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">🎒</span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-100 leading-snug truncate">
              Packing List for {data.destination}
            </p>
            <p className="text-[11px] text-slate-500 leading-snug capitalize">
              {data.duration_days}-day {data.trip_type} trip
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {checkedCount}/{totalItems} packed
          </span>
          {checkedCount < totalItems ? (
            <button
              onClick={packAll}
              className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-700/40 border border-indigo-600/40 text-indigo-300 hover:bg-indigo-700/60 transition-colors"
            >
              Pack all
            </button>
          ) : (
            <button
              onClick={resetAll}
              className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700/60 border border-slate-600/40 text-slate-400 hover:text-slate-200 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Category tab strip */}
      <div className="flex overflow-x-auto border-b border-slate-700/40 bg-slate-800/30">
        {data.categories.map((cat, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`shrink-0 px-3 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap border-b-2 ${
              i === activeTab
                ? "border-indigo-500 text-indigo-300 bg-indigo-950/30"
                : "border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600"
            }`}
          >
            {catEmoji(cat)} {cat.name}
          </button>
        ))}
      </div>

      {/* Items list */}
      <div className="px-4 py-2 max-h-[360px] overflow-y-auto divide-y divide-slate-800/60">
        {activeCategory.items.map((item, itemIdx) => {
          const key = `${activeTab}:${itemIdx}`;
          const isYours = essentialsSet.size > 0 && essentialsSet.has(normStr(item.item));
          return (
            <ItemRow
              key={key}
              item={item}
              checked={checked.has(key)}
              onToggle={() => toggleItem(activeTab, itemIdx)}
              isYours={isYours}
            />
          );
        })}
      </div>

      {/* Tips */}
      {data.tips && data.tips.length > 0 && (
        <div className="px-4 py-3 bg-slate-800/40 border-t border-slate-700/40">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
            💡 Pro tips
          </p>
          <ul className="space-y-1">
            {data.tips.map((tip, i) => (
              <li key={i} className="text-xs text-slate-400 flex gap-1.5">
                <span className="text-indigo-400 shrink-0">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
