"use client";

import { useState } from "react";
import MarkdownBody from "./MarkdownBody";
import FlightResultsCard from "./FlightResultsCard";
import PriceCalendarCard from "./PriceCalendarCard";
import HotelResultsCard from "./HotelResultsCard";
import RestaurantCard from "./RestaurantCard";
import BusResultsCard from "./BusResultsCard";
import TrainResultsCard from "./TrainResultsCard";
import TransportComparisonCard from "./TransportComparisonCard";
import RoundTripCard from "./RoundTripCard";
import WeatherCard from "./WeatherCard";
import type { FlightSearchResult, PriceCalendarResult, RoundTripResult } from "@/types/flights";
import type { HotelSearchResult, RestaurantSearchResult } from "@/types/places";
import type { BusSearchResult } from "@/types/buses";
import type { TrainSearchResult } from "@/types/transport";
import type { WeatherResult } from "@/types/weather";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  timestamp: number;
  flightData?: FlightSearchResult;
  calendarData?: PriceCalendarResult;
  hotelData?: HotelSearchResult;
  restaurantData?: RestaurantSearchResult;
  busData?: BusSearchResult;
  trainData?: TrainSearchResult;
  roundTripData?: RoundTripResult;
  weatherData?: WeatherResult;
};

type AlertData = { origin: string; destination: string; departureDate: string; price: number };

type Props = {
  message: Message;
  onSpeak?: (text: string) => void;
  onStopSpeak?: () => void;
  speaking?: boolean;
  onAction?: (text: string) => void;
  onSetAlert?: (data: AlertData) => void;
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({ message, onSpeak, onStopSpeak, speaking, onAction, onSetAlert }: Props) {
  const { role, content, streaming, timestamp, flightData, calendarData, hotelData, restaurantData, busData, trainData, roundTripData, weatherData } = message;
  const isUser = role === "user";
  const isTransportComparison = !isUser && ((!!flightData && (!!busData || !!trainData)) || (!!busData && !!trainData));
  const hasCard = !isUser && (!!flightData || !!calendarData || !!hotelData || !!restaurantData || !!busData || !!trainData || !!roundTripData || !!weatherData);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`msg-enter flex gap-3 group ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 self-end
        ${isUser
          ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-900/30"
          : "bg-gradient-to-br from-slate-600 to-slate-700 text-slate-200 border border-slate-600"}`}>
        {isUser ? "U" : "✦"}
      </div>

      {/* Bubble + meta */}
      <div className={`flex flex-col gap-2 ${isUser ? "items-end max-w-[78%]" : "items-start w-full max-w-3xl"}`}>

        {isTransportComparison && (
          <TransportComparisonCard flightData={flightData} trainData={trainData} busData={busData} />
        )}

        {!isUser && flightData && !isTransportComparison && (
          <FlightResultsCard data={flightData} streaming={streaming} onSetAlert={onSetAlert} />
        )}

        {!isUser && calendarData && (
          <PriceCalendarCard
            data={calendarData}
            onSelectDate={(date) => {
              const { origin, destination } = calendarData;
              onAction?.(`Show me flights from ${origin} to ${destination} on ${date}`);
            }}
          />
        )}

        {!isUser && hotelData && (
          <HotelResultsCard data={hotelData} streaming={streaming} />
        )}

        {!isUser && restaurantData && (
          <RestaurantCard data={restaurantData} streaming={streaming} />
        )}

        {!isUser && busData && !isTransportComparison && (
          <BusResultsCard data={busData} streaming={streaming} />
        )}

        {!isUser && trainData && !isTransportComparison && (
          <TrainResultsCard data={trainData} streaming={streaming} />
        )}

        {!isUser && roundTripData && (
          <RoundTripCard data={roundTripData} streaming={streaming} onSetAlert={onSetAlert} />
        )}

        {!isUser && weatherData && (
          <WeatherCard data={weatherData} />
        )}

        {/* When a card is shown, render analysis text below it using MarkdownBody */}
        {hasCard && content.trim() && (
          <div className="w-full px-4 py-3 rounded-2xl text-sm bg-slate-800/60 border border-slate-700/40 text-slate-200">
            <MarkdownBody text={content} />
            {streaming && (
              <span className="inline-block w-0.5 h-4 bg-indigo-300 ml-1 cursor-blink rounded-sm align-middle" />
            )}
          </div>
        )}

        {/* Plain text bubble — only when no card */}
        {!hasCard && (
          <div className={`relative px-4 py-3 rounded-2xl text-sm
            ${isUser
              ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-sm shadow-lg shadow-indigo-900/20 whitespace-pre-wrap leading-relaxed"
              : "bg-slate-800/80 text-slate-200 rounded-bl-sm border border-slate-700/60 shadow-sm"}`}>

            {isUser ? content : <MarkdownBody text={content} />}

            {streaming && (
              <span className="inline-block w-0.5 h-4 bg-indigo-300 ml-1 cursor-blink rounded-sm align-middle" />
            )}

            {!streaming && (
              <div className={`absolute -top-2 flex gap-1 ${isUser ? "-left-14" : "-right-14"} opacity-0 group-hover:opacity-100 transition-opacity`}>
                {!isUser && onSpeak && (
                  <button
                    onClick={() => speaking ? onStopSpeak?.() : onSpeak(content)}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center text-[11px] transition-colors
                      ${speaking ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-700 border-slate-600 text-slate-300 hover:text-white"}`}
                    title={speaking ? "Stop speaking" : "Read aloud"}
                  >
                    {speaking ? "⏹" : "🔊"}
                  </button>
                )}
                <button
                  onClick={handleCopy}
                  className="w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-[10px] text-slate-300 hover:text-white transition-colors"
                  title="Copy"
                >
                  {copied ? "✓" : "⧉"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Action buttons for card messages */}
        {hasCard && !streaming && (
          <div className="flex items-center gap-1.5 px-1">
            {onSpeak && (
              <button
                onClick={() => speaking ? onStopSpeak?.() : onSpeak(content)}
                className={`w-6 h-6 rounded-full border flex items-center justify-center text-[11px] transition-colors
                  ${speaking ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-700 border-slate-600 text-slate-300 hover:text-white"}`}
                title={speaking ? "Stop speaking" : "Read aloud"}
              >
                {speaking ? "⏹" : "🔊"}
              </button>
            )}
            <button
              onClick={handleCopy}
              className="w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-[10px] text-slate-300 hover:text-white transition-colors"
              title="Copy analysis"
            >
              {copied ? "✓" : "⧉"}
            </button>
          </div>
        )}

        <span className="text-[11px] text-slate-600 px-1">{formatTime(timestamp)}</span>
      </div>
    </div>
  );
}
