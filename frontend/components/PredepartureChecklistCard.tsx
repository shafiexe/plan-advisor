"use client";

import { useState } from "react";
import type { PredepartureChecklist, ChecklistTask } from "@/types/predepartureChecklist";

type Category = ChecklistTask["category"] | "all";

const CATEGORY_TABS: { key: Category; label: string; emoji: string }[] = [
  { key: "all",           label: "All",      emoji: "📋" },
  { key: "documents",     label: "Documents", emoji: "📄" },
  { key: "booking",       label: "Booking",   emoji: "🏨" },
  { key: "health",        label: "Health",    emoji: "💊" },
  { key: "finance",       label: "Finance",   emoji: "💰" },
  { key: "packing",       label: "Packing",   emoji: "🎒" },
  { key: "communication", label: "Comms",     emoji: "📱" },
  { key: "group",         label: "Group",     emoji: "👥" },
];

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high:     "bg-amber-400",
  medium:   "bg-blue-400",
  low:      "bg-slate-500",
};

function deadlineBadge(deadlineDate: string): { label: string; cls: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let dl: Date;
  try {
    dl = new Date(deadlineDate);
    dl.setHours(0, 0, 0, 0);
  } catch {
    return { label: deadlineDate, cls: "text-slate-500" };
  }
  const diffDays = Math.ceil((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0)  return { label: "⚠️ Overdue", cls: "text-red-400 font-semibold" };
  if (diffDays <= 3) return { label: `Due in ${diffDays}d`, cls: "text-amber-400 font-semibold" };
  if (diffDays <= 7) return { label: `Due ${dl.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`, cls: "text-yellow-400" };
  return { label: dl.toLocaleDateString("en-IN", { month: "short", day: "numeric" }), cls: "text-slate-500" };
}

export default function PredepartureChecklistCard({ data }: { data: PredepartureChecklist }) {
  const [activeTab, setActiveTab] = useState<Category>("all");
  const [doneIds, setDoneIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    data.tasks?.forEach((t) => { if (t.done) initial.add(t.id); });
    return initial;
  });

  const toggleDone = (id: string) => {
    setDoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const tasks = data.tasks ?? [];
  const filtered = activeTab === "all" ? tasks : tasks.filter((t) => t.category === activeTab);

  // Sort: critical first, then by deadline_date asc
  const sorted = [...filtered].sort((a, b) => {
    const pOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const pa = pOrder[a.priority] ?? 4;
    const pb = pOrder[b.priority] ?? 4;
    if (pa !== pb) return pa - pb;
    return (a.deadline_date ?? "").localeCompare(b.deadline_date ?? "");
  });

  const total = tasks.length;
  const doneCount = doneIds.size;
  const allDone = total > 0 && doneCount >= total;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  // Only show tabs that have tasks
  const visibleTabs = CATEGORY_TABS.filter((tab) =>
    tab.key === "all" || tasks.some((t) => t.category === tab.key)
  );

  return (
    <div className="w-full bg-slate-900 rounded-2xl border border-slate-700/60 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">✅</span>
            <div>
              <p className="font-semibold text-sm text-white">
                Pre-Departure Checklist — {data.destination}
              </p>
              {data.summary && (
                <p className="text-xs text-slate-500 italic mt-0.5">{data.summary}</p>
              )}
            </div>
          </div>
          {data.days_until_travel !== undefined && (
            <span className="text-[11px] bg-indigo-900/60 text-indigo-300 border border-indigo-700/40 rounded-full px-2.5 py-0.5 shrink-0">
              {data.days_until_travel}d to go
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">{doneCount}/{total} completed</span>
            <span className="text-xs text-slate-500">{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category tabs */}
      {visibleTabs.length > 2 && (
        <div className="flex gap-1 px-4 py-2 overflow-x-auto border-b border-slate-700/60 scrollbar-hide">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full transition-colors
                ${activeTab === tab.key
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Task list */}
      <div className="divide-y divide-slate-800">
        {sorted.map((task) => {
          const isDone = doneIds.has(task.id);
          const badge = deadlineBadge(task.deadline_date);
          return (
            <div key={task.id} className={`flex items-start gap-3 px-4 py-3 ${isDone ? "opacity-60" : ""}`}>
              {/* Checkbox */}
              <button
                onClick={() => toggleDone(task.id)}
                className={`shrink-0 w-5 h-5 mt-0.5 rounded-full border transition-colors flex items-center justify-center text-[10px]
                  ${isDone
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "border-slate-600 hover:border-indigo-400"
                  }`}
              >
                {isDone ? "✓" : ""}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  {/* Priority dot */}
                  <span className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${PRIORITY_DOT[task.priority] ?? "bg-slate-500"}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm">{task.emoji}</span>
                      <span className={`text-sm font-medium text-slate-200 ${isDone ? "line-through text-slate-500" : ""}`}>
                        {task.task}
                      </span>
                    </div>
                    {task.note && (
                      <p className="text-xs text-slate-500 italic mt-0.5">{task.note}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Deadline badge */}
              <span className={`shrink-0 text-[11px] mt-0.5 ${badge.cls}`}>{badge.label}</span>
            </div>
          );
        })}
      </div>

      {/* All done banner */}
      {allDone && (
        <div className="px-4 py-3 bg-emerald-900/40 border-t border-emerald-700/30 text-center text-sm text-emerald-300 font-semibold">
          All done! 🎉 You&apos;re ready to travel!
        </div>
      )}
    </div>
  );
}
