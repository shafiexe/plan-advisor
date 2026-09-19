"use client";

import { useEffect, useRef, useCallback } from "react";
import MessageBubble, { Message } from "./MessageBubble";
import TypingDots from "./TypingDots";
import { useLanguage } from "@/contexts/LanguageContext";

const TOOL_ICONS: Record<string, string> = {
  search_flights:    "✈️",
  search_round_trip: "✈️",
  compare_flights:   "✈️",
  get_price_calendar:"📅",
  search_trains:     "🚆",
  search_buses:      "🚌",
  search_hotels:     "🏨",
  find_restaurants:  "🍽️",
  get_weather:          "🌤️",
  get_weather_forecast: "🌤️",
  get_visa_requirements: "🛂",
  get_destination_guide:  "🗺️",
  convert_currency:       "💱",
  calculate_trip_budget:  "💰",
  get_itinerary:          "🗓️",
  predict_flight_price:   "🔮",
  get_packing_list:       "🎒",
  get_flight_status:      "🛫",
  get_airport_transit:    "🚌",
  get_phrasebook:         "💬",
  get_travel_insurance:   "🛡️",
  get_trip_timeline:      "📅",
  split_group_expenses:   "👥",
  compare_hotels:         "🔍",
  get_local_events:       "🎉",
  check_travel_documents: "📋",
  get_trip_recap:         "📖",
  get_layover_guide:      "🛋️",
  plan_group_trip:        "🗺️",
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
  onSaveTrip?: (tripData: Record<string, unknown>, name: string, destination: string, dateRange: string) => Promise<void>;
  userEssentials?: string[];
};

type EmptyProps = { onSuggestion: (text: string) => void };

function EmptyState({ onSuggestion }: EmptyProps) {
  const { t, tArray } = useLanguage();
  const suggestions = tArray("suggestions");

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-4 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl shadow-xl shadow-indigo-900/30">
          ✦
        </div>
        <div>
          <p className="text-xl font-semibold text-slate-200">{t("app.name")}</p>
          <p className="text-sm text-slate-500 mt-1">{t("app.tagline")}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-sm">
        {suggestions.map((s) => (
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
  if (msg.guideData) {
    const dest = msg.guideData.destination ?? "";
    return [
      dest ? `Search flights to ${dest}` : "Search flights",
      dest ? `Find hotels in ${dest}` : "Find hotels",
      dest ? `What's the weather in ${dest}?` : "Check the weather",
    ];
  }
  if (msg.currencyData) {
    const base = msg.currencyData.base_currency ?? "";
    return [
      "Show flights in this currency",
      "What's my total trip budget?",
      base ? `Convert 1000 ${base} to INR` : "Convert another amount",
    ];
  }
  if (msg.budgetData) {
    const dest = msg.budgetData.destination ?? "";
    return [
      "How can I reduce this budget?",
      dest ? `Find cheaper hotels in ${dest}` : "Find cheaper hotels",
      "Convert to USD",
    ];
  }
  if (msg.predictionData) {
    const origin = msg.predictionData.origin ?? "";
    const dest   = msg.predictionData.destination ?? "";
    return [
      origin && dest ? `Show me cheaper dates for ${origin} → ${dest}` : "Show me cheaper dates",
      dest ? `Find hotels for this trip in ${dest}` : "Find hotels for this trip",
      "Book this flight",
    ];
  }
  if (msg.itineraryData) {
    const dest = msg.itineraryData.destination ?? "";
    return [
      dest ? `Book the recommended hotels in ${dest}` : "Book the recommended hotels",
      dest ? `Find restaurants on Day 1 in ${dest}` : "Find restaurants on Day 1",
      dest ? `What's the weather like in ${dest}?` : "What's the weather like?",
    ];
  }
  if (msg.packingData) {
    const dest = msg.packingData.destination ?? "";
    return [
      dest ? `Check visa requirements for ${dest}` : "Check visa requirements",
      dest ? `What's the weather in ${dest}?` : "What's the weather?",
      dest ? `Build my day itinerary for ${dest}` : "Build my day itinerary",
    ];
  }
  if (msg.flightStatusData) {
    const dest = msg.flightStatusData.destination_iata ?? "";
    return [
      "Track another flight",
      dest ? `Find hotels near ${dest} airport` : "Find hotels near arrival airport",
      "What gate should I go to?",
    ];
  }
  if (msg.transitData) {
    return [
      "Find hotels nearby",
      "Show me the itinerary",
    ];
  }
  if (msg.phrasebookData) {
    const dest = msg.phrasebookData.destination ?? "";
    return [
      "What's the currency?",
      dest ? `Find restaurants in ${dest}` : "Find restaurants",
    ];
  }
  if (msg.insuranceData) {
    const dest = msg.insuranceData.destination ?? "";
    return [
      dest ? `Compare flight prices to ${dest}` : "Compare flight prices",
      dest ? `Check visa requirements for ${dest}` : "Check visa requirements",
      dest ? `Build packing list for ${dest}` : "Build packing list",
    ];
  }
  if (msg.timelineData) {
    const dest = msg.timelineData.destination ?? "";
    return [
      dest ? `Save this trip to ${dest}` : "Save this trip",
      dest ? `Build packing list for ${dest}` : "Show packing list",
      dest ? `What travel insurance do I need for ${dest}?` : "Check travel insurance",
    ];
  }
  if (msg.splitData) {
    return [
      "Share this with the group",
      "Add another expense",
      "Convert to USD",
    ];
  }
  if (msg.hotelComparisonData) {
    const winner = msg.hotelComparisonData.winner ?? "";
    return [
      winner ? `Book the ${winner}` : "Book the recommended hotel",
      winner ? `Find restaurants near ${winner}` : "Find restaurants nearby",
      "What's the weather like there?",
    ];
  }
  if (msg.eventsData) {
    const dest = msg.eventsData.destination ?? "";
    return [
      "Add events to my itinerary",
      dest ? `Find restaurants near event venues in ${dest}` : "Find restaurants near event venues",
      dest ? `Build packing list for ${dest}` : "Build packing list",
    ];
  }
  if (msg.documentCheckData) {
    const dest = msg.documentCheckData.destination ?? "";
    return [
      "Renew Indian passport online — passportindia.gov.in",
      dest ? `Check visa requirements for ${dest}` : "Check visa requirements",
      dest ? `Build packing list for ${dest}` : "Build packing list",
    ];
  }
  if (msg.recapData) {
    const dest = msg.recapData.destination ?? "";
    return [
      "Share this recap",
      dest ? `Plan my next trip to ${dest}` : "Plan my next trip",
      dest ? `Build a packing list for ${dest}` : "Build a packing list",
    ];
  }
  if (msg.layoverData) {
    return [
      "Find airport lounges with Priority Pass",
      "What visa do I need for transit?",
      "Book my onward flight",
    ];
  }
  if (msg.forecastData) {
    const dest = msg.forecastData.destination?.split(",")[0] ?? "";
    return [
      "Build a packing list for this weather",
      dest ? `Plan outdoor activities on sunny days in ${dest}` : "Plan outdoor activities on sunny days",
      dest ? `What should I wear in ${dest}?` : "What should I wear?",
    ];
  }
  if (msg.groupTripData) {
    const dest = msg.groupTripData.destination ?? "";
    return [
      "Share this plan with the group",
      dest ? `Build packing checklist for ${dest}` : "Build packing checklist",
      dest ? `Find halal restaurants on route to ${dest}` : "Find halal restaurants on route",
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
  onSpeak, onStopSpeak, speaking, onAction, onSetAlert, onSaveTrip, userEssentials,
}: ChatWindowProps) {
  const bottomRef    = useRef<HTMLDivElement>(null);
  const scrollRef    = useRef<HTMLDivElement>(null);
  const atBottomRef  = useRef(true);   // true = user is near the bottom → auto-scroll
  const streamingRef = useRef(streaming);
  streamingRef.current = streaming;

  // Track whether the user has scrolled up away from the bottom
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottomRef.current = distFromBottom < 120;
  }, []);

  // Auto-scroll only when the user is already near the bottom
  useEffect(() => {
    if (atBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, typing]);

  // When a new user message is sent (streaming starts), always jump to bottom
  useEffect(() => {
    if (streaming) {
      atBottomRef.current = true;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [streaming]);

  const lastAssistantMsg = !typing && !streaming
    ? [...messages].reverse().find((m) => m.role === "assistant" && !m.streaming) ?? null
    : null;

  return (
    <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto chat-scroll flex flex-col">
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
                onSaveTrip={onSaveTrip}
                userEssentials={userEssentials}
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
