"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import FlightResultsCard from "@/components/FlightResultsCard";
import MultiCityFlightCard from "@/components/MultiCityFlightCard";
import HotelResultsCard from "@/components/HotelResultsCard";
import DestinationGuideCard from "@/components/DestinationGuideCard";
import TripBudgetCard from "@/components/TripBudgetCard";
import ItineraryCard from "@/components/ItineraryCard";
import WeatherCard from "@/components/WeatherCard";
import PricePredictionCard from "@/components/PricePredictionCard";
import RoundTripCard from "@/components/RoundTripCard";
import type { FlightSearchResult, RoundTripResult } from "@/types/flights";
import type { HotelSearchResult } from "@/types/places";
import type { WeatherResult } from "@/types/weather";
import type { DestinationGuide } from "@/types/destination";
import type { TripBudget } from "@/types/budget";
import type { Itinerary } from "@/types/itinerary";
import type { PricePrediction } from "@/types/prediction";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type SharedTrip = {
  id: number;
  name: string;
  destination: string;
  date_range: string;
  created_at: string;
  data: {
    flightData?: FlightSearchResult;
    hotelData?: HotelSearchResult;
    guideData?: DestinationGuide;
    budgetData?: TripBudget;
    itineraryData?: Itinerary;
    weatherData?: WeatherResult;
    predictionData?: PricePrediction;
    roundTripData?: RoundTripResult;
  };
};

export default function SharedTripPage() {
  const { token } = useParams<{ token: string }>();
  const [trip, setTrip] = useState<SharedTrip | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/trips/shared/${token}`)
      .then(r => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setTrip)
      .catch(() => setError("This trip link is invalid or has been revoked."));
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🗺️</div>
          <p className="text-slate-300 text-lg font-medium">Trip not found</p>
          <p className="text-slate-500 text-sm mt-2">{error}</p>
          <a
            href="/"
            className="mt-6 inline-block px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            Open Plan Advisor
          </a>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const d = trip.data ?? {};

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold shadow-lg shrink-0">
            ✦
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-slate-100 leading-none truncate">{trip.name}</h1>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {trip.destination && <span>{trip.destination}</span>}
              {trip.destination && trip.date_range && <span> · </span>}
              {trip.date_range && <span>{trip.date_range}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
              View only
            </span>
            <a
              href="/"
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
            >
              Plan your trip →
            </a>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-4">

        {d.flightData && (
          d.flightData.is_multi_city
            ? <MultiCityFlightCard data={d.flightData} />
            : <FlightResultsCard data={d.flightData} />
        )}

        {d.roundTripData && (
          <RoundTripCard data={d.roundTripData} />
        )}

        {d.hotelData && (
          <HotelResultsCard data={d.hotelData} />
        )}

        {d.weatherData && (
          <WeatherCard data={d.weatherData} />
        )}

        {d.guideData && (
          <DestinationGuideCard data={d.guideData} />
        )}

        {d.budgetData && (
          <TripBudgetCard data={d.budgetData} />
        )}

        {d.itineraryData && (
          <ItineraryCard data={d.itineraryData} />
        )}

        {d.predictionData && (
          <PricePredictionCard data={d.predictionData} />
        )}

        {/* Empty state — if no cards in data */}
        {!d.flightData && !d.roundTripData && !d.hotelData && !d.weatherData &&
         !d.guideData && !d.budgetData && !d.itineraryData && !d.predictionData && (
          <div className="text-center py-16 text-slate-600">
            <p className="text-3xl mb-3">🗺️</p>
            <p className="text-sm">No trip details to display.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-10 border-t border-slate-800 mt-4">
        <p className="text-xs text-slate-600 mb-3">Want to plan your own trip?</p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors shadow-lg shadow-indigo-900/30"
        >
          ✦ Try Plan Advisor free
        </a>
      </div>
    </main>
  );
}
