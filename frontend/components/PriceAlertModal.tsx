"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Props = {
  origin?: string;
  destination?: string;
  departureDate?: string;
  currentPrice?: number;
  userEmail: string | null;
  onClose: () => void;
  onSuccess?: () => void;
};

function roundToNearest500(n: number): number {
  return Math.round(n / 500) * 500;
}

export default function PriceAlertModal({
  origin: initialOrigin = "",
  destination: initialDestination = "",
  departureDate: initialDate = "",
  currentPrice,
  userEmail,
  onClose,
  onSuccess,
}: Props) {
  const [origin, setOrigin]               = useState(initialOrigin.toUpperCase());
  const [destination, setDestination]     = useState(initialDestination.toUpperCase());
  const [departureDate, setDepartureDate] = useState(initialDate);
  const [threshold, setThreshold]         = useState<string>(
    currentPrice ? String(roundToNearest500(currentPrice * 0.9)) : ""
  );
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [success, setSuccess]             = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.trim() || !destination.trim() || !departureDate || !threshold) {
      setError("Please fill in all fields.");
      return;
    }
    const thresholdNum = parseInt(threshold, 10);
    if (isNaN(thresholdNum) || thresholdNum <= 0) {
      setError("Enter a valid target price.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const resp = await fetch(`${API}/api/alerts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userEmail ? { "X-User-Email": userEmail } : {}),
        },
        body: JSON.stringify({
          origin: origin.trim().toUpperCase(),
          destination: destination.trim().toUpperCase(),
          departure_date: departureDate,
          threshold_inr: thresholdNum,
        }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.detail ?? `Failed (${resp.status})`);
      }

      setSuccess(
        `Alert set! We'll email you when prices drop below ₹${thresholdNum.toLocaleString("en-IN")}.`
      );
      onSuccess?.();
      setTimeout(onClose, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700/60 shadow-2xl shadow-black/60 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-base shadow">
              🔔
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">Set Price Alert</p>
              <p className="text-[11px] text-slate-500">Get emailed when prices drop</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-xl"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">

          {/* Success state */}
          {success && (
            <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
              <span className="text-emerald-400 text-base shrink-0">✓</span>
              <p className="text-xs font-semibold text-emerald-300 leading-snug">{success}</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-red-950/40 border border-red-500/40">
              <span className="text-red-400 shrink-0">⚠</span>
              <p className="text-xs font-semibold text-red-300">{error}</p>
            </div>
          )}

          {/* Reference price */}
          {currentPrice && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
              <span className="text-[11px] text-slate-500">Current price</span>
              <span className="ml-auto text-sm font-bold text-slate-200 tabular-nums">
                ₹{currentPrice.toLocaleString("en-IN")}
              </span>
            </div>
          )}

          {/* Route fields */}
          <div className="flex gap-3">
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Origin <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={origin}
                onChange={e => setOrigin(e.target.value.toUpperCase())}
                maxLength={3}
                placeholder="BLR"
                className="w-full rounded-lg px-3 py-2.5 text-sm bg-slate-800/80 border border-slate-700/60
                  text-slate-100 placeholder-slate-600 outline-none font-mono uppercase
                  focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all
                  hover:border-slate-600"
              />
            </div>
            <div className="flex items-end pb-2.5 text-slate-600 text-lg shrink-0">→</div>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Destination <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={destination}
                onChange={e => setDestination(e.target.value.toUpperCase())}
                maxLength={3}
                placeholder="DXB"
                className="w-full rounded-lg px-3 py-2.5 text-sm bg-slate-800/80 border border-slate-700/60
                  text-slate-100 placeholder-slate-600 outline-none font-mono uppercase
                  focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all
                  hover:border-slate-600"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Departure Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={departureDate}
              onChange={e => setDepartureDate(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm bg-slate-800/80 border border-slate-700/60
                text-slate-100 outline-none
                focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all
                hover:border-slate-600"
            />
          </div>

          {/* Target price */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Alert me when price drops below ₹ <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm select-none">₹</span>
              <input
                type="number"
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                min={1}
                step={1}
                placeholder="e.g. 8000"
                className="w-full rounded-lg pl-7 pr-3 py-2.5 text-sm bg-slate-800/80 border border-slate-700/60
                  text-slate-100 placeholder-slate-600 outline-none tabular-nums
                  focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all
                  hover:border-slate-600"
              />
            </div>
            {currentPrice && (
              <p className="text-[10px] text-slate-600 mt-1">
                Pre-filled at 10% below current price · adjust as needed
              </p>
            )}
          </div>

          {!userEmail && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40">
              <span className="text-amber-400 shrink-0">⚠</span>
              <p className="text-[11px] text-amber-300">Sign in to receive email alerts.</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold
                hover:border-slate-600 hover:text-white transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !!success}
              className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold
                shadow-lg shadow-indigo-900/40 transition-all active:scale-95 disabled:opacity-40
                flex items-center justify-center gap-1.5"
            >
              {submitting
                ? <><span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Setting…</>
                : "Set Alert"
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
