"use client";

import { useEffect, useRef } from "react";
import MessageBubble, { Message } from "./MessageBubble";
import TypingDots from "./TypingDots";

const TOOL_ICONS: Record<string, string> = {
  search_flights:    "✈️",
  search_round_trip: "✈️",
  compare_flights:   "✈️",
  get_price_calendar:"📅",
  search_trains:     "🚆",
  search_buses:      "🚌",
  search_hotels:     "🏨",
  find_restaurants:  "🍽️",
  get_weather:       "🌤️",
  get_visa_requirements: "🛂",
};

type AlertData = { origin: string; destination: string; departureDate: string; price: number };

type Props = {
  messages: Message[];
  typing: boolean;
  streaming?: boolean;
  toolLabel: string | null;
  toolName?: string | null;
  onSpeak: (text: string) => void;
  onStopSpeak: () => void;
  speaking: boolean;
  onAction?: (text: string) => void;
  onSetAlert?: (data: AlertData) => void;
};

const SUGGESTIONS = [
  "✈️  Suggest the best vacation spots for this season",
  "🚆  Compare flights, trains & buses from Bangalore to Goa",
  "🏨  Find hotels and restaurants near my destination",
  "🗺️  Plan a complete trip — transport, stay & food",
];

type EmptyProps = { onSuggestion: (text: string) => void };

function EmptyState({ onSuggestion }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-4 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl shadow-xl shadow-indigo-900/30">
          ✦
        </div>
        <div>
          <p className="text-xl font-semibold text-slate-200">Plan Advisor</p>
          <p className="text-sm text-slate-500 mt-1">Your travel & lifestyle advisor</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-sm">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            className="text-left px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/60
              text-slate-300 text-sm hover:bg-slate-700/60 hover:border-indigo-500/40
              hover:text-white transition-all"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function getSuggestions(msg: Message): string[] {
  if (msg.roundTripData) {
    const dest = msg.roundTripData.outbound?.destination ?? "";
    return [
      dest ? `Find hotels in ${dest}` : "Find hotels at destination",
      dest ? `What's the weather in ${dest}?` : "Check the weather",
      "What are the top things to do?",
    ];
  }
  if (msg.flightData) {
    const dest = msg.flightData.destination ?? "";
    const origin = msg.flightData.origin ?? "";
    return [
      dest ? `Find hotels in ${dest}` : "Find hotels at destination",
      dest ? `What's the weather in ${dest}?` : "Check the weather",
      origin && dest ? `Show cheapest dates for ${origin} → ${dest}` : "Show cheaper dates",
    ];
  }
  if (msg.weatherData) {
    const loc = msg.weatherData.location?.split(",")[0] ?? "";
    return [
      loc ? `Find hotels in ${loc}` : "Find hotels nearby",
      loc ? `Find restaurants in ${loc}` : "Find restaurants",
      "What's the best time to visit?",
    ];
  }
  if (msg.hotelData) {
    const loc = msg.hotelData.location ?? "";
    return [
      loc ? `Find restaurants in ${loc}` : "Find restaurants nearby",
      loc ? `What's the weather in ${loc}?` : "Check the weather",
      "What to see and do there?",
    ];
  }
  if (msg.restaurantData) {
    return [
      "Plan a full day itinerary",
      "What to pack for this trip?",
      "Best time to visit?",
    ];
  }
  if (msg.visaData) {
    const dest = msg.visaData.destination_country ?? "";
    return [
      dest ? `Search flights to ${dest}` : "Search flights",
      dest ? `Find hotels in ${dest}` : "Find hotels",
      dest ? `What's the weather in ${dest}?` : "Check the weather",
    ];
  }
  if (msg.busData || msg.trainData) {
    return [
      "Compare with flights",
      "Find hotels at destination",
      "What to do there?",
    ];
  }
  return [
    "Plan a complete trip for me",
    "What's the best time to visit?",
    "Help me pack for this trip",
  ];
}

type ChatWindowProps = Props & { onSuggestion: (text: string) => void; toolName?: string | null };

export default function ChatWindow({
  messages, typing, streaming, toolLabel, toolName, onSuggestion,
  onSpeak, onStopSpeak, speaking, onAction, onSetAlert,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const lastAssistantMsg = !typing && !streaming
    ? [...messages].reverse().find((m) => m.role === "assistant" && !m.streaming) ?? null
    : null;

  return (
    <div className="flex-1 overflow-y-auto chat-scroll flex flex-col">
      <div className="px-4 py-6 flex-1">
        {messages.length === 0 ? (
          <EmptyState onSuggestion={onSuggestion} />
        ) : (
          <div className="flex flex-col gap-4 max-w-3xl mx-auto">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onSpeak={onSpeak}
                onStopSpeak={onStopSpeak}
                speaking={speaking}
                onAction={onAction}
                onSetAlert={onSetAlert}
              />
            ))}
            {lastAssistantMsg && (
              <div className="flex flex-wrap gap-2 mt-2 pl-4 sm:pl-11">
                {getSuggestions(lastAssistantMsg).map((s) => (
                  <button
                    key={s}
                    onClick={() => onSuggestion(s)}
                    className="px-3 py-1.5 text-xs rounded-full border border-slate-700/60 text-slate-400
                      hover:border-indigo-500/60 hover:text-indigo-300 hover:bg-indigo-950/30
                      transition-all whitespace-nowrap"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {typing && <TypingDots />}
            {toolLabel && !typing && (
              <div className="flex items-center gap-2.5 px-1 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-sm shrink-0">
                  {(toolName && TOOL_ICONS[toolName]) ?? "🔍"}
                </div>
                <span className="text-sm text-indigo-300/80">{toolLabel}</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}

export type { Message };
