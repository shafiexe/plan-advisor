"use client";

import type { DocumentCheck } from "@/types/documentCheck";

type Props = {
  data: DocumentCheck;
  onUpdatePassport?: () => void;
};

function borderClass(text: string): string {
  if (text.startsWith("⛔")) return "border-l-red-500";
  if (text.startsWith("⚠️")) return "border-l-amber-400";
  return "border-l-blue-400";
}

export default function DocumentCheckCard({ data, onUpdatePassport }: Props) {
  const {
    destination,
    days_until_travel,
    passport_status,
    warnings,
    checks,
    visa_reminders,
    overall_status,
  } = data;

  const isOk = overall_status === "ok";

  return (
    <div className="w-full rounded-2xl bg-slate-900 border border-slate-700/60 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60 bg-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <span className="font-semibold text-slate-100 text-sm">Travel Document Check</span>
          {destination && (
            <span className="text-slate-400 text-sm">— {destination}</span>
          )}
        </div>
        {days_until_travel >= 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-700/60 text-slate-400 font-medium">
            {days_until_travel} days to go
          </span>
        )}
      </div>

      {/* Status banner */}
      <div
        className={`px-4 py-2.5 text-sm font-semibold ${
          isOk
            ? "bg-emerald-900/30 text-emerald-300 border-b border-emerald-800/40"
            : "bg-amber-900/30 text-amber-300 border-b border-amber-800/40"
        }`}
      >
        {isOk ? "✅ Documents look good" : "⚠️ Action required before travel"}
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Passport status pill */}
        {passport_status !== "unknown" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Passport</span>
            {passport_status === "valid" && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-900/40 text-emerald-300 border border-emerald-700/40">
                ✅ Valid
              </span>
            )}
            {passport_status === "expiring_soon" && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-900/40 text-amber-300 border border-amber-700/40">
                ⚠️ Expiring soon
              </span>
            )}
            {passport_status === "expired" && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-900/40 text-red-300 border border-red-700/40">
                ⛔ Expired
              </span>
            )}
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-lg bg-slate-800/60 border-l-2 text-sm text-slate-200 ${borderClass(w)}`}
              >
                <span className="leading-relaxed">{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Checks */}
        {checks.length > 0 && (
          <div className="space-y-1.5">
            {checks.map((c, i) => (
              <div key={i} className="text-sm text-emerald-300/90">
                {c}
              </div>
            ))}
          </div>
        )}

        {/* Visa reminders */}
        {visa_reminders.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Visa reminders</p>
            {visa_reminders.map((r, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-indigo-900/20 border-l-2 border-l-indigo-500 text-sm text-slate-300"
              >
                {r}
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="pt-1">
          <button
            onClick={onUpdatePassport}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2"
          >
            Update your passport details
          </button>
        </div>
      </div>
    </div>
  );
}
