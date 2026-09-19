"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export type WsMessage =
  | { type: "typing" }
  | { type: "token"; content: string }
  | { type: "tool_start"; name: string; label: string }
  | { type: "flight_results"; data: unknown }
  | { type: "price_calendar"; data: unknown }
  | { type: "train_results"; data: unknown }
  | { type: "hotel_results"; data: unknown }
  | { type: "restaurant_results"; data: unknown }
  | { type: "bus_results"; data: unknown }
  | { type: "round_trip_results"; data: unknown }
  | { type: "weather_results"; data: unknown }
  | { type: "visa_results"; data: unknown }
  | { type: "guide_results"; data: unknown }
  | { type: "currency_results"; data: unknown }
  | { type: "budget_results"; data: unknown }
  | { type: "prediction_results"; data: unknown }
  | { type: "itinerary_results"; data: unknown }
  | { type: "packing_results"; data: unknown }
  | { type: "flight_status_results"; data: unknown }
  | { type: "transit_results"; data: unknown }
  | { type: "phrasebook_results"; data: unknown }
  | { type: "insurance_results"; data: unknown }
  | { type: "timeline_results"; data: unknown }
  | { type: "split_results"; data: unknown }
  | { type: "hotel_comparison_results"; data: unknown }
  | { type: "events_results"; data: unknown }
  | { type: "document_check_results"; data: unknown }
  | { type: "recap_results"; data: unknown }
  | { type: "layover_results"; data: unknown }
  | { type: "forecast_results"; data: unknown }
  | { type: "group_trip_results"; data: unknown }
  | { type: "attractions_results"; data: unknown }
  | { type: "baggage_results"; data: unknown }
  | { type: "checklist_results"; data: unknown }
  | { type: "done" }
  | { type: "error"; content: string };

export type HistoryEntry = { role: "user" | "assistant"; content: string };

type Options = {
  onToken: (token: string) => void;
  onDone: () => void;
  onTyping: () => void;
  onError: (msg: string) => void;
  onToolStart?: (name: string, label: string) => void;
  onFlightResults?: (data: unknown) => void;
  onCalendarResults?: (data: unknown) => void;
  onTrainResults?: (data: unknown) => void;
  onHotelResults?: (data: unknown) => void;
  onRestaurantResults?: (data: unknown) => void;
  onBusResults?: (data: unknown) => void;
  onRoundTripResults?: (data: unknown) => void;
  onWeatherResults?: (data: unknown) => void;
  onVisaResults?: (data: unknown) => void;
  onGuideResults?: (data: unknown) => void;
  onCurrencyResults?: (data: unknown) => void;
  onBudgetResults?: (data: unknown) => void;
  onPredictionResults?: (data: unknown) => void;
  onItineraryResults?: (data: unknown) => void;
  onPackingResults?: (data: unknown) => void;
  onFlightStatusResults?: (data: unknown) => void;
  onTransitResults?: (data: unknown) => void;
  onPhrasebookResults?: (data: unknown) => void;
  onInsuranceResults?: (data: unknown) => void;
  onTimelineResults?: (data: unknown) => void;
  onSplitResults?: (data: unknown) => void;
  onHotelComparisonResults?: (data: unknown) => void;
  onEventsResults?: (data: unknown) => void;
  onDocumentCheckResults?: (data: unknown) => void;
  onRecapResults?: (data: unknown) => void;
  onLayoverResults?: (data: unknown) => void;
  onForecastResults?: (data: unknown) => void;
  onGroupTripResults?: (data: unknown) => void;
  onAttractionsResults?: (data: unknown) => void;
  onBaggageResults?: (data: unknown) => void;
  onChecklistResults?: (data: unknown) => void;
};

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws/chat";

export function useWebSocket(opts: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => setConnected(true);

    ws.onmessage = (e) => {
      const msg: WsMessage = JSON.parse(e.data);
      if      (msg.type === "typing")         optsRef.current.onTyping();
      else if (msg.type === "token")          optsRef.current.onToken(msg.content);
      else if (msg.type === "done")           optsRef.current.onDone();
      else if (msg.type === "error")          optsRef.current.onError(msg.content);
      else if (msg.type === "tool_start")     optsRef.current.onToolStart?.(msg.name, msg.label);
      else if (msg.type === "flight_results")     optsRef.current.onFlightResults?.(msg.data);
      else if (msg.type === "price_calendar")     optsRef.current.onCalendarResults?.(msg.data);
      else if (msg.type === "train_results")       optsRef.current.onTrainResults?.(msg.data);
      else if (msg.type === "hotel_results")      optsRef.current.onHotelResults?.(msg.data);
      else if (msg.type === "restaurant_results") optsRef.current.onRestaurantResults?.(msg.data);
      else if (msg.type === "bus_results")        optsRef.current.onBusResults?.(msg.data);
      else if (msg.type === "round_trip_results") optsRef.current.onRoundTripResults?.(msg.data);
      else if (msg.type === "weather_results")    optsRef.current.onWeatherResults?.(msg.data);
      else if (msg.type === "visa_results")       optsRef.current.onVisaResults?.(msg.data);
      else if (msg.type === "guide_results")      optsRef.current.onGuideResults?.(msg.data);
      else if (msg.type === "currency_results")   optsRef.current.onCurrencyResults?.(msg.data);
      else if (msg.type === "budget_results")      optsRef.current.onBudgetResults?.(msg.data);
      else if (msg.type === "prediction_results")  optsRef.current.onPredictionResults?.(msg.data);
      else if (msg.type === "itinerary_results")  optsRef.current.onItineraryResults?.(msg.data);
      else if (msg.type === "packing_results")         optsRef.current.onPackingResults?.(msg.data);
      else if (msg.type === "flight_status_results")   optsRef.current.onFlightStatusResults?.(msg.data);
      else if (msg.type === "transit_results")          optsRef.current.onTransitResults?.(msg.data);
      else if (msg.type === "phrasebook_results")       optsRef.current.onPhrasebookResults?.(msg.data);
      else if (msg.type === "insurance_results")        optsRef.current.onInsuranceResults?.(msg.data);
      else if (msg.type === "timeline_results")         optsRef.current.onTimelineResults?.(msg.data);
      else if (msg.type === "split_results")            optsRef.current.onSplitResults?.(msg.data);
      else if (msg.type === "hotel_comparison_results") optsRef.current.onHotelComparisonResults?.(msg.data);
      else if (msg.type === "events_results")            optsRef.current.onEventsResults?.(msg.data);
      else if (msg.type === "document_check_results")   optsRef.current.onDocumentCheckResults?.(msg.data);
      else if (msg.type === "recap_results")             optsRef.current.onRecapResults?.(msg.data);
      else if (msg.type === "layover_results")           optsRef.current.onLayoverResults?.(msg.data);
      else if (msg.type === "forecast_results")          optsRef.current.onForecastResults?.(msg.data);
      else if (msg.type === "group_trip_results")        optsRef.current.onGroupTripResults?.(msg.data);
      else if (msg.type === "attractions_results")       optsRef.current.onAttractionsResults?.(msg.data);
      else if (msg.type === "baggage_results")           optsRef.current.onBaggageResults?.(msg.data);
      else if (msg.type === "checklist_results")         optsRef.current.onChecklistResults?.(msg.data);
    };

    ws.onclose = () => {
      setConnected(false);
      setTimeout(connect, 2000);
    };

    ws.onerror = () => ws.close();
    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => { wsRef.current?.close(); };
  }, [connect]);

  const send = useCallback((text: string, history: HistoryEntry[] = [], extra?: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ text, history, ...extra }));
    }
  }, []);

  const stop = useCallback(() => {
    wsRef.current?.close();
  }, []);

  return { send, stop, connected };
}
