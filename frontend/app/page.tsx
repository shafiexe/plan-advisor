"use client";

import { useState, useCallback, useEffect, useRef, DragEvent } from "react";
import { useSession, signOut } from "next-auth/react";
import ChatWindow from "@/components/ChatWindow";
import InputBar from "@/components/InputBar";
import ConversationSidebar, { Conversation } from "@/components/ConversationSidebar";
import PassengerFormModal from "@/components/PassengerFormModal";
import type { PassengerRecord } from "@/components/PassengerFormModal";
import { Message } from "@/components/MessageBubble";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useSpeech } from "@/hooks/useSpeech";
import { useServerSync } from "@/hooks/useServerSync";
import { useTheme } from "@/hooks/useTheme";
import type { FlightSearchResult, PriceCalendarResult } from "@/types/flights";
import type { HotelSearchResult, RestaurantSearchResult } from "@/types/places";
import type { BusSearchResult } from "@/types/buses";
import type { TrainSearchResult } from "@/types/transport";

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

/* ── Component ───────────────────────────────────────────── */
export default function Home() {
  const { data: session } = useSession();
  const userEmail = session?.user?.email ?? null;
  const userKey   = userEmail ?? "guest";
  const STORAGE_KEY = `plan-advisory-${userKey}-conversations`;
  const ACTIVE_KEY  = `plan-advisory-${userKey}-active-id`;

  const sync = useServerSync(userEmail);
  const { theme, toggle: toggleTheme } = useTheme();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId]           = useState<string | null>(null);
  const [input, setInput]                 = useState("");
  const [typing, setTyping]               = useState(false);
  const [streaming, setStreaming]         = useState(false);
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [toolLabel, setToolLabel]         = useState<string | null>(null);
  const [toolName, setToolName]           = useState<string | null>(null);
  const [passportFile, setPassportFile]   = useState<File | null>(null);
  const [dragOver, setDragOver]           = useState(false);
  const [savedPassengers, setSavedPassengers] = useState<PassengerRecord[]>([]);
  const [editingPassenger, setEditingPassenger] = useState<PassengerRecord | null>(null);
  const [showPassengerModal, setShowPassengerModal] = useState(false);
  const serverLoadedRef = useRef(false);

  const { speak, stop, speaking, autoSpeak, toggleAutoSpeak } = useSpeech();

  // Ref so streaming callbacks always see the current activeId
  const activeIdRef   = useRef<string | null>(null);
  const autoSpeakRef  = useRef(autoSpeak);
  // Holds card data to attach to the next streaming assistant message
  const pendingFlightRef      = useRef<FlightSearchResult | null>(null);
  const pendingCalendarRef    = useRef<PriceCalendarResult | null>(null);
  const pendingHotelRef       = useRef<HotelSearchResult | null>(null);
  const pendingRestaurantRef  = useRef<RestaurantSearchResult | null>(null);
  const pendingBusRef         = useRef<BusSearchResult | null>(null);
  const pendingTrainRef       = useRef<TrainSearchResult | null>(null);

  autoSpeakRef.current = autoSpeak;
  activeIdRef.current  = activeId;

  /* ── Load conversations ─── */
  useEffect(() => {
    serverLoadedRef.current = false;
    const savedActiveId = (() => { try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; } })();

    if (!sync.enabled) {
      // Guest (not logged in): localStorage only
      const local = loadConversations(STORAGE_KEY);
      setConversations(local);
      if (savedActiveId && local.find(c => c.id === savedActiveId)) setActiveId(savedActiveId);
      return;
    }

    // Logged in: DB is the single source of truth — never read localStorage for convs
    sync.loadPassengers().then(setSavedPassengers).catch(() => {});

    sync.loadConversations().then((serverConvs) => {
      serverLoadedRef.current = true;
      setConversations(serverConvs);
      setActiveId(prev => {
        if (serverConvs.find(c => c.id === prev)) return prev;
        return serverConvs.find(c => c.id === savedActiveId) ? savedActiveId : null;
      });
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
    if (calendarData)   pendingCalendarRef.current   = null;
    if (hotelData)      pendingHotelRef.current      = null;
    if (restaurantData) pendingRestaurantRef.current = null;

    const hasCard = !!(calendarData || hotelData || restaurantData);
    updateActive((msgs) => {
      const last = msgs[msgs.length - 1];
      if (!hasCard && last?.role === "assistant" && last.streaming) {
        return [...msgs.slice(0, -1), { ...last, content: last.content + token }];
      }
      return [
        ...msgs,
        { id: `${Date.now()}`, role: "assistant" as const, content: token, streaming: true, timestamp: Date.now(), calendarData, hotelData, restaurantData },
      ];
    });
  }, [updateActive]);

  const markDone = useCallback(() => {
    setTyping(false);
    setStreaming(false);
    // Flush transport refs — reading outside the updater avoids Strict Mode double-invoke
    const flightData = pendingFlightRef.current ?? undefined;
    const busData    = pendingBusRef.current    ?? undefined;
    const trainData  = pendingTrainRef.current  ?? undefined;
    pendingFlightRef.current = null;
    pendingBusRef.current   = null;
    pendingTrainRef.current = null;

    setConversations((prev) => {
      const convId = activeIdRef.current;
      return prev.map((c) => {
        if (c.id !== convId) return c;
        const last = c.messages[c.messages.length - 1];
        // Attach all transport card data to the last message
        const finished = {
          ...(last ?? {}),
          streaming: false,
          ...(flightData && { flightData }),
          ...(busData    && { busData }),
          ...(trainData  && { trainData }),
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
  const { send, connected } = useWebSocket({
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
  });

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

    send(txt, history, passengerContext ? { passenger_context: passengerContext } : undefined);
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

      {/* ── Sidebar ── */}
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={newChat}
        onDelete={deleteChat}
        onRename={renameChat}
        onPin={pinConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
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

        {/* Chat area */}
        <ChatWindow
          messages={messages}
          typing={typing}
          toolLabel={toolLabel}
          toolName={toolName}
          onSuggestion={(text) => handleSend(text)}
          onAction={(text) => handleSend(text)}
          onSpeak={speak}
          onStopSpeak={stop}
          speaking={speaking}
        />

        {/* Input */}
        <InputBar
          value={input}
          onChange={setInput}
          onSend={() => handleSend()}
          onToggleMic={toggleRecording}
          recording={recording}
          disabled={!connected || streaming || typing}
          onPassportUpload={(file) => setPassportFile(file)}
        />
      </div>
    </div>
  );
}
