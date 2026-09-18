"use client";

import { useRef, useState, useCallback } from "react";

const TRANSCRIBE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Options = {
  onTranscript: (text: string) => void;
  onError: (msg: string) => void;
};

export function useVoiceInput({ onTranscript, onError }: Options) {
  const [recording, setRecording] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const browserSpeechSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // ── Browser Web Speech API ──────────────────────────────────
  const startBrowserSpeech = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (e: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => {
      const transcript = Array.from(e.results as unknown as ArrayLike<{ [key: number]: { transcript: string } }>)
        .map((r) => r[0].transcript)
        .join("");
      onTranscript(transcript);
    };

    recognition.onerror = () => {
      setRecording(false);
      onError("Voice recognition error. Please try again.");
    };

    recognition.onend = () => setRecording(false);

    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
  }, [onTranscript, onError]);

  const stopBrowserSpeech = useCallback(() => {
    recognitionRef.current?.stop();
    setRecording(false);
  }, []);

  // ── Whisper fallback (MediaRecorder → POST /transcribe) ─────
  const startWhisper = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const form = new FormData();
        form.append("audio", blob, "audio.webm");

        try {
          const res = await fetch(`${TRANSCRIBE_URL}/transcribe`, {
            method: "POST",
            body: form,
          });
          const data = await res.json();
          if (data.text) onTranscript(data.text);
          else onError("Could not transcribe audio.");
        } catch {
          onError("Transcription request failed.");
        }
        setRecording(false);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      onError("Microphone access denied.");
    }
  }, [onTranscript, onError]);

  const stopWhisper = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  // ── Public toggle ───────────────────────────────────────────
  const toggleRecording = useCallback(() => {
    if (recording) {
      if (browserSpeechSupported) stopBrowserSpeech();
      else stopWhisper();
    } else {
      if (browserSpeechSupported) startBrowserSpeech();
      else startWhisper();
    }
  }, [
    recording,
    browserSpeechSupported,
    startBrowserSpeech,
    stopBrowserSpeech,
    startWhisper,
    stopWhisper,
  ]);

  return { recording, toggleRecording };
}
