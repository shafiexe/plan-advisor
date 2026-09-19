"use client";

import type { GroupSplit } from "@/types/expenseSplit";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "د.إ",
  SGD: "S$",
  AUD: "A$",
  JPY: "¥",
  THB: "฿",
  MYR: "RM",
};

function sym(currency: string) {
  return CURRENCY_SYMBOLS[currency] ?? currency + " ";
}

function fmt(amount: number, currency: string) {
  return `${sym(currency)}${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function GroupSplitCard({ data }: { data: GroupSplit }) {
  const { members, currency, total, per_person_total, expenses, balances, settlements } = data;

  // Compute how much each member paid across all expenses
  const paid: Record<string, number> = {};
  const owes: Record<string, number> = {};
  members.forEach((m) => {
    paid[m] = 0;
    owes[m] = 0;
  });
  expenses.forEach((exp) => {
    if (exp.paid_by in paid) paid[exp.paid_by] += exp.amount;
    Object.entries(exp.per_person).forEach(([m, share]) => {
      if (m in owes) owes[m] += share;
    });
  });

  return (
    <div className="w-full rounded-2xl border border-slate-700/60 bg-slate-900 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-slate-800/80 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <span className="text-xl">👥</span>
          <div>
            <p className="text-sm font-bold text-slate-100">Group Expense Split</p>
            <p className="text-xs text-slate-400">{members.length} people · {currency}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-slate-100">{fmt(total, currency)}</p>
          <p className="text-xs text-slate-400">total trip cost</p>
        </div>
      </div>

      {/* Per-person share pill */}
      <div className="px-5 pt-4 pb-0">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-900/60 border border-indigo-700/50 text-xs text-indigo-200">
          <span>💡</span>
          <span>Each person&apos;s share: <strong>{fmt(per_person_total, currency)}</strong></span>
        </div>
      </div>

      {/* Expenses table */}
      {expenses.length > 0 && (
        <div className="px-5 pt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Expenses</p>
          <div className="rounded-xl overflow-hidden border border-slate-700/50">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-800/60 text-slate-400">
                  <th className="text-left px-3 py-2 font-medium">Expense</th>
                  <th className="text-right px-3 py-2 font-medium">Amount</th>
                  <th className="text-left px-3 py-2 font-medium">Paid by</th>
                  <th className="text-right px-3 py-2 font-medium">Per person</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp, i) => {
                  const perPersonValues = Object.values(exp.per_person);
                  const avgPerPerson = perPersonValues.length > 0
                    ? perPersonValues.reduce((a, b) => a + b, 0) / perPersonValues.length
                    : 0;
                  return (
                    <tr key={i} className="border-t border-slate-700/40 hover:bg-slate-800/30 transition-colors">
                      <td className="px-3 py-2 text-slate-200">
                        <span className="mr-1.5">{exp.emoji}</span>{exp.name}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-100 font-medium">{fmt(exp.amount, currency)}</td>
                      <td className="px-3 py-2 text-slate-300">{exp.paid_by}</td>
                      <td className="px-3 py-2 text-right text-slate-400">{fmt(avgPerPerson, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Member balances */}
      <div className="px-5 pt-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Member Summary</p>
        <div className="grid gap-2">
          {members.map((member) => {
            const balance = balances[member] ?? 0;
            const isPositive = balance > 0;
            const isNeutral = Math.abs(balance) < 0.01;
            return (
              <div
                key={member}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/40"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                    {member[0]?.toUpperCase() ?? "?"}
                  </div>
                  <span className="text-sm text-slate-200 font-medium">{member}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>Paid <span className="text-slate-300">{fmt(paid[member] ?? 0, currency)}</span></span>
                  <span>Owes <span className="text-slate-300">{fmt(owes[member] ?? 0, currency)}</span></span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                      isNeutral
                        ? "text-slate-400 bg-slate-700/50"
                        : isPositive
                        ? "text-emerald-400 bg-emerald-900/40"
                        : "text-red-400 bg-red-900/40"
                    }`}
                  >
                    {isNeutral ? "Even" : isPositive ? `+${fmt(balance, currency)}` : fmt(balance, currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Settlements */}
      <div className="px-5 py-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">💸 Who pays whom</p>
        {settlements.length === 0 ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-900/30 border border-emerald-700/40 text-sm text-emerald-300">
            <span>✅</span>
            <span>All square — no payments needed!</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {settlements.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/40"
              >
                <span className="text-sm font-medium text-slate-200">{s.from}</span>
                <span className="text-amber-400 font-bold">→</span>
                <span className="text-sm font-medium text-slate-200">{s.to}</span>
                <span className="ml-auto text-sm font-bold text-amber-300">
                  pays {fmt(s.amount, currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
