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
      if (m.itineraryData)   Object.assign(base, { itineraryData: m.itineraryData });
      if (m.predictionData)  Object.assign(base, { predictionData: m.predictionData });
      if (m.packingData)       Object.assign(base, { packingData: m.packingData });
      if (m.flightStatusData)  Object.assign(base, { flightStatusData: m.flightStatusData });
      if (m.transitData)       Object.assign(base, { transitData: m.transitData });
      if (m.phrasebookData)    Object.assign(base, { phrasebookData: m.phrasebookData });
      if (m.insuranceData)     Object.assign(base, { insuranceData: m.insuranceData });
      if (m.timelineData)      Object.assign(base, { timelineData: m.timelineData });
      if (m.splitData)         Object.assign(base, { splitData: m.splitData });
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

  /* ── Saved trips ───────────────────────────────────────── */
  const loadTrips = useCallback(async (): Promise<SavedTrip[]> => {
    if (!enabled) return [];
    try {
      const resp = await fetch(`${API}/api/trips`, { headers: { "X-User-Email": userEmail! } });
      if (!resp.ok) return [];
      return await resp.json() as SavedTrip[];
    } catch { return []; }
  }, [enabled, userEmail]);

  const saveTrip = useCallback(async (trip: { name: string; destination: string; date_range: string; data: Record<string, unknown> }): Promise<SavedTrip | null> => {
    if (!enabled) return null;
    try {
      const resp = await fetch(`${API}/api/trips`, {
        method: "POST",
        headers: authHeaders(userEmail!),
        body: JSON.stringify(trip),
      });
      if (!resp.ok) return null;
      return await resp.json() as SavedTrip;
    } catch { return null; }
  }, [enabled, userEmail]);

  const deleteTrip = useCallback(async (id: number): Promise<boolean> => {
    if (!enabled) return false;
    try {
      const resp = await fetch(`${API}/api/trips/${id}`, { method: "DELETE", headers: { "X-User-Email": userEmail! } });
      return resp.ok || resp.status === 204;
    } catch { return false; }
  }, [enabled, userEmail]);

  const renameTrip = useCallback(async (id: number, name: string): Promise<boolean> => {
    if (!enabled) return false;
    try {
      const resp = await fetch(`${API}/api/trips/${id}`, {
        method: "PATCH",
        headers: authHeaders(userEmail!),
        body: JSON.stringify({ name }),
      });
      return resp.ok;
    } catch { return false; }
  }, [enabled, userEmail]);

  const shareTrip = useCallback(async (id: number): Promise<string | null> => {
    if (!enabled) return null;
    try {
      const resp = await fetch(`${API}/api/trips/${id}/share`, {
        method: "POST",
        headers: { "X-User-Email": userEmail! },
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.share_url as string;
    } catch { return null; }
  }, [enabled, userEmail]);

  const emailTrip = useCallback(async (id: number, toEmail: string, message: string): Promise<boolean> => {
    if (!enabled) return false;
    try {
      const resp = await fetch(`${API}/api/trips/${id}/email`, {
        method: "POST",
        headers: authHeaders(userEmail!),
        body: JSON.stringify({ to_email: toEmail, message }),
      });
      return resp.ok;
    } catch { return false; }
  }, [enabled, userEmail]);

  const addCollaborator = useCallback(async (id: number, collabEmail: string): Promise<boolean> => {
    if (!enabled) return false;
    try {
      const resp = await fetch(`${API}/api/trips/${id}/collaborators`, {
        method: "POST",
        headers: authHeaders(userEmail!),
        body: JSON.stringify({ email: collabEmail }),
      });
      return resp.ok;
    } catch { return false; }
  }, [enabled, userEmail]);

  const removeCollaborator = useCallback(async (id: number, collabEmail: string): Promise<boolean> => {
    if (!enabled) return false;
    try {
      const resp = await fetch(`${API}/api/trips/${id}/collaborators/${encodeURIComponent(collabEmail)}`, {
        method: "DELETE",
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
    loadTrips,
    saveTrip,
    deleteTrip,
    renameTrip,
    shareTrip,
    emailTrip,
    addCollaborator,
    removeCollaborator,
  };
}

export type SavedTrip = {
  id: number;
  name: string;
  destination: string;
  date_range: string;
  created_at: string;
  share_token?: string | null;
  collaborators?: string[];
  is_owner?: boolean;
  data?: Record<string, unknown>;
};

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
