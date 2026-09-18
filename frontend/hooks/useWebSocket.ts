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

  return { send, connected };
}
