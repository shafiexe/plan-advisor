import type { Message } from "@/components/MessageBubble";
import type { GroupTripPlan } from "@/types/groupTrip";
import type { FlightSearchResult } from "@/types/flights";
import type { HotelSearchResult } from "@/types/places";
import type { WeatherResult } from "@/types/weather";

/* ── Markdown stripper ─────────────────────────────────────── */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")           // bold
    .replace(/\*(.+?)\*/g, "$1")                // italic
    .replace(/#{1,6}\s+/g, "")                 // headings
    .replace(/^[-*]\s+/gm, "• ")               // bullets
    .replace(/`{1,3}[^`]*`{1,3}/g, "")         // code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")   // links
    .replace(/\n{3,}/g, "\n\n")                // excess blank lines
    .trim();
}

/* ── Card summarizers ──────────────────────────────────────── */
function summariseFlight(m: Message): string {
  const d = m.flightData;
  if (!d || d.results.length === 0) return "";
  const lines = [`✈️ FLIGHTS — ${d.origin} → ${d.destination}`];
  d.results.slice(0, 5).forEach((f) => {
    const seg = f.segments?.[0];
    const route = seg ? `${seg.from} → ${seg.to}` : `${d.origin} → ${d.destination}`;
    lines.push(`  ${f.airline}  ${route}  ${f.price}  ${f.total_duration}`);
  });
  return lines.join("\n");
}

function summariseRoundTrip(m: Message): string {
  const d = m.roundTripData;
  if (!d) return "";
  const parts: string[] = [];
  if (d.outbound?.results.length) {
    parts.push(`✈️ OUTBOUND — ${d.outbound.origin} → ${d.outbound.destination}`);
    d.outbound.results.slice(0, 3).forEach((f) =>
      parts.push(`  ${f.airline}  ${f.price}  ${f.total_duration}`)
    );
  }
  if (d.return_flight?.results.length) {
    parts.push(`✈️ RETURN — ${d.return_flight.origin} → ${d.return_flight.destination}`);
    d.return_flight.results.slice(0, 3).forEach((f) =>
      parts.push(`  ${f.airline}  ${f.price}  ${f.total_duration}`)
    );
  }
  return parts.join("\n");
}

function summariseHotel(m: Message): string {
  const d = m.hotelData;
  if (!d || d.results.length === 0) return "";
  const lines = [`🏨 HOTELS — ${d.location}  (${d.check_in} → ${d.check_out})`];
  d.results.slice(0, 5).forEach((h) =>
    lines.push(`  ${h.name}  ★${h.rating}  ${h.price}/night`)
  );
  return lines.join("\n");
}

function summariseWeather(m: Message): string {
  const d = m.weatherData;
  if (!d || d.error) return "";
  const lines = [
    `🌤️ WEATHER — ${d.location}`,
    `  Now: ${d.temp_c}°C — ${d.description}  Feels like ${d.feels_like_c}°C  Humidity ${d.humidity}%`,
  ];
  d.forecast.slice(0, 3).forEach((day) =>
    lines.push(`  ${day.date}: ${day.description}  ${day.max_temp_c}°C / ${day.min_temp_c}°C`)
  );
  return lines.join("\n");
}

function summariseForecast(m: Message): string {
  const d = m.forecastData;
  if (!d || d.error) return "";
  const lines = [`🌤️ WEATHER FORECAST — ${d.destination}`];
  if (d.overall_summary) lines.push(`  ${d.overall_summary}`);
  d.days.slice(0, 5).forEach((day) =>
    lines.push(`  ${day.date}: ${day.emoji} ${day.condition}  ${day.temp_high}°C / ${day.temp_low}°C`)
  );
  return lines.join("\n");
}

function summarisePacking(m: Message): string {
  const d = m.packingData;
  if (!d || d.error) return "";
  const lines = [`🎒 PACKING LIST — ${d.destination} (${d.trip_type})`];
  d.categories.forEach((cat) => {
    const items = cat.items.map((i) => i.item).join(", ");
    lines.push(`  ${cat.emoji} ${cat.name}: ${items}`);
  });
  return lines.join("\n");
}

function summariseDocumentCheck(m: Message): string {
  const d = m.documentCheckData;
  if (!d) return "";
  const lines = [
    `📋 DOCUMENT CHECK — ${d.destination}`,
    `  Status: ${d.overall_status.toUpperCase()}`,
    `  Passport: ${d.passport_status}${d.passport_days_left != null ? ` (${d.passport_days_left} days left)` : ""}`,
  ];
  d.warnings.forEach((w) => lines.push(`  ⚠️ ${w}`));
  d.visa_reminders.forEach((v) => lines.push(`  📌 ${v}`));
  return lines.join("\n");
}

function summariseGroupTrip(m: Message): string {
  const d = m.groupTripData;
  if (!d) return "";
  const lines = [
    `🗺️ GROUP TRIP — ${d.origin} → ${d.destination}`,
    `  Date: ${d.travel_date}  |  Group: ${d.group_size} people  |  ${d.duration}`,
  ];
  if (d.timeline.length) {
    lines.push("  SCHEDULE:");
    d.timeline.slice(0, 6).forEach((t) => lines.push(`    ${t.time} ${t.activity}`));
  }
  if (d.prayer_schedule.length) {
    lines.push("  PRAYER:");
    d.prayer_schedule.forEach((p) => lines.push(`    ${p.prayer}: ${p.time} @ ${p.location}`));
  }
  lines.push(`  COST PER PERSON: ₹${d.cost_breakdown.total_per_person.toLocaleString()}`);
  return lines.join("\n");
}

function summariseBudget(m: Message): string {
  const d = m.budgetData;
  if (!d) return "";
  const lines = [`💰 TRIP BUDGET — ${(d as { destination?: string }).destination ?? "Trip"}`];
  if ((d as { total_estimated?: string | number }).total_estimated) {
    lines.push(`  Total estimate: ${(d as { total_estimated?: string | number }).total_estimated}`);
  }
  return lines.join("\n");
}

/* ── Main export function ──────────────────────────────────── */
export function exportCleanText(messages: Message[]): string {
  const date = new Date().toLocaleDateString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const divider = "━".repeat(30);
  const sectionDivider = "─".repeat(30);

  const header = [
    "Plan Advisor — Trip Summary",
    `Generated: ${date}`,
    divider,
  ].join("\n");

  const conversationLines: string[] = ["CONVERSATION", ""];

  messages
    .filter((m) => !m.streaming)
    .forEach((m) => {
      const who = m.role === "user" ? "[You]" : "[Plan Advisor]";
      const text = stripMarkdown(m.content);
      if (text) {
        conversationLines.push(`${who}`);
        conversationLines.push(text);
        conversationLines.push("");
      }

      // Append any card summaries inline under the assistant message
      const cards: string[] = [
        summariseFlight(m),
        summariseRoundTrip(m),
        summariseHotel(m),
        summariseWeather(m),
        summariseForecast(m),
        summarisePacking(m),
        summariseDocumentCheck(m),
        summariseGroupTrip(m),
        summariseBudget(m),
      ].filter(Boolean);

      if (cards.length) {
        conversationLines.push(sectionDivider);
        conversationLines.push("TRIP CARDS");
        cards.forEach((c) => {
          conversationLines.push("");
          conversationLines.push(c);
        });
        conversationLines.push(sectionDivider);
        conversationLines.push("");
      }
    });

  return [header, "", conversationLines.join("\n")].join("\n");
}

/* ── Filename helper ────────────────────────────────────────── */
export function exportFilename(messages: Message[]): string {
  // Try to pull destination from groupTripData or flightData
  let dest = "";
  for (const m of messages) {
    if (m.groupTripData?.destination) { dest = m.groupTripData.destination; break; }
    if (m.flightData?.destination) { dest = m.flightData.destination; break; }
    if (m.roundTripData?.outbound?.destination) { dest = m.roundTripData.outbound.destination; break; }
  }
  const slug = dest
    ? dest.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    : "trip";
  const dateStr = new Date().toISOString().slice(0, 10);
  return `plan-advisor-${slug}-${dateStr}.txt`;
}

/* ── Print / PDF HTML builder ───────────────────────────────── */
function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function flightCardHTML(d: FlightSearchResult, label?: string): string {
  if (!d || d.results.length === 0) return "";
  const rows = d.results.slice(0, 5).map((f) => {
    const seg = f.segments?.[0];
    const route = seg ? `${esc(seg.from)} → ${esc(seg.to)}` : `${esc(d.origin)} → ${esc(d.destination)}`;
    return `<tr><td>${esc(f.airline)}</td><td>${route}</td><td><b>${esc(f.price)}</b></td><td>${esc(f.total_duration)}</td><td>${f.stops === 0 ? "Non-stop" : `${f.stops} stop${f.stops > 1 ? "s" : ""}`}</td></tr>`;
  }).join("");
  return `<div class="card"><div class="card-title">✈️ ${esc(label ?? "Flights")} — ${esc(d.origin)} → ${esc(d.destination)}</div>
<table><thead><tr><th>Airline</th><th>Route</th><th>Price</th><th>Duration</th><th>Stops</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function hotelCardHTML(d: HotelSearchResult): string {
  if (!d || d.results.length === 0) return "";
  const rows = d.results.slice(0, 5).map((h) =>
    `<tr><td><b>${esc(h.name)}</b></td><td>${h.rating}★</td><td>${esc(h.price)}/night</td><td>${esc(h.hotel_class)}</td></tr>`
  ).join("");
  return `<div class="card"><div class="card-title">🏨 Hotels — ${esc(d.location)} (${esc(d.check_in)} → ${esc(d.check_out)})</div>
<table><thead><tr><th>Hotel</th><th>Rating</th><th>Price</th><th>Class</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function weatherCardHTML(d: WeatherResult): string {
  if (!d || d.error) return "";
  const rows = d.forecast.slice(0, 5).map((day) =>
    `<tr><td>${esc(day.date)}</td><td>${esc(day.description)}</td><td>${day.max_temp_c}°/${day.min_temp_c}°C</td><td>${day.rain_mm}mm</td></tr>`
  ).join("");
  return `<div class="card"><div class="card-title">🌤️ Weather — ${esc(d.location)}</div>
<p>${d.temp_c}°C — ${esc(d.description)} | Feels like ${d.feels_like_c}°C | Humidity ${d.humidity}%</p>
${rows ? `<table><thead><tr><th>Date</th><th>Conditions</th><th>Temp</th><th>Rain</th></tr></thead><tbody>${rows}</tbody></table>` : ""}</div>`;
}

function groupTripCardHTML(d: GroupTripPlan): string {
  // Timeline table
  const timelineRows = d.timeline.map((t) =>
    `<tr><td><b>${esc(t.time)}</b></td><td>${esc(t.activity)}</td><td>${esc(t.location)}</td><td>${t.duration_min > 0 ? `${t.duration_min}min` : ""}</td><td>${t.cost_per_person > 0 ? `₹${t.cost_per_person}` : ""}</td></tr>`
  ).join("");

  // Cost table
  const cb = d.cost_breakdown;
  const costItems = [
    { label: "Transport", val: cb.transport_per_person },
    { label: "Entry fees", val: cb.entry_fees_per_person },
    { label: "Food", val: cb.food_per_person },
    { label: "Toy train", val: cb.toy_train_per_person },
    { label: "Miscellaneous", val: cb.miscellaneous_per_person },
  ].filter((r) => r.val > 0);

  const costRows = costItems.map((r) =>
    `<tr><td>${esc(r.label)}</td><td>₹${r.val.toLocaleString()}</td><td>₹${(r.val * d.group_size).toLocaleString()}</td></tr>`
  ).join("");

  // Packing
  const packingHTML = Object.entries(d.packing_list)
    .filter(([, v]) => Array.isArray(v) && (v as string[]).length > 0)
    .map(([k, v]) => `<li><b>${k.replace(/_/g, " ")}:</b> ${(v as string[]).join(", ")}</li>`)
    .join("");

  // Prayer
  const prayerRows = d.prayer_schedule.map((p) =>
    `<tr><td>${esc(p.prayer)}</td><td>${esc(p.time)}</td><td>${esc(p.location)}</td><td>${esc(p.notes)}</td></tr>`
  ).join("");

  // Alerts
  const alertsHTML = d.alerts
    .map((a) => `<div class="alert">${a.severity === "high" ? "⛔" : "⚠️"} ${esc(a.message)}</div>`)
    .join("");

  return `<div class="card">
<div class="card-title">🗺️ Group Trip — ${esc(d.origin)} → ${esc(d.destination)}</div>
<p><b>Date:</b> ${esc(d.travel_date)} | <b>Group:</b> ${d.group_size} people | <b>Duration:</b> ${esc(d.duration)}</p>
${d.summary ? `<p>${esc(d.summary)}</p>` : ""}
${alertsHTML}
<h2>⏰ Timeline</h2>
<table><thead><tr><th>Time</th><th>Activity</th><th>Location</th><th>Duration</th><th>Cost/Person</th></tr></thead><tbody>${timelineRows}</tbody></table>
${prayerRows ? `<h2>🕌 Prayer Schedule</h2><table><thead><tr><th>Prayer</th><th>Time</th><th>Location</th><th>Notes</th></tr></thead><tbody>${prayerRows}</tbody></table>` : ""}
<h2>💰 Cost Breakdown</h2>
<table><thead><tr><th>Item</th><th>Per Person</th><th>Group Total</th></tr></thead><tbody>${costRows}<tr class="cost-total"><td><b>Total</b></td><td><b>₹${cb.total_per_person.toLocaleString()}</b></td><td><b>₹${cb.total_group.toLocaleString()}</b></td></tr></tbody></table>
${packingHTML ? `<h2>🎒 Packing List</h2><ul>${packingHTML}</ul>` : ""}
</div>`;
}

export function buildPrintHTML(messages: Message[]): string {
  const date = new Date().toLocaleDateString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const contentParts: string[] = [];
  messages
    .filter((m) => !m.streaming)
    .forEach((m) => {
      const who = m.role === "user" ? "You" : "Plan Advisor";
      const text = stripMarkdown(m.content).replace(/\n/g, "<br>");

      if (m.role === "user") {
        contentParts.push(`<div class="message"><div class="label">${who}</div><div class="user-msg">${text}</div></div>`);
      } else {
        contentParts.push(`<div class="message"><div class="label">${who}</div><div class="ai-msg">${text}</div></div>`);
      }

      // Cards
      if (m.roundTripData) {
        if (m.roundTripData.outbound) contentParts.push(flightCardHTML(m.roundTripData.outbound, "Outbound"));
        if (m.roundTripData.return_flight) contentParts.push(flightCardHTML(m.roundTripData.return_flight, "Return"));
      } else if (m.flightData) {
        contentParts.push(flightCardHTML(m.flightData));
      }
      if (m.hotelData) contentParts.push(hotelCardHTML(m.hotelData));
      if (m.weatherData) contentParts.push(weatherCardHTML(m.weatherData));
      if (m.groupTripData) contentParts.push(groupTripCardHTML(m.groupTripData));
    });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Plan Advisor — Trip Plan</title>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; color: #111; line-height: 1.6; }
    h1 { font-size: 22px; border-bottom: 2px solid #6366f1; padding-bottom: 8px; color: #1e1b4b; }
    h2 { font-size: 16px; color: #4338ca; margin-top: 24px; }
    .message { margin: 16px 0; }
    .label { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; }
    .user-msg { background: #f3f4f6; padding: 12px; border-radius: 8px; }
    .ai-msg { padding: 8px 0; }
    .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 12px 0; }
    .card-title { font-size: 14px; font-weight: bold; color: #374151; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    td, th { padding: 6px 10px; border: 1px solid #e5e7eb; font-size: 13px; }
    th { background: #f9fafb; font-weight: bold; }
    .cost-total { font-weight: bold; background: #ede9fe; }
    .alert { background: #fef3c7; padding: 8px; border-left: 4px solid #f59e0b; margin: 8px 0; font-size: 13px; }
    @media print { body { margin: 20px; } }
    .footer { margin-top: 40px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 8px; }
  </style>
</head>
<body>
  <h1>✦ Plan Advisor — Trip Plan</h1>
  <p style="color:#6b7280;font-size:13px;">Generated: ${date}</p>
  ${contentParts.join("\n")}
  <div class="footer">Plan Advisor — AI Travel Planner | Generated on ${date}</div>
</body>
</html>`;
}

/* ── ICS / Google Calendar export ────────────────────────────── */
export function generateICS(data: GroupTripPlan): string {
  const events: string[] = [];
  const dtStart = data.travel_date.replace(/-/g, ""); // YYYYMMDD

  // Main trip event
  events.push([
    "BEGIN:VEVENT",
    `DTSTART;VALUE=DATE:${dtStart}`,
    `SUMMARY:Trip to ${data.destination}`,
    `DESCRIPTION:${(data.summary ?? "").replace(/\n/g, "\\n")}`,
    "END:VEVENT",
  ].join("\r\n"));

  // Each timeline item
  for (const item of data.timeline ?? []) {
    if (!item.time) continue;
    const parts = item.time.split(":").map(Number);
    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    const dtItem = `${dtStart}T${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
    const endMin = m + (item.duration_min || 60);
    const endH = h + Math.floor(endMin / 60);
    const endM = endMin % 60;
    const dtEnd = `${dtStart}T${String(endH).padStart(2, "0")}${String(endM).padStart(2, "0")}00`;
    events.push([
      "BEGIN:VEVENT",
      `DTSTART:${dtItem}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${item.activity.replace(/[,;]/g, " ")}`,
      `LOCATION:${(item.location || data.destination).replace(/[,;]/g, " ")}`,
      `DESCRIPTION:${(item.notes || "").replace(/\n/g, "\\n")}`,
      "END:VEVENT",
    ].join("\r\n"));
  }

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Plan Advisor//Trip Plan//EN",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadICS(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── WhatsApp text generator ────────────────────────────────── */
export function generateWhatsAppText(data: GroupTripPlan): string {
  const lines: string[] = [];

  // Header
  lines.push(`🗺️ ${data.destination.toUpperCase()} TRIP PLAN`);
  lines.push(`📅 ${data.travel_date} | 👥 ${data.group_size} members | 🚌 ${data.group_type.replace(/_/g, " ")}`);

  // Schedule
  if (data.timeline.length > 0) {
    lines.push("");
    lines.push("⏰ SCHEDULE");
    data.timeline.slice(0, 8).forEach((t) => {
      const typeEmoji =
        t.type === "prayer" ? "🕌" :
        t.type === "food" ? "🍱" :
        t.type === "sightseeing" ? "🎯" :
        t.type === "travel" ? "🚌" :
        t.type === "toilet" ? "🚻" :
        t.type === "rest" ? "😴" :
        t.type === "hotel" ? "🏨" : "✅";
      const trafficNote = t.notes && data.traffic_forecast
        ? ` (traffic: ${data.traffic_forecast.traffic_level})`
        : "";
      lines.push(`${t.time} ${typeEmoji} ${t.activity}${trafficNote}`);
    });
  }

  // Prayer
  if (data.prayer_schedule.length > 0) {
    lines.push("");
    lines.push("🕌 NAMAZ");
    data.prayer_schedule.forEach((p) => {
      lines.push(`${p.prayer}: ${p.time} (${p.location})`);
    });
  }

  // Food
  if (data.food_plan.meals.length > 0) {
    lines.push("");
    lines.push("🍱 FOOD");
    data.food_plan.meals.forEach((meal) => {
      const loc = meal.location ? ` — ${meal.location}` : "";
      lines.push(`${meal.time} ${meal.meal}: ${meal.option}${loc}`);
    });
  }

  // Cost
  const cb = data.cost_breakdown;
  if (cb.total_per_person > 0) {
    lines.push("");
    lines.push(`💰 COST PER PERSON: ₹${cb.total_per_person.toLocaleString()}`);
    if (cb.transport_per_person > 0) lines.push(`  🚌 Bus: ₹${cb.transport_per_person}`);
    if (cb.entry_fees_per_person > 0) lines.push(`  🎫 Entry: ₹${cb.entry_fees_per_person}`);
    if (cb.food_per_person > 0) lines.push(`  🍱 Food: ₹${cb.food_per_person}`);
    if (cb.toy_train_per_person > 0) lines.push(`  🚂 Train: ₹${cb.toy_train_per_person}`);
    if (cb.miscellaneous_per_person > 0) lines.push(`  📦 Misc: ₹${cb.miscellaneous_per_person}`);
  }

  // Packing (mandatory items only, top 8)
  if (data.packing_list.mandatory_everyone?.length > 0) {
    lines.push("");
    lines.push(`📦 CARRY: ${data.packing_list.mandatory_everyone.slice(0, 8).join(", ")}`);
  }

  // Alerts (high severity only)
  const highAlerts = data.alerts.filter((a) => a.severity === "high");
  if (highAlerts.length > 0) {
    lines.push("");
    highAlerts.forEach((a) => lines.push(`⚠️ ${a.message}`));
  }

  // Footer
  lines.push("");
  lines.push(`Planned with Plan Advisor`);

  // Truncate to ~2000 chars
  let text = lines.join("\n");
  if (text.length > 2000) {
    text = text.slice(0, 1950) + "\n...(see full plan)";
  }
  return text;
}
