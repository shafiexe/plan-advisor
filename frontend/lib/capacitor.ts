"use client";
/**
 * Capacitor native bridge — imported once at app root.
 * Gracefully no-ops on web (Capacitor.isNativePlatform() === false).
 */
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { App } from "@capacitor/app";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** Register for push notifications and send FCM token to backend. */
export async function initPushNotifications(userEmail: string): Promise<void> {
  if (!isNative()) return;

  // Request permission (Android 13+ requires explicit ask)
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return;

  await PushNotifications.register();

  // Send FCM token to backend when received
  await PushNotifications.addListener("registration", async (token) => {
    try {
      await fetch(`${API}/api/user/push-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": userEmail,
        },
        body: JSON.stringify({ token: token.value, platform: "android" }),
      });
    } catch {
      // Non-fatal — push will work on next app open
    }
  });

  // Show a local notification banner when app is in foreground
  await PushNotifications.addListener(
    "pushNotificationReceived",
    (notification) => {
      console.log("[Push] received:", notification.title);
    }
  );

  // Handle tap on a notification (app was in background/killed)
  await PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action) => {
      const data = action.notification.data as { url?: string };
      if (data?.url && typeof window !== "undefined") {
        window.location.href = data.url;
      }
    }
  );
}

/** Apply dark status bar styling on native. */
export async function initStatusBar(): Promise<void> {
  if (!isNative()) return;
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#020817" });
  } catch {
    // Older Android versions may not support all options
  }
}

/** Hide the splash screen after the page loads. */
export async function hideSplash(): Promise<void> {
  if (!isNative()) return;
  await SplashScreen.hide({ fadeOutDuration: 300 });
}

/** Listen for Android back-button — prevent accidental exit on root pages. */
export function initBackButton(onBack?: () => void): () => void {
  if (!isNative()) return () => {};

  const handler = App.addListener("backButton", ({ canGoBack }) => {
    if (onBack) { onBack(); return; }
    if (!canGoBack) App.minimizeApp();
    else window.history.back();
  });

  return () => { handler.then(h => h.remove()); };
}
