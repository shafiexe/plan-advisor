"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { initPushNotifications, initStatusBar, hideSplash, initBackButton } from "@/lib/capacitor";

export default function CapacitorInit() {
  const { data: session } = useSession();

  useEffect(() => {
    // Status bar + splash on every cold start
    initStatusBar();
    hideSplash();
    const removeBackListener = initBackButton();
    return removeBackListener;
  }, []);

  useEffect(() => {
    if (session?.user?.email) {
      initPushNotifications(session.user.email);
    }
  }, [session?.user?.email]);

  return null;
}
