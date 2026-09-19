"use client";

import dynamic from "next/dynamic";
import type { Message } from "./MessageBubble";

export type MapPin = {
  lat: number;
  lng: number;
  label: string;
  type: "hotel" | "attraction" | "restaurant" | "airport";
  description?: string;
};

type Props = {
  pins: MapPin[];
  title: string;
  zoom?: number;
};

// Dynamically import the Leaflet map so it only runs client-side (Leaflet needs `window`)
const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false });

const EMOJI: Record<MapPin["type"], string> = {
  hotel:      "🏨",
  attraction: "🏛️",
  restaurant: "🍽️",
  airport:    "✈️",
};

const LABEL: Record<MapPin["type"], string> = {
  hotel:      "Hotels",
  attraction: "Attractions",
  restaurant: "Restaurants",
  airport:    "Airports",
};

function center(pins: MapPin[]): [number, number] {
  const lat = pins.reduce((s, p) => s + p.lat, 0) / pins.length;
  const lng = pins.reduce((s, p) => s + p.lng, 0) / pins.length;
  return [lat, lng];
}

function countByType(pins: MapPin[]) {
  const counts: Partial<Record<MapPin["type"], number>> = {};
  for (const p of pins) {
    counts[p.type] = (counts[p.type] ?? 0) + 1;
  }
  return counts;
}

export default function MapCard({ pins, title, zoom = 12 }: Props) {
  if (!pins.length) return null;

  const mapCenter = center(pins);
  const counts = countByType(pins);

  return (
    <div className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/80
      shadow-xl shadow-black/30 overflow-hidden">

      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-3
        bg-gradient-to-r from-emerald-950/40 to-slate-900/40">
        <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30
          flex items-center justify-center text-lg">
          🗺️
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-200">{title}</p>
          <p className="text-[11px] text-slate-500">{pins.length} location{pins.length !== 1 ? "s" : ""} on map</p>
        </div>
      </div>

      {/* Map */}
      <div className="border border-slate-700 rounded-xl overflow-hidden m-3">
        <LeafletMap pins={pins} center={mapCenter} zoom={zoom} />
      </div>

      {/* Legend */}
      <div className="px-4 pb-4 flex flex-wrap gap-3">
        {(Object.keys(counts) as MapPin["type"][]).map((type) => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>{EMOJI[type]}</span>
            <span className="font-semibold text-slate-300">{counts[type]}</span>
            <span>{LABEL[type]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Helper to extract MapPins from a Message ───────────────────────────────────

type HotelWithCoords = {
  name: string;
  description?: string;
  gps_coordinates?: { lat: number; lng: number };
  latitude?: number;
  longitude?: number;
};

export function extractMapPins(message: Message): MapPin[] {
  const pins: MapPin[] = [];

  // Hotels — only if GPS coordinates are present on the result object
  if (message.hotelData?.results) {
    for (const raw of message.hotelData.results as unknown as HotelWithCoords[]) {
      const gps = raw.gps_coordinates;
      if (gps && typeof gps.lat === "number" && typeof gps.lng === "number") {
        pins.push({
          lat:         gps.lat,
          lng:         gps.lng,
          label:       raw.name,
          type:        "hotel",
          description: raw.description,
        });
      } else if (typeof raw.latitude === "number" && typeof raw.longitude === "number") {
        pins.push({
          lat:         raw.latitude,
          lng:         raw.longitude,
          label:       raw.name,
          type:        "hotel",
          description: raw.description,
        });
      }
    }
  }

  // Restaurants — only if GPS coordinates are present
  if (message.restaurantData?.results) {
    type RestaurantWithCoords = {
      name: string;
      type?: string;
      gps_coordinates?: { lat: number; lng: number };
      latitude?: number;
      longitude?: number;
    };
    for (const raw of message.restaurantData.results as unknown as RestaurantWithCoords[]) {
      const gps = raw.gps_coordinates;
      if (gps && typeof gps.lat === "number" && typeof gps.lng === "number") {
        pins.push({
          lat:         gps.lat,
          lng:         gps.lng,
          label:       raw.name,
          type:        "restaurant",
          description: raw.type,
        });
      } else if (typeof raw.latitude === "number" && typeof raw.longitude === "number") {
        pins.push({
          lat:         raw.latitude,
          lng:         raw.longitude,
          label:       raw.name,
          type:        "restaurant",
          description: raw.type,
        });
      }
    }
  }

  return pins;
}
