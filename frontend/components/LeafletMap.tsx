"use client";

// @ts-ignore — leaflet types may not be installed yet
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
// @ts-ignore
import L from "leaflet";
// @ts-ignore
import "leaflet/dist/leaflet.css";

export type MapPin = {
  lat: number;
  lng: number;
  label: string;
  type: "hotel" | "attraction" | "restaurant" | "airport";
  description?: string;
};

type Props = {
  pins: MapPin[];
  center: [number, number];
  zoom: number;
};

const EMOJI: Record<MapPin["type"], string> = {
  hotel:      "🏨",
  attraction: "🏛️",
  restaurant: "🍽️",
  airport:    "✈️",
};

function makeIcon(type: MapPin["type"]) {
  return L.divIcon({
    html: `<span style="font-size:22px;line-height:1;">${EMOJI[type]}</span>`,
    className: "",
    iconSize:   [28, 28],
    iconAnchor: [14, 28],
    popupAnchor:[0, -28],
  });
}

export default function LeafletMap({ pins, center, zoom }: Props) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={false}
      style={{ height: "320px", width: "100%", borderRadius: "0.75rem" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pins.map((pin, i) => (
        <Marker key={i} position={[pin.lat, pin.lng]} icon={makeIcon(pin.type)}>
          <Popup>
            <strong>{pin.label}</strong>
            {pin.description && <><br />{pin.description}</>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
