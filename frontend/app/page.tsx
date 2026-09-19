"use client";

import { useState, useCallback, useEffect, useRef, DragEvent } from "react";
import { useSession, signOut } from "next-auth/react";
import ChatWindow from "@/components/ChatWindow";
import InputBar from "@/components/InputBar";
import ConversationSidebar, { Conversation } from "@/components/ConversationSidebar";
import ConversationSearchModal from "@/components/ConversationSearchModal";
import PassengerFormModal from "@/components/PassengerFormModal";
import type { PassengerRecord } from "@/components/PassengerFormModal";
import { Message } from "@/components/MessageBubble";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useSpeech } from "@/hooks/useSpeech";
import { useServerSync } from "@/hooks/useServerSync";
import type { AlertRecord } from "@/hooks/useServerSync";
import { useTheme } from "@/hooks/useTheme";
import { useUserLocation } from "@/hooks/useUserLocation";
import type { FlightSearchResult, PriceCalendarResult, RoundTripResult } from "@/types/flights";
import type { HotelSearchResult, RestaurantSearchResult } from "@/types/places";
import type { BusSearchResult } from "@/types/buses";
import type { TrainSearchResult } from "@/types/transport";
import type { WeatherResult } from "@/types/weather";
import type { VisaResult } from "@/types/visa";
import ItinerarySidebar from "@/components/ItinerarySidebar";
import PriceAlertModal from "@/components/PriceAlertModal";

/* ── Persistence helpers ─────────────────────────────────── */
function loadConversations(key: string): Conversation[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveConversations(key: string, convs: Conversation[]) {
  try {
    const cleaned = convs.map((c) => ({
      ...c,
      messages: c.messages.filter((m) => !m.streaming),
    }));
    localStorage.setItem(key, JSON.stringify(cleaned));
  } catch {}
}

function makeId() { return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

/* ── Stopped-conversation registry (localStorage) ─── */
const STOPPED_CONVS_KEY = "pa_stopped_convs_v1";
function markConvStopped(convId: string) {
  try {
    const arr: string[] = JSON.parse(localStorage.getItem(STOPPED_CONVS_KEY) ?? "[]");
    if (!arr.includes(convId)) localStorage.setItem(STOPPED_CONVS_KEY, JSON.stringify([...arr, convId]));
  } catch {}
}
function clearConvStopped(convId: string) {
  try {
    const arr: string[] = JSON.parse(localStorage.getItem(STOPPED_CONVS_KEY) ?? "[]");
    localStorage.setItem(STOPPED_CONVS_KEY, JSON.stringify(arr.filter(id => id !== convId)));
  } catch {}
}
function isConvStopped(convId: string): boolean {
  try {
    return (JSON.parse(localStorage.getItem(STOPPED_CONVS_KEY) ?? "[]") as string[]).includes(convId);
  } catch { return false; }
}

/* ── Component ───────────────────────────────────────────── */
export default function Home() {
  const { data: session } = useSession();
  const userEmail = session?.user?.email ?? null;
  const userKey   = userEmail ?? "guest";
  const STORAGE_KEY = `plan-advisory-${userKey}-conversations`;
  const ACTIVE_KEY  = `plan-advisory-${userKey}-active-id`;

  const sync = useServerSync(userEmail);
  const { theme, toggle: toggleTheme } = useTheme();
  const userLocation = useUserLocation();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId]           = useState<string | null>(null);
  const [input, setInput]                 = useState("");
  const [typing, setTyping]               = useState(false);
  const [streaming, setStreaming]         = useState(false);
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [searchOpen, setSearchOpen]       = useState(false);
  const [toolLabel, setToolLabel]         = useState<string | null>(null);
  const [toolName, setToolName]           = useState<string | null>(null);
  const [passportFile, setPassportFile]   = useState<File | null>(null);
  const [dragOver, setDragOver]           = useState(false);
  const [savedPassengers, setSavedPassengers] = useState<PassengerRecord[]>([]);
  const [editingPassenger, setEditingPassenger] = useState<PassengerRecord | null>(null);
  const [showPassengerModal, setShowPassengerModal] = useState(false);
  const [itineraryOpen, setItineraryOpen] = useState(false);
  const [alertData, setAlertData] = useState<{ origin: string; destination: string; departureDate: string; price: number } | null>(null);
  const [editingAlertId, setEditingAlertId] = useState<number | null>(null);
  const [savedAlerts, setSavedAlerts] = useState<AlertRecord[]>([]);
  const serverLoadedRef = useRef(false);
  // Set during page-load only; cleared once fired; prevents duplicate auto-sends
  type AutoSendPending = { convId: string; text: string; history: { role: string; content: string }[] };
  const needsAutoSendRef = useRef<AutoSendPending | null>(null);

  const { speak, stop, speaking, autoSpeak, toggleAutoSpeak } = useSpeech();

  // Ref so streaming callbacks always see the current activeId
  const activeIdRef   = useRef<string | null>(null);
  const autoSpeakRef  = useRef(autoSpeak);
  // Holds card data to attach to the next streaming assistant message
  const pendingFlightRef      = useRef<FlightSearchResult | null>(null);
  const pendingRoundTripRef   = useRef<RoundTripResult | null>(null);
  const pendingCalendarRef    = useRef<PriceCalendarResult | null>(null);
  const pendingHotelRef       = useRef<HotelSearchResult | null>(null);
  const pendingRestaurantRef  = useRef<RestaurantSearchResult | null>(null);
  const pendingBusRef         = useRef<BusSearchResult | null>(null);
  const pendingTrainRef       = useRef<TrainSearchResult | null>(null);
  const pendingWeatherRef     = useRef<WeatherResult | null>(null);
  const pendingVisaRef        = useRef<VisaResult | null>(null);

  autoSpeakRef.current = autoSpeak;
  activeIdRef.current  = activeId;

  /* ── Load conversations ─── */
  useEffect(() => {
    serverLoadedRef.current = false;
    const savedActiveId = (() => { try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; } })();

    function detectAutoSend(convs: Conversation[], targetId: string | null) {
      const conv = convs.find(c => c.id === targetId) ?? convs[0] ?? null;
      if (!conv) return;
      const msgs = conv.messages.filter(m => !m.streaming);
      const last  = msgs[msgs.length - 1];
      if (last?.role === "user" && !isConvStopped(conv.id)) {
        needsAutoSendRef.current = {
          convId:  conv.id,
          text:    last.content,
          history: msgs.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
        };
      }
    }

    if (!sync.enabled) {
      // Guest (not logged in): localStorage only
      const local = loadConversations(STORAGE_KEY);
      setConversations(local);
      if (savedActiveId && local.find(c => c.id === savedActiveId)) setActiveId(savedActiveId);
      detectAutoSend(local, savedActiveId);
      return;
    }

    // Logged in: DB is the single source of truth — never read localStorage for convs
    sync.loadPassengers().then(setSavedPassengers).catch(() => {});
    sync.loadAlerts().then(setSavedAlerts).catch(() => {});

    sync.loadConversations().then((serverConvs) => {
      serverLoadedRef.current = true;
      setConversations(serverConvs);
      const resolvedId = serverConvs.find(c => c.id === savedActiveId) ? savedActiveId : (serverConvs[0]?.id ?? null);
      setActiveId(prev => {
        if (serverConvs.find(c => c.id === prev)) return prev;
        return resolvedId;
      });
      detectAutoSend(serverConvs, resolvedId);
    }).catch(() => { serverLoadedRef.current = true; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [STORAGE_KEY, sync.enabled]);

  /* ── Persist: DB for logged-in users, localStorage for guests ─── */
  useEffect(() => {
    if (!sync.enabled && conversations.length > 0) {
      saveConversations(STORAGE_KEY, conversations);
    }
    // Always remember which chat was active (UX only — not conversation data)
    try { if (activeId) localStorage.setItem(ACTIVE_KEY, activeId); } catch {}
  }, [conversations, activeId, STORAGE_KEY, sync.enabled]);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;
  const messages = activeConversation?.messages ?? [];
  const hasCardData = messages.some(
    (m) => m.flightData || m.hotelData || m.restaurantData || m.busData || m.trainData
  );

  /* ── Update active conversation's messages ─── */
  const updateActive = useCallback((updater: (msgs: Message[]) => Message[]) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id !== activeIdRef.current
          ? c
          : { ...c, messages: updater(c.messages), updatedAt: Date.now() }
      )
    );
  }, []);

  /* ── Token streaming ─── */
  const appendToken = useCallback((token: string) => {
    // Transport results (flight/train/bus) are flushed together in markDone,
    // so all three are on the same message and TransportComparisonCard triggers.
    // Hotel, restaurant, calendar are immediate — attach on first token.
    const calendarData   = pendingCalendarRef.current ?? undefined;
    const hotelData      = pendingHotelRef.current ?? undefined;
    const restaurantData = pendingRestaurantRef.current ?? undefined;
    const weatherData    = pendingWeatherRef.current ?? undefined;
    const visaData       = pendingVisaRef.current    ?? undefined;
    if (calendarData)   pendingCalendarRef.current   = null;
    if (hotelData)      pendingHotelRef.current      = null;
    if (restaurantData) pendingRestaurantRef.current = null;
    if (weatherData)    pendingWeatherRef.current    = null;
    if (visaData)       pendingVisaRef.current       = null;

    const hasCard = !!(calendarData || hotelData || restaurantData || weatherData || visaData);
    updateActive((msgs) => {
      const last = msgs[msgs.length - 1];
      if (!hasCard && last?.role === "assistant" && last.streaming) {
        return [...msgs.slice(0, -1), { ...last, content: last.content + token }];
      }
      return [
        ...msgs,
        { id: `${Date.now()}`, role: "assistant" as const, content: token, streaming: true, timestamp: Date.now(), calendarData, hotelData, restaurantData, weatherData, visaData },
      ];
    });
  }, [updateActive]);

  const markDone = useCallback(() => {
    setTyping(false);
    setStreaming(false);
    // Flush transport refs — reading outside the updater avoids Strict Mode double-invoke
    const flightData    = pendingFlightRef.current    ?? undefined;
    const busData       = pendingBusRef.current       ?? undefined;
    const trainData     = pendingTrainRef.current     ?? undefined;
    const roundTripData = pendingRoundTripRef.current ?? undefined;
    pendingFlightRef.current    = null;
    pendingBusRef.current       = null;
    pendingTrainRef.current     = null;
    pendingRoundTripRef.current = null;

    setConversations((prev) => {
      const convId = activeIdRef.current;
      return prev.map((c) => {
        if (c.id !== convId) return c;
        const last = c.messages[c.messages.length - 1];
        // Attach all transport card data to the last message
        const finished = {
          ...(last ?? {}),
          streaming: false,
          ...(flightData    && { flightData }),
          ...(busData       && { busData }),
          ...(trainData     && { trainData }),
          ...(roundTripData && { roundTripData }),
        } as typeof last;
        if (last?.streaming && autoSpeakRef.current) speak(finished.content);
        const updated: Conversation = {
          ...c,
          messages:  last ? [...c.messages.slice(0, -1), finished] : c.messages,
          updatedAt: Date.now(),
        };
        // Fire-and-forget server save after each completed response
        sync.saveConversation(updated);
        return updated;
      });
    });
  }, [speak, sync]);

  /* ── WebSocket ─── */
  const { send, stop: stopWs, connected } = useWebSocket({
    onTyping:  () => { setTyping(true); setStreaming(false); setToolLabel(null); setToolName(null); },
    onToken:   (t) => { setTyping(false); setStreaming(true); setToolLabel(null); setToolName(null); appendToken(t); },
    onDone:    markDone,
    onError:   (msg) => {
      setTyping(false); setStreaming(false); setToolLabel(null);
      updateActive((msgs) => [
        ...msgs,
        { id: `err-${Date.now()}`, role: "assistant", content: `⚠️ ${msg}`, timestamp: Date.now() },
      ]);
    },
    onToolStart: (name, label) => { setTyping(false); setToolLabel(label); setToolName(name); },
    onFlightResults: (data) => {
      pendingFlightRef.current = data as FlightSearchResult;
      setToolLabel(null);
    },
    onCalendarResults: (data) => {
      pendingCalendarRef.current = data as PriceCalendarResult;
      setToolLabel(null);
    },
    onHotelResults: (data) => {
      pendingHotelRef.current = data as HotelSearchResult;
      setToolLabel(null);
    },
    onRestaurantResults: (data) => {
      pendingRestaurantRef.current = data as RestaurantSearchResult;
      setToolLabel(null);
    },
    onTrainResults: (data) => {
      pendingTrainRef.current = data as TrainSearchResult;
      setToolLabel(null);
    },
    onBusResults: (data) => {
      pendingBusRef.current = data as BusSearchResult;
      setToolLabel(null);
    },
    onRoundTripResults: (data) => {
      pendingRoundTripRef.current = data as RoundTripResult;
      setToolLabel(null);
    },
    onWeatherResults: (data) => {
      pendingWeatherRef.current = data as WeatherResult;
      setToolLabel(null);
    },
    onVisaResults: (data) => {
      pendingVisaRef.current = data as VisaResult;
      setToolLabel(null);
    },
  });

  const handleStop = useCallback(() => {
    const convId = activeIdRef.current;
    if (convId) markConvStopped(convId);
    stopWs();
    markDone();
  }, [stopWs, markDone]);

  /* ── Auto-resend on page reload (interrupted conversation) ─── */
  useEffect(() => {
    const pending = needsAutoSendRef.current;
    if (!pending || !connected || streaming || typing) return;
    if (activeId !== pending.convId) return;
    needsAutoSendRef.current = null;
    send(pending.text, pending.history as { role: "user" | "assistant"; content: string }[], {
      ...(userEmail ? { user_email: userEmail } : {}),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, activeId, streaming, typing]);

  /* ── Cmd+K global search shortcut ─── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  /* ── New conversation ─── */
  // Just clears the view. A real conversation is only created when
  // the user sends their first message (same behaviour as ChatGPT).
  const newChat = useCallback(() => {
    setActiveId(null);
    setInput("");
  }, []);

  /* ── Delete conversation ─── */
  const deleteChat = useCallback((id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    if (activeId === id) setActiveId(null);
    sync.deleteConversation(id);
  }, [activeId, STORAGE_KEY, sync]);

  /* ── Share conversation ─── */
  const handleShare = useCallback(async (id: string) => {
    const token = await sync.shareConversation(id);
    if (!token) { alert("Could not generate share link. Please try again."); return; }
    const url = `${window.location.origin}/share/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      alert("Share link copied to clipboard!");
    } catch {
      prompt("Copy this share link:", url);
    }
  }, [sync]);

  /* ── Export conversation as PDF ─── */
  const handleExport = useCallback(() => {
    if (!activeConversation || activeConversation.messages.length === 0) return;

    const esc = (s: unknown) =>
      String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const thStyle = `padding:7px 10px;text-align:left;font-weight:600;color:#475569;font-size:11px;text-transform:uppercase;`;
    const tdStyle = `padding:6px 10px;border-bottom:1px solid #e2e8f0;`;

    function flightTable(data: FlightSearchResult | undefined, label?: string): string {
      if (!data || data.results.length === 0) return "";
      const rows = data.results.slice(0, 5).map((f) => {
        const seg = f.segments[0];
        const route = seg
          ? `${esc(seg.from)} → ${esc(seg.to)}`
          : `${esc(data.origin)} → ${esc(data.destination)}`;
        const stops = f.stops === 0 ? "Non-stop" : `${f.stops} stop${f.stops > 1 ? "s" : ""}`;
        return `<tr>
          <td style="${tdStyle}">${esc(f.airline)}</td>
          <td style="${tdStyle}">${route}</td>
          <td style="${tdStyle}font-weight:600;">${esc(f.price)}</td>
          <td style="${tdStyle}">${esc(f.total_duration)}</td>
          <td style="${tdStyle}">${stops}</td>
        </tr>`;
      }).join("");
      return `<div style="margin:10px 0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <div style="padding:10px 14px;background:#f1f5f9;font-size:12px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:0.05em;">
          &#9992; ${esc(label ?? "Flights")} &mdash; ${esc(data.origin)} &rarr; ${esc(data.destination)}
          <span style="font-weight:400;color:#64748b;margin-left:8px;">${data.flights_found} results</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#f8fafc;">
            <th style="${thStyle}">Airline</th>
            <th style="${thStyle}">Route</th>
            <th style="${thStyle}">Price</th>
            <th style="${thStyle}">Duration</th>
            <th style="${thStyle}">Stops</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    }

    function hotelTable(data: HotelSearchResult | undefined): string {
      if (!data || data.results.length === 0) return "";
      const rows = data.results.slice(0, 5).map((h) =>
        `<tr>
          <td style="${tdStyle}font-weight:500;">${esc(h.name)}</td>
          <td style="${tdStyle}color:#b45309;">${h.rating} &#9733; <span style="color:#94a3b8;font-size:11px;">(${h.reviews} reviews)</span></td>
          <td style="${tdStyle}font-weight:600;">${esc(h.price)}</td>
          <td style="${tdStyle}color:#64748b;">${esc(h.hotel_class)}</td>
        </tr>`
      ).join("");
      return `<div style="margin:10px 0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <div style="padding:10px 14px;background:#f1f5f9;font-size:12px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:0.05em;">
          Hotels &mdash; ${esc(data.location)}
          <span style="font-weight:400;color:#64748b;margin-left:8px;">${data.hotels_found} results &middot; ${esc(data.check_in)} &rarr; ${esc(data.check_out)}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#f8fafc;">
            <th style="${thStyle}">Hotel</th>
            <th style="${thStyle}">Rating</th>
            <th style="${thStyle}">Price</th>
            <th style="${thStyle}">Class</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    }

    function weatherSection(data: WeatherResult | undefined): string {
      if (!data || data.error) return "";
      const forecastRows = data.forecast.slice(0, 3).map((d) =>
        `<tr>
          <td style="${tdStyle}">${esc(d.date)}</td>
          <td style="${tdStyle}">${esc(d.description)}</td>
          <td style="${tdStyle}">${d.max_temp_c}&deg; / ${d.min_temp_c}&deg;C</td>
          <td style="${tdStyle}">${d.rain_mm} mm</td>
          <td style="${tdStyle}">${d.humidity}%</td>
        </tr>`
      ).join("");
      return `<div style="margin:10px 0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <div style="padding:10px 14px;background:#f1f5f9;font-size:12px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:0.05em;">
          Weather &mdash; ${esc(data.location)}
        </div>
        <div style="padding:10px 14px;font-size:13px;color:#334155;border-bottom:1px solid #e2e8f0;">
          <strong>${data.temp_c}&deg;C</strong> &middot; ${esc(data.description)} &middot;
          Feels like ${data.feels_like_c}&deg;C &middot; Humidity ${data.humidity}% &middot; Wind ${data.wind_kmph} km/h
        </div>
        ${forecastRows ? `<table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#f8fafc;">
            <th style="${thStyle}">Date</th>
            <th style="${thStyle}">Conditions</th>
            <th style="${thStyle}">Temp</th>
            <th style="${thStyle}">Rain</th>
            <th style="${thStyle}">Humidity</th>
          </tr></thead>
          <tbody>${forecastRows}</tbody>
        </table>` : ""}
      </div>`;
    }

    let cardCount = 0;
    const rows = activeConversation.messages
      .filter((m) => !m.streaming)
      .map((m) => {
        const isUser = m.role === "user";
        const who = isUser ? "You" : "Plan Advisor";
        const text = m.content
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>");

        let cards = "";
        if (m.roundTripData) {
          cards += flightTable(m.roundTripData.outbound, "Outbound Flight");
          cards += flightTable(m.roundTripData.return_flight, "Return Flight");
        } else if (m.flightData) {
          cards += flightTable(m.flightData);
        }
        if (m.hotelData) cards += hotelTable(m.hotelData);
        if (m.weatherData) cards += weatherSection(m.weatherData);

        const hasCards = cards.length > 0;
        // Page break before every card-bearing message except the first
        const breakStyle = hasCards && cardCount++ > 0 ? "page-break-before:always;" : "";

        return `<div style="${breakStyle}margin:16px 0;padding:14px 18px;border-radius:10px;background:${isUser ? "#eef2ff" : "#ffffff"};border:1px solid ${isUser ? "#c7d2fe" : "#e2e8f0"};">
          <div style="font-size:11px;font-weight:700;color:${isUser ? "#4f46e5" : "#64748b"};margin-bottom:8px;text-transform:uppercase;letter-spacing:0.06em;">${who}</div>
          ${text ? `<div style="font-size:14px;color:#1e293b;line-height:1.7;margin-bottom:${hasCards ? "12px" : "0"};">${text}</div>` : ""}
          ${cards}
        </div>`;
      }).join("");

    const exportDate = new Date().toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(activeConversation.title)} &mdash; Plan Advisor Trip Report</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px 44px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      line-height: 1.5;
    }
    @media print {
      body { background: #ffffff; padding: 20px 28px; }
    }
  </style>
</head>
<body>
  <div style="margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #e2e8f0;">
    <div style="font-size:11px;font-weight:700;color:#6366f1;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">Plan Advisor &middot; Trip Report</div>
    <h1 style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#0f172a;">${esc(activeConversation.title)}</h1>
    <div style="font-size:12px;color:#94a3b8;">Exported on ${exportDate}</div>
  </div>
  ${rows}
  <script>window.onload = () => window.print();<\/script>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  }, [activeConversation]);

  /* ── Pin / unpin a conversation ─── */
  const pinConversation = useCallback((id: string) => {
    setConversations(prev => {
      const next = prev.map(c => {
        if (c.id !== id) return c;
        const updated: Conversation = { ...c, pinned: !c.pinned };
        sync.saveConversation(updated);
        return updated;
      });
      return next;
    });
  }, [sync]);

  const reloadAlerts = useCallback(() => {
    sync.loadAlerts().then(setSavedAlerts).catch(() => {});
  }, [sync]);

  const handleDeleteAlert = useCallback(async (id: number) => {
    await sync.deleteAlert(id);
    setSavedAlerts(prev => prev.filter(a => a.id !== id));
  }, [sync]);

  const handleEditAlert = useCallback((alert: AlertRecord) => {
    setEditingAlertId(alert.id);
    setAlertData({
      origin: alert.origin,
      destination: alert.destination,
      departureDate: alert.departure_date,
      price: alert.threshold_inr,
    });
  }, []);

  const renameChat = useCallback((id: string, title: string) => {
    setConversations(prev => {
      const next = prev.map(c => c.id === id ? { ...c, title } : c);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      const updated = next.find(c => c.id === id);
      if (updated) sync.saveConversation(updated);   // persist new title to DB
      return next;
    });
  }, [STORAGE_KEY, sync]);

  /* ── Send message ─── */
  const handleSend = useCallback((text?: string) => {
    const txt = (text ?? input).trim();
    if (!txt || !connected || streaming || typing) return;

    // Ensure there's an active conversation
    let convId = activeIdRef.current;
    const isNewConv = !convId;
    // User is sending — clear any "stopped" marker so future reloads can auto-resend if needed
    if (convId) clearConvStopped(convId);
    if (!convId) {
      const conv: Conversation = {
        id: makeId(),
        title: txt.length > 45 ? txt.slice(0, 42) + "…" : txt,
        messages: [], createdAt: Date.now(), updatedAt: Date.now(),
      };
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
      activeIdRef.current = conv.id;
      convId = conv.id;
    }

    const userMsg: Message = {
      id: `u-${Date.now()}`, role: "user", content: txt, timestamp: Date.now(),
    };

    // Add user message + auto-title on first message
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        const isFirst = c.messages.length === 0;
        return {
          ...c,
          title: isFirst ? (txt.length > 45 ? txt.slice(0, 42) + "…" : txt) : c.title,
          messages: [...c.messages, userMsg],
          updatedAt: Date.now(),
        };
      })
    );

    // Persist to DB the moment the user sends — don't wait for AI response.
    // This guarantees every conversation exists in the DB even if the AI fails.
    const existingMsgs = activeConversation?.messages ?? [];
    sync.saveConversation({
      id: convId,
      title: (isNewConv || existingMsgs.length === 0)
        ? (txt.length > 45 ? txt.slice(0, 42) + "…" : txt)
        : (activeConversation?.title ?? ""),
      messages: [...existingMsgs, userMsg],
      createdAt: activeConversation?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      pinned: activeConversation?.pinned,
    });

    setInput("");

    // Send text + history (without the message just added)
    const history = (activeConversation?.messages ?? []).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Inject saved passengers as context so AI can refer to them by name
    const passengerContext = savedPassengers.length > 0
      ? savedPassengers.map(p => {
          const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.label;
          return `${name} (${p.label}): passport ${p.passport_number}, DOB ${p.date_of_birth}, nationality ${p.nationality}, expiry ${p.expiry_date}, gender ${p.gender}`;
        }).join("\n")
      : null;

    send(txt, history, {
      ...(passengerContext ? { passenger_context: passengerContext } : {}),
      ...(userEmail ? { user_email: userEmail } : {}),
      ...(userLocation ? { user_location: userLocation.label } : {}),
    });
  }, [input, connected, streaming, typing, activeConversation, send, sync]);

  /* ── Voice input ─── */
  const { recording, toggleRecording } = useVoiceInput({
    onTranscript: (text) => setInput(text),
    onError: (msg) =>
      updateActive((msgs) => [
        ...msgs,
        { id: `v-${Date.now()}`, role: "assistant", content: `🎙️ ${msg}`, timestamp: Date.now() },
      ]),
  });

  /* ── Drag-and-drop passport handler ─── */
  const isPassportFile = (f: { type: string; name?: string }) =>
    f.type.startsWith("image/") || f.type === "application/pdf" || (f.name ?? "").toLowerCase().endsWith(".pdf");

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const item = e.dataTransfer.items[0];
    if (item && isPassportFile({ type: item.type })) setDragOver(true);
  };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && isPassportFile(file)) setPassportFile(file);
  };

  return (
    <div
      className="flex h-full bg-slate-950 text-slate-100 overflow-hidden relative pb-0"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >

      {/* ── Drag-over overlay ── */}
      {dragOver && (
        <div className="absolute inset-0 z-40 bg-indigo-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 pointer-events-none border-4 border-dashed border-indigo-400/60 rounded-none">
          <div className="text-6xl animate-bounce">📷</div>
          <p className="text-xl font-bold text-indigo-200">Drop passport photo or PDF to scan</p>
          <p className="text-sm text-indigo-400">Your details will auto-fill instantly</p>
        </div>
      )}

      {/* ── Passenger modal (upload / add / edit) ── */}
      {(showPassengerModal || passportFile) && (
        <PassengerFormModal
          initialFile={passportFile}
          initialPassengerId={editingPassenger?.id}
          onClose={() => { setPassportFile(null); setEditingPassenger(null); setShowPassengerModal(false); }}
          onPassengersChange={setSavedPassengers}
        />
      )}

      {/* ── Price alert modal ── */}
      {alertData && (
        <PriceAlertModal
          origin={alertData.origin}
          destination={alertData.destination}
          departureDate={alertData.departureDate}
          currentPrice={alertData.price}
          userEmail={userEmail}
          onClose={() => { setAlertData(null); setEditingAlertId(null); }}
          onSuccess={() => {
            if (editingAlertId !== null) {
              sync.deleteAlert(editingAlertId);
              setSavedAlerts(prev => prev.filter(a => a.id !== editingAlertId));
            }
            reloadAlerts();
          }}
        />
      )}

      {/* ── Sidebar ── */}
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={newChat}
        onDelete={deleteChat}
        onRename={renameChat}
        onPin={pinConversation}
        onShare={handleShare}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        alerts={savedAlerts}
        onDeleteAlert={handleDeleteAlert}
        onEditAlert={handleEditAlert}
        passengers={savedPassengers}
        onEditPassenger={(p) => { setEditingPassenger(p); setShowPassengerModal(true); }}
        onDeletePassenger={(id) => {
          sync.deletePassenger(id);
          setSavedPassengers(prev => prev.filter(p => p.id !== id));
        }}
        onAddPassenger={() => { setEditingPassenger(null); setShowPassengerModal(true); }}
        sessionUser={session?.user}
        theme={theme}
        onToggleTheme={toggleTheme}
        connected={connected}
        onSignOut={() => signOut({ callbackUrl: "/login" })}
      />

      {/* ── Itinerary sidebar ── */}
      <ItinerarySidebar
        messages={messages}
        isOpen={itineraryOpen}
        onClose={() => setItineraryOpen(false)}
      />

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0 relative">

        {/* Open sidebar button — visible on all sizes when sidebar is closed */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            title="Open sidebar"
            className="absolute top-3 left-3 z-20 w-8 h-8 flex items-center justify-center rounded-lg
              text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors backdrop-blur-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
            </svg>
          </button>
        )}

        {/* Top-right action buttons — visible only when a conversation is active */}
        {activeConversation && activeConversation.messages.length > 0 && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
            {/* Trip Summary toggle — only when card data exists */}
            {hasCardData && (
              <button
                onClick={() => setItineraryOpen((v) => !v)}
                title="Trip summary"
                className="flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 rounded-lg text-xs font-medium
                  text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors backdrop-blur-sm border border-transparent hover:border-slate-700/60"
              >
                🗺️ <span className="hidden sm:inline">Summary</span>
              </button>
            )}
            <button
              onClick={handleExport}
              title="Export as PDF"
              className="flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 rounded-lg text-xs font-medium
                text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors backdrop-blur-sm border border-transparent hover:border-slate-700/60"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        )}

        {/* Chat area */}
        <ChatWindow
          messages={messages}
          typing={typing}
          streaming={streaming}
          toolLabel={toolLabel}
          toolName={toolName}
          onSuggestion={(text) => handleSend(text)}
          onAction={(text) => handleSend(text)}
          onSpeak={speak}
          onStopSpeak={stop}
          speaking={speaking}
          onSetAlert={setAlertData}
        />

        {/* Input */}
        <InputBar
          value={input}
          onChange={setInput}
          onSend={() => handleSend()}
          onStop={handleStop}
          onToggleMic={toggleRecording}
          recording={recording}
          disabled={!connected || streaming || typing}
          onPassportUpload={(file) => setPassportFile(file)}
        />
      </div>

      {/* ── Global conversation search (⌘K) ── */}
      {searchOpen && (
        <ConversationSearchModal
          conversations={conversations}
          onSelect={(id) => { setActiveId(id); setSidebarOpen(true); }}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
}
