"use client";

import { useState, useCallback, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* Strip markdown so TTS reads clean prose */
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`{3}[\s\S]*?`{3}/g, "code block.")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^[-*+]\s/gm, "")
    .replace(/^\d+\.\s/gm, "")
    .replace(/^>\s/gm, "")
    .replace(/---+/g, ".")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/* Fallback: browser SpeechSynthesis — used if backend TTS unavailable */
function browserSpeak(text: string, onEnd: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 1.0;
  u.onend = onEnd;
  u.onerror = onEnd;
  window.speechSynthesis.speak(u);
}

export function useSpeech() {
  const [speaking, setSpeaking]   = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef   = useRef<string | null>(null);

  /* Internal stop — cleans up audio element and URL object */
  const stopInternal = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  /* Main speak — OpenAI TTS via backend, browser fallback */
  const speak = useCallback(
    async (text: string) => {
      stopInternal();

      const clean = stripMarkdown(text);
      if (!clean) return;

      setSpeaking(true);

      try {
        const res = await fetch(`${API_URL}/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: clean, voice: "nova" }),
        });

        if (!res.ok) throw new Error("TTS endpoint unavailable");

        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        urlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          urlRef.current  = null;
          audioRef.current = null;
          setSpeaking(false);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          urlRef.current  = null;
          audioRef.current = null;
          setSpeaking(false);
        };

        await audio.play();
      } catch {
        // Fallback to browser voice if backend TTS fails
        browserSpeak(clean, () => setSpeaking(false));
      }
    },
    [stopInternal]
  );

  const stop            = stopInternal;
  const toggleAutoSpeak = useCallback(() => setAutoSpeak((p) => !p), []);

  return { speak, stop, speaking, autoSpeak, toggleAutoSpeak };
}
