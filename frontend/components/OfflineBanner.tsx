"use client";
import { useState, useEffect } from "react";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-center text-sm py-1.5 font-medium">
      You&rsquo;re offline — saved trips are still available
    </div>
  );
}
