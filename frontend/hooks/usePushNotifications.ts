"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/**
 * Convert a base64url string to a Uint8Array suitable for
 * PushManager.subscribe({ applicationServerKey: ... }).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}

export interface PushNotificationControls {
  /** True when the browser supports push notifications. */
  supported: boolean;
  /** True when the user has an active push subscription. */
  subscribed: boolean;
  /** Request permission and subscribe. Returns true on success. */
  subscribe: () => Promise<boolean>;
  /** Unsubscribe from push notifications. Returns true on success. */
  unsubscribe: () => Promise<boolean>;
}

export function usePushNotifications(
  userEmail: string | null | undefined
): PushNotificationControls {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  // Detect browser support on mount (runs client-side only)
  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        "Notification" in window &&
        "serviceWorker" in navigator &&
        "PushManager" in window
    );
  }, []);

  // Register the service worker as soon as we know push is supported
  useEffect(() => {
    if (!supported || !userEmail) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        // Check whether we already have an active subscription
        const existing = await reg.pushManager.getSubscription();
        setSubscribed(!!existing);
      })
      .catch((err) => console.error("[PushNotifications] SW registration failed:", err));
  }, [supported, userEmail]);

  const subscribe = async (): Promise<boolean> => {
    console.log("[Push] subscribe() called — supported:", supported, "email:", userEmail, "vapidKey:", VAPID_PUBLIC_KEY ? "set" : "MISSING");
    if (!supported || !userEmail || !VAPID_PUBLIC_KEY) {
      console.warn("[Push] Guard failed — supported:", supported, "email:", !!userEmail, "vapidKey:", !!VAPID_PUBLIC_KEY);
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      console.log("[Push] Notification permission:", permission);
      if (permission !== "granted") return false;

      const reg = await navigator.serviceWorker.ready;
      console.log("[Push] SW ready, subscribing to push...");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });
      console.log("[Push] PushManager subscription created:", sub.endpoint.slice(0, 60));

      const subJson = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      const resp = await fetch(`${API}/api/push/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": userEmail,
        },
        body: JSON.stringify(subJson),
      });

      if (resp.ok) {
        setSubscribed(true);
        return true;
      }
      console.error("[PushNotifications] Server rejected subscription:", await resp.text());
      return false;
    } catch (e) {
      console.error("[PushNotifications] Subscribe failed:", e);
      return false;
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    console.log("[Push] unsubscribe() called");
    if (!supported || !userEmail) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      console.log("[Push] existing subscription:", sub ? sub.endpoint.slice(0, 60) : "none");
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch(`${API}/api/push/unsubscribe`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "X-User-Email": userEmail,
          },
          body: JSON.stringify({ endpoint }),
        });
      }
      setSubscribed(false);
      console.log("[Push] unsubscribed, state set to false");
      return true;
    } catch (e) {
      console.error("[Push] Unsubscribe failed:", e);
      return false;
    }
  };

  return { supported, subscribed, subscribe, unsubscribe };
}
