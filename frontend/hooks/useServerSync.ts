"use client";

import { useCallback } from "react";
import type { Conversation } from "@/components/ConversationSidebar";
import type { Message } from "@/components/MessageBubble";
import type { PassengerRecord } from "@/components/PassengerFormModal";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function authHeaders(email: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-User-Email": email,
  };
}

/* Strip card data (flight/calendar payloads) before syncing — they can be
   re-fetched; we only persist the text conversation. */
function cleanMessages(messages: Message[]): Message[] {
  return messages
    .filter(m => !m.streaming)
    .map(m => {
      const base = {
        id:        m.id,
        role:      m.role,
        content:   m.content,
        timestamp: m.timestamp,
      };
      // Persist card data so cards re-render when conversation is re-opened
      if (m.flightData)      Object.assign(base, { flightData: m.flightData });
      if (m.calendarData)    Object.assign(base, { calendarData: m.calendarData });
      if (m.hotelData)       Object.assign(base, { hotelData: m.hotelData });
      if (m.restaurantData)  Object.assign(base, { restaurantData: m.restaurantData });
      if (m.busData)         Object.assign(base, { busData: m.busData });
      if (m.trainData)       Object.assign(base, { trainData: m.trainData });
      if (m.roundTripData)   Object.assign(base, { roundTripData: m.roundTripData });
      if (m.weatherData)     Object.assign(base, { weatherData: m.weatherData });
      if (m.visaData)        Object.assign(base, { visaData: m.visaData });
      if (m.guideData)       Object.assign(base, { guideData: m.guideData });
      if (m.currencyData)    Object.assign(base, { currencyData: m.currencyData });
      if (m.budgetData)      Object.assign(base, { budgetData: m.budgetData });
      return base;
    });
}

export function useServerSync(userEmail: string | null | undefined) {
  const enabled = !!userEmail;

  /* ── Conversations ──────────────────────────────────────── */
  const loadConversations = useCallback(async (): Promise<Conversation[]> => {
    if (!enabled) return [];
    try {
      const resp = await fetch(`${API}/api/user/conversations`, {
        headers: { "X-User-Email": userEmail! },
      });
      if (!resp.ok) {
        console.error("[sync] loadConversations failed:", resp.status, await resp.text());
        return [];
      }
      return await resp.json() as Conversation[];
    } catch (e) {
      console.error("[sync] loadConversations error:", e);
      return [];
    }
  }, [enabled, userEmail]);

  const saveConversation = useCallback(async (conv: Conversation) => {
    if (!enabled) {
      console.warn("[sync] saveConversation skipped — userEmail is null (not logged in)");
      return;
    }
    if (!conv.messages?.length) {
      console.warn("[sync] saveConversation skipped — no messages in conversation");
      return;
    }
    try {
      const resp = await fetch(`${API}/api/user/conversations/${conv.id}`, {
        method:  "PUT",
        headers: authHeaders(userEmail!),
        body:    JSON.stringify({
          title:    conv.title,
          messages: cleanMessages(conv.messages),
          pinned:   conv.pinned ?? false,
        }),
      });
      if (!resp.ok) {
        console.error("[sync] saveConversation failed:", resp.status, await resp.text());
      }
    } catch (e) {
      console.error("[sync] saveConversation network error:", e);
    }
  }, [enabled, userEmail]);

  const deleteConversation = useCallback(async (id: string) => {
    if (!enabled) return;
    try {
      await fetch(`${API}/api/user/conversations/${id}`, {
        method:  "DELETE",
        headers: { "X-User-Email": userEmail! },
      });
    } catch {}
  }, [enabled, userEmail]);

  const shareConversation = useCallback(async (id: string): Promise<string | null> => {
    if (!enabled) return null;
    try {
      const resp = await fetch(`${API}/api/user/conversations/${id}/share`, {
        method:  "POST",
        headers: { "X-User-Email": userEmail! },
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.share_token as string;
    } catch { return null; }
  }, [enabled, userEmail]);

  /* ── Passenger profile ──────────────────────────────────── */
  const loadPassengerProfile = useCallback(async (): Promise<Record<string, string> | null> => {
    if (!enabled) return null;
    try {
      const resp = await fetch(`${API}/api/user/passenger-profile`, {
        headers: { "X-User-Email": userEmail! },
      });
      if (!resp.ok) return null;
      const json = await resp.json();
      return json.data ?? null;
    } catch { return null; }
  }, [enabled, userEmail]);

  const savePassengerProfile = useCallback(async (data: Record<string, string>) => {
    if (!enabled) return;
    try {
      await fetch(`${API}/api/user/passenger-profile`, {
        method:  "PUT",
        headers: authHeaders(userEmail!),
        body:    JSON.stringify({ data }),
      });
    } catch {}
  }, [enabled, userEmail]);

  /* ── Multi-passenger CRUD ──────────────────────────────────── */
  const loadPassengers = useCallback(async (): Promise<PassengerRecord[]> => {
    if (!enabled) return [];
    try {
      const resp = await fetch(`${API}/api/user/passengers`, {
        headers: { "X-User-Email": userEmail! },
      });
      if (!resp.ok) return [];
      return await resp.json() as PassengerRecord[];
    } catch { return []; }
  }, [enabled, userEmail]);

  const createPassenger = useCallback(async (p: PassengerRecord): Promise<PassengerRecord | null> => {
    if (!enabled) return null;
    try {
      const resp = await fetch(`${API}/api/user/passengers`, {
        method:  "POST",
        headers: authHeaders(userEmail!),
        body:    JSON.stringify(p),
      });
      if (!resp.ok) return null;
      return await resp.json() as PassengerRecord;
    } catch { return null; }
  }, [enabled, userEmail]);

  const updatePassenger = useCallback(async (id: number, p: PassengerRecord): Promise<PassengerRecord | null> => {
    if (!enabled) return null;
    try {
      const resp = await fetch(`${API}/api/user/passengers/${id}`, {
        method:  "PUT",
        headers: authHeaders(userEmail!),
        body:    JSON.stringify(p),
      });
      if (!resp.ok) return null;
      return await resp.json() as PassengerRecord;
    } catch { return null; }
  }, [enabled, userEmail]);

  const deletePassenger = useCallback(async (id: number) => {
    if (!enabled) return;
    try {
      await fetch(`${API}/api/user/passengers/${id}`, {
        method:  "DELETE",
        headers: { "X-User-Email": userEmail! },
      });
    } catch {}
  }, [enabled, userEmail]);

  /* ── Price alerts ───────────────────────────────────────── */
  const addAlert = useCallback(async (alert: {
    origin: string;
    destination: string;
    departure_date: string;
    threshold_inr: number;
  }): Promise<boolean> => {
    if (!enabled) return false;
    try {
      const resp = await fetch(`${API}/api/alerts`, {
        method:  "POST",
        headers: authHeaders(userEmail!),
        body:    JSON.stringify(alert),
      });
      return resp.ok;
    } catch { return false; }
  }, [enabled, userEmail]);

  const loadAlerts = useCallback(async (): Promise<AlertRecord[]> => {
    if (!enabled) return [];
    try {
      const resp = await fetch(`${API}/api/alerts`, {
        headers: { "X-User-Email": userEmail! },
      });
      if (!resp.ok) return [];
      return await resp.json() as AlertRecord[];
    } catch { return []; }
  }, [enabled, userEmail]);

  const deleteAlert = useCallback(async (id: number): Promise<boolean> => {
    if (!enabled) return false;
    try {
      const resp = await fetch(`${API}/api/alerts/${id}`, {
        method:  "DELETE",
        headers: { "X-User-Email": userEmail! },
      });
      return resp.ok;
    } catch { return false; }
  }, [enabled, userEmail]);

  return {
    enabled,
    loadConversations,
    saveConversation,
    deleteConversation,
    shareConversation,
    loadPassengerProfile,
    savePassengerProfile,
    loadPassengers,
    createPassenger,
    updatePassenger,
    deletePassenger,
    addAlert,
    loadAlerts,
    deleteAlert,
  };
}

export type AlertRecord = {
  id: number;
  origin: string;
  destination: string;
  departure_date: string;
  threshold_inr: number;
  last_price_inr?: number;
  triggered: boolean;
  active: boolean;
  created_at: string;
  last_checked?: string;
};
