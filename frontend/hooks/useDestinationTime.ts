"use client";
import { useState, useEffect } from "react";

export function useDestinationTime(destination: string) {
  const [time, setTime] = useState<string>("");
  const [timezone, setTimezone] = useState<string>("");
  const [offset, setOffset] = useState<string>("");

  useEffect(() => {
    // Map destination to IANA timezone
    const tz = guessTimezone(destination);
    if (!tz) return;
    setTimezone(tz);

    const update = () => {
      try {
        const now = new Date();
        const timeStr = new Intl.DateTimeFormat("en-IN", {
          timeZone: tz,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }).format(now);

        // Calculate offset vs IST (UTC+5:30)
        const destOffset = getUTCOffset(tz);
        const istOffset = 5.5;
        const diff = destOffset - istOffset;
        const sign = diff >= 0 ? "+" : "-";
        const hours = Math.floor(Math.abs(diff));
        const mins = Math.round((Math.abs(diff) - hours) * 60);
        setOffset(mins > 0 ? `${sign}${hours}h ${mins}m vs IST` : `${sign}${hours}h vs IST`);
        setTime(timeStr);
      } catch {}
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [destination]);

  return { time, timezone, offset };
}

function getUTCOffset(tz: string): number {
  const now = new Date();
  const utcStr = now.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = now.toLocaleString("en-US", { timeZone: tz });
  return (new Date(tzStr).getTime() - new Date(utcStr).getTime()) / 3600000;
}

function guessTimezone(destination: string): string {
  const d = destination.toLowerCase();
  // Map major destinations to IANA timezones
  const map: Record<string, string> = {
    "dubai": "Asia/Dubai", "uae": "Asia/Dubai", "abu dhabi": "Asia/Dubai",
    "london": "Europe/London", "uk": "Europe/London", "england": "Europe/London",
    "paris": "Europe/Paris", "france": "Europe/Paris",
    "new york": "America/New_York", "nyc": "America/New_York", "new york city": "America/New_York",
    "los angeles": "America/Los_Angeles", "la": "America/Los_Angeles",
    "tokyo": "Asia/Tokyo", "japan": "Asia/Tokyo",
    "singapore": "Asia/Singapore",
    "bangkok": "Asia/Bangkok", "thailand": "Asia/Bangkok",
    "bali": "Asia/Makassar", "indonesia": "Asia/Jakarta",
    "sydney": "Australia/Sydney", "australia": "Australia/Sydney",
    "melbourne": "Australia/Melbourne",
    "toronto": "America/Toronto", "canada": "America/Toronto",
    "doha": "Asia/Qatar", "qatar": "Asia/Qatar",
    "riyadh": "Asia/Riyadh", "saudi": "Asia/Riyadh",
    "kuala lumpur": "Asia/Kuala_Lumpur", "malaysia": "Asia/Kuala_Lumpur",
    "hong kong": "Asia/Hong_Kong",
    "beijing": "Asia/Shanghai", "shanghai": "Asia/Shanghai", "china": "Asia/Shanghai",
    "seoul": "Asia/Seoul", "korea": "Asia/Seoul",
    "colombo": "Asia/Colombo", "sri lanka": "Asia/Colombo",
    "kathmandu": "Asia/Kathmandu", "nepal": "Asia/Kathmandu",
    "dhaka": "Asia/Dhaka", "bangladesh": "Asia/Dhaka",
    "karachi": "Asia/Karachi", "pakistan": "Asia/Karachi",
    "muscat": "Asia/Muscat", "oman": "Asia/Muscat",
    "istanbul": "Europe/Istanbul", "turkey": "Europe/Istanbul",
    "amsterdam": "Europe/Amsterdam", "netherlands": "Europe/Amsterdam",
    "frankfurt": "Europe/Berlin", "berlin": "Europe/Berlin", "germany": "Europe/Berlin",
    "rome": "Europe/Rome", "italy": "Europe/Rome",
    "madrid": "Europe/Madrid", "spain": "Europe/Madrid",
    "zurich": "Europe/Zurich", "switzerland": "Europe/Zurich",
    "moscow": "Europe/Moscow", "russia": "Europe/Moscow",
    "cairo": "Africa/Cairo", "egypt": "Africa/Cairo",
    "nairobi": "Africa/Nairobi", "kenya": "Africa/Nairobi",
    "johannesburg": "Africa/Johannesburg", "south africa": "Africa/Johannesburg",
    "goa": "Asia/Kolkata", "mumbai": "Asia/Kolkata", "delhi": "Asia/Kolkata",
    "bangalore": "Asia/Kolkata", "bengaluru": "Asia/Kolkata",
    "maldives": "Indian/Maldives",
    "mauritius": "Indian/Mauritius",
    "chicago": "America/Chicago", "miami": "America/New_York",
    "san francisco": "America/Los_Angeles", "seattle": "America/Los_Angeles",
    "cancun": "America/Cancun", "mexico": "America/Mexico_City",
    "buenos aires": "America/Argentina/Buenos_Aires", "argentina": "America/Argentina/Buenos_Aires",
    "sao paulo": "America/Sao_Paulo", "brazil": "America/Sao_Paulo",
    "prague": "Europe/Prague", "vienna": "Europe/Vienna", "budapest": "Europe/Budapest",
    "barcelona": "Europe/Madrid", "lisbon": "Europe/Lisbon", "portugal": "Europe/Lisbon",
    "athens": "Europe/Athens", "greece": "Europe/Athens",
    "dubai mall": "Asia/Dubai",
  };

  for (const [key, tz] of Object.entries(map)) {
    if (d.includes(key)) return tz;
  }
  return "";
}
