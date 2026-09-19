"use client";

import type { FlightStatus } from "@/types/flightStatus";

const AIRLINE_EMOJI: Record<string, string> = {
  "Emirates":                  "🇦🇪",
  "Air India":                 "🇮🇳",
  "IndiGo":                    "🇮🇳",
  "SpiceJet":                  "🇮🇳",
  "Vistara":                   "🇮🇳",
  "Air India Express":         "🇮🇳",
  "AirAsia India":             "🇮🇳",
  "Qatar Airways":             "🇶🇦",
  "Etihad Airways":            "🇦🇪",
  "Singapore Airlines":        "🇸🇬",
  "Thai Airways":              "🇹🇭",
  "British Airways":           "🇬🇧",
  "Lufthansa":                 "🇩🇪",
  "Air France":                "🇫🇷",
  "KLM":                       "🇳🇱",
  "American Airlines":         "🇺🇸",
  "United Airlines":           "🇺🇸",
  "Delta Air Lines":           "🇺🇸",
  "Malaysia Airlines":         "🇲🇾",
  "Cathay Pacific":            "🇭🇰",
  "All Nippon Airways":        "🇯🇵",
  "Japan Airlines":            "🇯🇵",
  "Turkish Airlines":          "🇹🇷",
  "Korean Air":                "🇰🇷",
  "Asiana Airlines":           "🇰🇷",
  "China Airlines":            "🇹🇼",
  "EVA Air":                   "🇹🇼",
  "China Eastern":             "🇨🇳",
  "Air China":                 "🇨🇳",
  "China Southern":            "🇨🇳",
  "Oman Air":                  "🇴🇲",
  "Gulf Air":                  "🇧🇭",
  "flydubai":                  "🇦🇪",
  "Air Arabia":                "🇦🇪",
  "Ethiopian Airlines":        "🇪🇹",
  "Kenya Airways":             "🇰🇪",
  "SriLankan Airlines":        "🇱🇰",
};

function airlineEmoji(airline: string): string {
  return AIRLINE_EMOJI[airline] ?? "✈️";
}

type StatusBadgeProps = { status: FlightStatus["status"] };

function StatusBadge({ status }: StatusBadgeProps) {
  const cfg: Record<FlightStatus["status"], { bg: string; text: string; dot: string }> = {
    "On Time":   { bg: "bg-emerald-900/60",  text: "text-emerald-300", dot: "bg-emerald-400" },
    "Landed":    { bg: "bg-emerald-900/60",  text: "text-emerald-300", dot: "bg-emerald-400" },
    "Delayed":   { bg: "bg-amber-900/60",    text: "text-amber-300",   dot: "bg-amber-400"   },
    "Cancelled": { bg: "bg-red-900/60",      text: "text-red-300",     dot: "bg-red-400"     },
    "Unknown":   { bg: "bg-slate-700/60",    text: "text-slate-400",   dot: "bg-slate-500"   },
  };
  const c = cfg[status] ?? cfg["Unknown"];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

function TimeCell({ label, value, highlight }: { label: string; value?: string | null; highlight?: "green" | "red" | null }) {
  if (!value) return null;
  const colorClass = highlight === "green"
    ? "text-emerald-300"
    : highlight === "red"
    ? "text-red-300"
    : "text-slate-200";
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-mono font-medium ${colorClass}`}>{value}</span>
    </div>
  );
}

type Props = { data: FlightStatus };

export default function FlightStatusCard({ data }: Props) {
  const {
    flight_number, airline, origin_iata, destination_iata,
    origin_name, destination_name,
    scheduled_departure, scheduled_arrival,
    estimated_departure, estimated_arrival,
    status, delay_minutes,
    gate_departure, gate_arrival, terminal,
    aircraft_type, note,
  } = data;

  const showEstimated =
    (estimated_departure && estimated_departure !== scheduled_departure) ||
    (estimated_arrival && estimated_arrival !== scheduled_arrival);

  const depHighlight: "green" | "red" | null = estimated_departure
    ? estimated_departure === scheduled_departure ? "green" : "red"
    : null;
  const arrHighlight: "green" | "red" | null = estimated_arrival
    ? estimated_arrival === scheduled_arrival ? "green" : "red"
    : null;

  const hasRoute = !!(origin_iata || destination_iata);
  const hasDetails = !!(gate_departure || gate_arrival || terminal || aircraft_type);

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900 shadow-lg text-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-800/70 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl leading-none">{airlineEmoji(airline)}</span>
          <div>
            <p className="text-lg font-bold text-white leading-tight">{flight_number}</p>
            {airline && <p className="text-xs text-slate-400">{airline}</p>}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="px-4 py-3 flex flex-col gap-3">
        {/* Route */}
        {hasRoute && (
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <span className="text-base font-bold text-white">{origin_iata || "—"}</span>
              {origin_name && <span className="text-[10px] text-slate-500 max-w-[80px] truncate text-center">{origin_name}</span>}
            </div>
            <div className="flex-1 flex items-center gap-1 px-1">
              <div className="h-px flex-1 bg-slate-700" />
              <span className="text-slate-400 text-xs">✈</span>
              <div className="h-px flex-1 bg-slate-700" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-base font-bold text-white">{destination_iata || "—"}</span>
              {destination_name && <span className="text-[10px] text-slate-500 max-w-[80px] truncate text-center">{destination_name}</span>}
            </div>
          </div>
        )}

        {/* Times grid */}
        {(scheduled_departure || scheduled_arrival) && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-slate-800/50 border border-slate-700/40 p-3">
            <TimeCell label="Scheduled Dep." value={scheduled_departure} />
            <TimeCell label="Scheduled Arr." value={scheduled_arrival} />
            {showEstimated && (
              <>
                <TimeCell label="Estimated Dep." value={estimated_departure} highlight={depHighlight} />
                <TimeCell label="Estimated Arr." value={estimated_arrival} highlight={arrHighlight} />
              </>
            )}
          </div>
        )}

        {/* Delay pill */}
        {delay_minutes != null && delay_minutes > 0 && (
          <div className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full bg-red-900/50 border border-red-700/50 text-red-300 text-xs font-medium">
            <span>⏱</span>
            <span>{delay_minutes} min delay</span>
          </div>
        )}

        {/* Details row */}
        {hasDetails && (
          <div className="flex flex-wrap gap-4 text-xs text-slate-400 border-t border-slate-700/40 pt-2.5">
            {gate_departure && (
              <div className="flex items-center gap-1">
                <span className="text-slate-600">Gate</span>
                <span className="text-slate-200 font-medium">{gate_departure}</span>
              </div>
            )}
            {gate_arrival && (
              <div className="flex items-center gap-1">
                <span className="text-slate-600">Arr. Gate</span>
                <span className="text-slate-200 font-medium">{gate_arrival}</span>
              </div>
            )}
            {terminal && (
              <div className="flex items-center gap-1">
                <span className="text-slate-600">Terminal</span>
                <span className="text-slate-200 font-medium">{terminal}</span>
              </div>
            )}
            {aircraft_type && (
              <div className="flex items-center gap-1">
                <span className="text-slate-600">Aircraft</span>
                <span className="text-slate-200 font-medium">{aircraft_type}</span>
              </div>
            )}
          </div>
        )}

        {/* Note */}
        {note && (
          <p className="text-xs text-slate-500 italic leading-relaxed border-t border-slate-700/40 pt-2.5">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}
