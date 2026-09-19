"use client";

import { useState, useCallback, useEffect, useRef, DragEvent } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
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
import type { AlertRecord, SavedTrip, UserPreferences } from "@/hooks/useServerSync";
import OnboardingModal from "@/components/OnboardingModal";
import PackingEssentialsEditor from "@/components/PackingEssentialsEditor";
import { useTheme } from "@/hooks/useTheme";
import { useUserLocation } from "@/hooks/useUserLocation";
import type { FlightSearchResult, PriceCalendarResult, RoundTripResult } from "@/types/flights";
import type { HotelSearchResult, RestaurantSearchResult } from "@/types/places";
import type { BusSearchResult } from "@/types/buses";
import type { TrainSearchResult } from "@/types/transport";
import type { WeatherResult } from "@/types/weather";
import type { VisaResult } from "@/types/visa";
import type { DestinationGuide } from "@/types/destination";
import type { CurrencyResult } from "@/types/currency";
import type { TripBudget } from "@/types/budget";
import type { Itinerary } from "@/types/itinerary";
import type { PricePrediction } from "@/types/prediction";
import type { PackingList } from "@/types/packingList";
import type { FlightStatus } from "@/types/flightStatus";
import type { AirportTransit } from "@/types/transit";
import type { Phrasebook } from "@/types/phrasebook";
import type { TravelInsurance } from "@/types/insurance";
import type { GroupSplit } from "@/types/expenseSplit";
import type { TripTimeline } from "@/types/timeline";
import type { HotelComparison } from "@/types/hotelComparison";
import type { LocalEvents } from "@/types/localEvents";
import type { DocumentCheck } from "@/types/documentCheck";
import type { TripRecap } from "@/types/tripRecap";
import type { LayoverGuide } from "@/types/layoverGuide";
import type { WeatherForecast } from "@/types/weatherForecast";
import type { GroupTripPlan } from "@/types/groupTrip";
import type { NearbyAttractions } from "@/types/attractions";
import type { BaggagePolicy } from "@/types/baggagePolicy";
import type { PredepartureChecklist } from "@/types/predepartureChecklist";
import ItinerarySidebar from "@/components/ItinerarySidebar";
import PriceAlertModal from "@/components/PriceAlertModal";
import { exportCleanText, exportFilename, buildPrintHTML } from "@/utils/exportUtils";

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
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userEmail = session?.user?.email ?? null;

  // Redirect agents away from the traveller chat view
  useEffect(() => {
    if (status !== "authenticated" || !userEmail) return;
    fetch(`${API}/api/agent/check`, { headers: { "X-User-Email": userEmail } })
      .then(r => r.json())
      .then(d => { if (d.is_agent) router.replace("/agent/dashboard"); })
      .catch(() => {});
  }, [status, userEmail, router]);
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
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [userPrefs, setUserPrefs] = useState<UserPreferences | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEssentialsEditor, setShowEssentialsEditor] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
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
  const pendingGuideRef       = useRef<DestinationGuide | null>(null);
  const pendingCurrencyRef    = useRef<CurrencyResult | null>(null);
  const pendingBudgetRef      = useRef<TripBudget | null>(null);
  const pendingItineraryRef   = useRef<Itinerary | null>(null);
  const pendingPredictionRef  = useRef<PricePrediction | null>(null);
  const pendingPackingRef     = useRef<PackingList | null>(null);
  const pendingFlightStatusRef = useRef<FlightStatus | null>(null);
  const pendingTransitRef      = useRef<AirportTransit | null>(null);
  const pendingPhrasebookRef   = useRef<Phrasebook | null>(null);
  const pendingInsuranceRef    = useRef<TravelInsurance | null>(null);
  const pendingTimelineRef     = useRef<TripTimeline | null>(null);
  const pendingSplitRef        = useRef<GroupSplit | null>(null);
  const pendingHotelComparisonRef = useRef<HotelComparison | null>(null);
  const pendingEventsRef          = useRef<LocalEvents | null>(null);
  const pendingDocumentCheckRef   = useRef<DocumentCheck | null>(null);
  const pendingRecapRef           = useRef<TripRecap | null>(null);
  const pendingLayoverRef         = useRef<LayoverGuide | null>(null);
  const pendingForecastRef        = useRef<WeatherForecast | null>(null);
  const pendingGroupTripRef       = useRef<GroupTripPlan | null>(null);
  const pendingAttractionsRef     = useRef<NearbyAttractions | null>(null);
  const pendingBaggageRef         = useRef<BaggagePolicy | null>(null);
  const pendingChecklistRef       = useRef<PredepartureChecklist | null>(null);

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
    sync.loadTrips().then(setSavedTrips).catch(() => {});
    sync.loadPreferences().then((prefs) => {
      if (prefs) {
        setUserPrefs(prefs);
        if (!prefs.onboarding_done) setShowOnboarding(true);
      } else {
        setShowOnboarding(true);
      }
    }).catch(() => { setShowOnboarding(true); });

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
      // Mirror to service worker cache so conversations survive offline reloads
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "CACHE_CONVERSATIONS",
          key: STORAGE_KEY,
          data: conversations,
        });
      }
    }
    // Always remember which chat was active (UX only — not conversation data)
    try { if (activeId) localStorage.setItem(ACTIVE_KEY, activeId); } catch {}
  }, [conversations, activeId, STORAGE_KEY, sync.enabled]);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;
  const messages = activeConversation?.messages ?? [];
  // Messages from up to 3 recent conversations (excluding active) — used to personalize empty state suggestions
  const recentMessages = conversations
    .filter((c) => c.id !== activeId)
    .slice(0, 3)
    .flatMap((c) => c.messages ?? []);
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
    const weatherData    = pendingWeatherRef.current    ?? undefined;
    const visaData       = pendingVisaRef.current       ?? undefined;
    const guideData      = pendingGuideRef.current      ?? undefined;
    const currencyData   = pendingCurrencyRef.current   ?? undefined;
    const itineraryData  = pendingItineraryRef.current  ?? undefined;
    const packingData       = pendingPackingRef.current       ?? undefined;
    const flightStatusData  = pendingFlightStatusRef.current  ?? undefined;
    const transitData       = pendingTransitRef.current       ?? undefined;
    const phrasebookData    = pendingPhrasebookRef.current    ?? undefined;
    const insuranceData     = pendingInsuranceRef.current     ?? undefined;
    const timelineData      = pendingTimelineRef.current      ?? undefined;
    const splitData              = pendingSplitRef.current              ?? undefined;
    const hotelComparisonData    = pendingHotelComparisonRef.current    ?? undefined;
    const eventsData             = pendingEventsRef.current             ?? undefined;
    const documentCheckData      = pendingDocumentCheckRef.current      ?? undefined;
    const recapData              = pendingRecapRef.current              ?? undefined;
    const layoverData            = pendingLayoverRef.current            ?? undefined;
    const forecastData           = pendingForecastRef.current           ?? undefined;
    const groupTripData          = pendingGroupTripRef.current          ?? undefined;
    const attractionsData        = pendingAttractionsRef.current        ?? undefined;
    const baggageData            = pendingBaggageRef.current            ?? undefined;
    const checklistData          = pendingChecklistRef.current          ?? undefined;
    if (calendarData)      pendingCalendarRef.current      = null;
    if (hotelData)         pendingHotelRef.current         = null;
    if (restaurantData)    pendingRestaurantRef.current    = null;
    if (weatherData)       pendingWeatherRef.current       = null;
    if (visaData)          pendingVisaRef.current          = null;
    if (guideData)         pendingGuideRef.current         = null;
    if (currencyData)      pendingCurrencyRef.current      = null;
    if (itineraryData)     pendingItineraryRef.current     = null;
    if (packingData)       pendingPackingRef.current       = null;
    if (flightStatusData)  pendingFlightStatusRef.current  = null;
    if (transitData)       pendingTransitRef.current       = null;
    if (phrasebookData)    pendingPhrasebookRef.current    = null;
    if (insuranceData)     pendingInsuranceRef.current     = null;
    if (timelineData)      pendingTimelineRef.current      = null;
    if (splitData)              pendingSplitRef.current              = null;
    if (hotelComparisonData)    pendingHotelComparisonRef.current    = null;
    if (eventsData)             pendingEventsRef.current             = null;
    if (documentCheckData)      pendingDocumentCheckRef.current      = null;
    if (recapData)              pendingRecapRef.current              = null;
    if (layoverData)            pendingLayoverRef.current            = null;
    if (forecastData)           pendingForecastRef.current           = null;
    if (groupTripData)          pendingGroupTripRef.current          = null;
    if (attractionsData)        pendingAttractionsRef.current        = null;
    if (baggageData)            pendingBaggageRef.current            = null;
    if (checklistData)          pendingChecklistRef.current          = null;

    const hasCard = !!(calendarData || hotelData || restaurantData || weatherData || visaData || guideData || currencyData || itineraryData || packingData || flightStatusData || transitData || phrasebookData || insuranceData || timelineData || splitData || hotelComparisonData || eventsData || documentCheckData || recapData || layoverData || forecastData || groupTripData || attractionsData || baggageData || checklistData);
    updateActive((msgs) => {
      const last = msgs[msgs.length - 1];
      if (!hasCard && last?.role === "assistant" && last.streaming) {
        return [...msgs.slice(0, -1), { ...last, content: last.content + token }];
      }
      return [
        ...msgs,
        { id: `${Date.now()}`, role: "assistant" as const, content: token, streaming: true, timestamp: Date.now(), calendarData, hotelData, restaurantData, weatherData, visaData, guideData, currencyData, itineraryData, packingData, flightStatusData, transitData, phrasebookData, insuranceData, timelineData, splitData, hotelComparisonData, eventsData, documentCheckData, recapData, layoverData, forecastData, groupTripData, attractionsData, baggageData, checklistData },
      ];
    });
  }, [updateActive]);

  const markDone = useCallback(() => {
    setTyping(false);
    setStreaming(false);
    // Flush transport refs — reading outside the updater avoids Strict Mode double-invoke
    const flightData      = pendingFlightRef.current      ?? undefined;
    const busData         = pendingBusRef.current         ?? undefined;
    const trainData       = pendingTrainRef.current       ?? undefined;
    const roundTripData   = pendingRoundTripRef.current   ?? undefined;
    const budgetData      = pendingBudgetRef.current      ?? undefined;
    const predictionData  = pendingPredictionRef.current  ?? undefined;
    pendingFlightRef.current      = null;
    pendingBusRef.current         = null;
    pendingTrainRef.current       = null;
    pendingRoundTripRef.current   = null;
    pendingBudgetRef.current      = null;
    pendingPredictionRef.current  = null;

    setConversations((prev) => {
      const convId = activeIdRef.current;
      return prev.map((c) => {
        if (c.id !== convId) return c;
        const last = c.messages[c.messages.length - 1];
        // Attach all transport card data to the last message
        const finished = {
          ...(last ?? {}),
          streaming: false,
          ...(flightData      && { flightData }),
          ...(busData         && { busData }),
          ...(trainData       && { trainData }),
          ...(roundTripData   && { roundTripData }),
          ...(budgetData      && { budgetData }),
          ...(predictionData  && { predictionData }),
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
    onGuideResults: (data) => {
      pendingGuideRef.current = data as DestinationGuide;
      setToolLabel(null);
    },
    onCurrencyResults: (data) => {
      pendingCurrencyRef.current = data as CurrencyResult;
      setToolLabel(null);
    },
    onBudgetResults: (data) => {
      pendingBudgetRef.current = data as TripBudget;
      setToolLabel(null);
    },
    onPredictionResults: (data) => {
      pendingPredictionRef.current = data as PricePrediction;
      setToolLabel(null);
    },
    onItineraryResults: (data) => {
      pendingItineraryRef.current = data as Itinerary;
      setToolLabel(null);
    },
    onPackingResults: (data) => {
      pendingPackingRef.current = data as PackingList;
      setToolLabel(null);
      try { localStorage.setItem("plan-advisor-last-packing", JSON.stringify(data)); } catch {}
    },
    onFlightStatusResults: (data) => {
      pendingFlightStatusRef.current = data as FlightStatus;
      setToolLabel(null);
    },
    onTransitResults: (data) => {
      pendingTransitRef.current = data as AirportTransit;
      setToolLabel(null);
    },
    onPhrasebookResults: (data) => {
      pendingPhrasebookRef.current = data as Phrasebook;
      setToolLabel(null);
    },
    onInsuranceResults: (data) => {
      pendingInsuranceRef.current = data as TravelInsurance;
      setToolLabel(null);
    },
    onTimelineResults: (data) => {
      pendingTimelineRef.current = data as TripTimeline;
      setToolLabel(null);
    },
    onSplitResults: (data) => {
      pendingSplitRef.current = data as GroupSplit;
      setToolLabel(null);
    },
    onHotelComparisonResults: (data) => {
      pendingHotelComparisonRef.current = data as HotelComparison;
      setToolLabel(null);
    },
    onEventsResults: (data) => {
      pendingEventsRef.current = data as LocalEvents;
      setToolLabel(null);
    },
    onDocumentCheckResults: (data) => {
      pendingDocumentCheckRef.current = data as DocumentCheck;
      setToolLabel(null);
    },
    onRecapResults: (data) => {
      pendingRecapRef.current = data as TripRecap;
      setToolLabel(null);
    },
    onLayoverResults: (data) => {
      pendingLayoverRef.current = data as LayoverGuide;
      setToolLabel(null);
    },
    onForecastResults: (data) => {
      pendingForecastRef.current = data as WeatherForecast;
      setToolLabel(null);
    },
    onGroupTripResults: (data) => {
      pendingGroupTripRef.current = data as GroupTripPlan;
      setToolLabel(null);
      try { localStorage.setItem("plan-advisor-last-group-trip", JSON.stringify(data)); } catch {}
    },
    onAttractionsResults: (data) => {
      pendingAttractionsRef.current = data as NearbyAttractions;
      setToolLabel(null);
    },
    onBaggageResults: (data) => {
      pendingBaggageRef.current = data as BaggagePolicy;
      setToolLabel(null);
    },
    onChecklistResults: (data) => {
      pendingChecklistRef.current = data as PredepartureChecklist;
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

  /* ── Online/offline detection ─── */
  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  /* ── Service worker registration ─── */
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
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

  /* ── Export conversation as clean plain text ─── */
  const handleExport = useCallback(() => {
    if (!activeConversation || activeConversation.messages.length === 0) return;
    const text = exportCleanText(activeConversation.messages);
    const filename = exportFilename(activeConversation.messages);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeConversation]);

  /* ── Export conversation as print-ready PDF ─── */
  const handlePrintExport = useCallback(() => {
    if (!activeConversation || activeConversation.messages.length === 0) return;
    const html = buildPrintHTML(activeConversation.messages);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.onload = () => win.print();
    }
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

  /* ── Saved trips ─── */
  const handleSaveTrip = useCallback(async (
    tripData: Record<string, unknown>,
    name: string,
    destination: string,
    dateRange: string,
  ) => {
    const saved = await sync.saveTrip({ name, destination, date_range: dateRange, data: tripData });
    if (saved) setSavedTrips(prev => [saved, ...prev]);
  }, [sync]);

  const handleRecallTrip = useCallback(async (tripId: number) => {
    const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    try {
      const resp = await fetch(`${API}/api/trips/${tripId}`, {
        headers: { "X-User-Email": userEmail! },
      });
      if (!resp.ok) return;
      const trip = await resp.json() as SavedTrip & { data: Record<string, unknown> };
      const d = trip.data ?? {};

      // Ensure there's an active conversation to append to
      let convId = activeId;
      if (!convId) {
        const conv = {
          id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: trip.name,
          messages: [] as Message[],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setConversations(prev => [conv, ...prev]);
        setActiveId(conv.id);
        convId = conv.id;
      }

      const recallMsg: Message = {
        id:             `recall-${Date.now()}`,
        role:           "assistant",
        content:        `Here's your saved trip to **${trip.destination || trip.name}**:`,
        timestamp:      Date.now(),
        ...(d.flightData     ? { flightData:     d.flightData     as Message["flightData"] }     : {}),
        ...(d.hotelData      ? { hotelData:      d.hotelData      as Message["hotelData"] }      : {}),
        ...(d.guideData      ? { guideData:      d.guideData      as Message["guideData"] }      : {}),
        ...(d.budgetData     ? { budgetData:     d.budgetData     as Message["budgetData"] }     : {}),
        ...(d.itineraryData  ? { itineraryData:  d.itineraryData  as Message["itineraryData"] }  : {}),
        ...(d.weatherData    ? { weatherData:    d.weatherData    as Message["weatherData"] }    : {}),
        ...(d.predictionData ? { predictionData: d.predictionData as Message["predictionData"] } : {}),
        ...(d.roundTripData  ? { roundTripData:  d.roundTripData  as Message["roundTripData"] }  : {}),
      };

      setConversations(prev => prev.map(c =>
        c.id !== convId ? c : { ...c, messages: [...c.messages, recallMsg], updatedAt: Date.now() }
      ));
    } catch {}
  }, [activeId, userEmail]);

  const handleDeleteTrip = useCallback(async (tripId: number) => {
    await sync.deleteTrip(tripId);
    setSavedTrips(prev => prev.filter(t => t.id !== tripId));
  }, [sync]);

  const handleShareTrip = useCallback(async (tripId: number): Promise<string | null> => {
    const shareUrl = await sync.shareTrip(tripId);
    return shareUrl;
  }, [sync]);

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
      ...(userPrefs ? {
        user_preferences: {
          nationality:        userPrefs.nationality,
          home_city:          userPrefs.home_city,
          home_iata:          userPrefs.home_iata,
          currency:           userPrefs.currency,
          travel_style:       userPrefs.travel_style,
          passport_expiry:    userPrefs.passport_expiry ?? "",
          packing_essentials: userPrefs.packing_essentials ?? [],
        },
      } : {}),
    });
  }, [input, connected, streaming, typing, activeConversation, send, sync, userPrefs]);

  /* ── Onboarding ─── */
  const handleOnboardingComplete = useCallback(async (prefs: UserPreferences) => {
    const completed = { ...prefs, onboarding_done: true };
    await sync.savePreferences(completed);
    setUserPrefs(completed);
    setShowOnboarding(false);
  }, [sync]);

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
        <div className="absolute inset-0 z-40 bg-[#172554]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 pointer-events-none border-4 border-dashed border-[#1e40af]/60 rounded-none">
          <div className="text-6xl animate-bounce">📷</div>
          <p className="text-xl font-bold text-[#d4a017]">Drop passport photo or PDF to scan</p>
          <p className="text-sm text-[#d4a017]">Your details will auto-fill instantly</p>
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

      {/* ── Onboarding modal ── */}
      {showOnboarding && userEmail && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}

      {/* ── Packing essentials editor ── */}
      {showEssentialsEditor && userEmail && (
        <PackingEssentialsEditor
          userEmail={userEmail}
          initialEssentials={userPrefs?.packing_essentials ?? []}
          currentPrefs={{
            nationality:    userPrefs?.nationality ?? "India",
            home_city:      userPrefs?.home_city ?? "",
            home_iata:      userPrefs?.home_iata ?? "",
            currency:       userPrefs?.currency ?? "INR",
            travel_style:   userPrefs?.travel_style ?? "",
            passport_expiry: userPrefs?.passport_expiry ?? "",
            onboarding_done: userPrefs?.onboarding_done ?? false,
          }}
          onClose={() => setShowEssentialsEditor(false)}
          onSave={(items) => {
            setUserPrefs((prev) => prev ? { ...prev, packing_essentials: items } : prev);
          }}
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
        savedTrips={savedTrips}
        onRecallTrip={handleRecallTrip}
        onDeleteTrip={handleDeleteTrip}
        onShareTrip={handleShareTrip}
        onEmailTrip={async (id, toEmail, message) => sync.emailTrip(id, toEmail, message)}
        onAddCollaborator={async (id, email) => {
          const ok = await sync.addCollaborator(id, email);
          if (ok) setSavedTrips(prev => prev.map(t =>
            t.id !== id ? t : { ...t, collaborators: [...(t.collaborators ?? []).filter(e => e !== email), email] }
          ));
          return ok;
        }}
        onRemoveCollaborator={async (id, email) => {
          const ok = await sync.removeCollaborator(id, email);
          if (ok) setSavedTrips(prev => prev.map(t =>
            t.id !== id ? t : { ...t, collaborators: (t.collaborators ?? []).filter(e => e !== email) }
          ));
          return ok;
        }}
        userEmail={userEmail}
        sessionUser={session?.user}
        theme={theme}
        onToggleTheme={toggleTheme}
        connected={connected}
        onSignOut={() => signOut({ callbackUrl: "/login" })}
        onEditPreferences={() => setShowOnboarding(true)}
        onEditEssentials={userEmail ? () => setShowEssentialsEditor(true) : undefined}
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
              title="Export conversation as plain text"
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
            <button
              onClick={handlePrintExport}
              title="Export as printable PDF"
              className="flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 rounded-lg text-xs font-medium
                text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors backdrop-blur-sm border border-transparent hover:border-slate-700/60"
            >
              🖨️ <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        )}

        {/* Offline banner — shown below the toolbar when there's no connection */}
        {!isOnline && (
          <div className="bg-amber-900/40 border-b border-amber-700/40 px-4 py-2 text-sm text-amber-300 flex items-center gap-2">
            <span>📵</span>
            <span>You&rsquo;re offline — saved trips and conversations are still available. New searches will resume when connected.</span>
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
          onSaveTrip={handleSaveTrip}
          userEssentials={userPrefs?.packing_essentials ?? []}
          recentMessages={recentMessages}
        />

        {/* Input */}
        <InputBar
          value={input}
          onChange={setInput}
          onSend={() => handleSend()}
          onStop={handleStop}
          onToggleMic={toggleRecording}
          recording={recording}
          disabled={!connected || streaming || typing || !isOnline}
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
