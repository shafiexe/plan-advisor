"use client";

import { useState, useEffect } from "react";

export interface UserLocation {
  city: string;       // e.g. "Bangalore"
  country: string;    // e.g. "India"
  label: string;      // e.g. "Bangalore, India"
}

async function reverseGeocode(lat: number, lon: number): Promise<UserLocation | null> {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const addr = data.address ?? {};
    const city = addr.city ?? addr.town ?? addr.village ?? addr.county ?? "";
    const country = addr.country ?? "";
    if (!city) return null;
    return { city, country, label: `${city}, ${country}` };
  } catch {
    return null;
  }
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    // Use cached position first (faster, no permission prompt delay)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (loc) setLocation(loc);
      },
      () => {}, // silently ignore — permission denied or unavailable
      { timeout: 5000, maximumAge: 10 * 60 * 1000 } // accept 10-min cached position
    );
  }, []);

  return location;
}
