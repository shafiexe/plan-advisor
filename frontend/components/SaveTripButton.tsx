"use client";

import { useState, useRef, useEffect } from "react";

type Props = {
  onSave: (name: string) => Promise<void>;
  defaultName: string;
};

export default function SaveTripButton({ onSave, defaultName }: Props) {
  const [mode, setMode] = useState<"idle" | "editing" | "saved">("idle");
  const [name, setName] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "editing") inputRef.current?.focus();
  }, [mode]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await onSave(trimmed);
    setMode("saved");
    setTimeout(() => setMode("idle"), 2000);
  };

  if (mode === "saved") {
    return (
      <div className="flex justify-end mt-2 pr-1">
        <span className="text-xs text-emerald-400 font-medium">Saved!</span>
      </div>
    );
  }

  if (mode === "editing") {
    return (
      <div className="flex items-center gap-1.5 mt-2 pr-1 justify-end">
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setMode("idle");
          }}
          placeholder="Trip name…"
          className="text-xs bg-slate-800 border border-slate-600 rounded-lg px-2 py-1
            text-slate-200 placeholder-slate-600 outline-none focus:ring-1 focus:ring-indigo-500
            w-40"
        />
        <button
          onClick={handleSave}
          className="text-xs px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500
            text-white font-semibold transition-colors"
        >
          Save
        </button>
        <button
          onClick={() => setMode("idle")}
          className="text-xs px-1.5 py-1 rounded-lg text-slate-500 hover:text-slate-300
            border border-slate-700 hover:border-slate-600 transition-colors"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-end mt-2 pr-1">
      <button
        onClick={() => { setName(defaultName); setMode("editing"); }}
        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        title="Save this trip"
      >
        Save trip
      </button>
    </div>
  );
}
