"use client";

import { useRef, useState, KeyboardEvent, ChangeEvent, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const MAX_CHARS = 2000;

type Props = {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  onStop?: () => void;
  onToggleMic: () => void;
  recording: boolean;
  disabled: boolean;
  onPassportUpload?: (file: File) => void;
};

/* ── Animated waveform bars (voice-active state) ──────────── */
function Waveform() {
  return (
    <div className="flex items-center gap-[3px] h-7">
      {[0.4, 0.7, 1, 0.85, 0.55, 0.9, 0.6, 0.75, 0.45, 0.8].map((h, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-red-400 animate-wave"
          style={{
            height: `${h * 28}px`,
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </div>
  );
}

export default function InputBar({
  value,
  onChange,
  onSend,
  onStop,
  onToggleMic,
  recording,
  disabled,
  onPassportUpload,
}: Props) {
  const { t } = useLanguage();
  const chatPlaceholder = t("chat.placeholder") || "Ask about vacations, flights, hotels, food…";

  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const fileRef      = useRef<HTMLInputElement>(null);
  const menuRef      = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const charCount = value.length;
  const nearLimit = charCount > MAX_CHARS * 0.8;
  const atLimit   = charCount >= MAX_CHARS;

  // Close + menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onPassportUpload?.(file);
    e.target.value = "";
    setMenuOpen(false);
  };

  return (
    <div className="bg-transparent px-3 pt-2 pb-3">
      {/* Wave animation keyframes — injected once */}
      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.4); }
          50%       { transform: scaleY(1);   }
        }
        .animate-wave {
          animation: wave 900ms ease-in-out infinite;
        }
      `}</style>

      <div className="max-w-3xl mx-auto">

        {/* ── Main input box ── */}
        <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3.5 transition-all
          ${recording
            ? "border-red-500/60 bg-red-950/30 shadow-lg shadow-red-900/20"
            : "border-slate-700/60 bg-slate-800/80 focus-within:border-[#1e3a8a]/60 focus-within:ring-1 focus-within:ring-[#1e3a8a]/10"
          }`}
        >

          {/* + button (left) */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => !recording && setMenuOpen(o => !o)}
              disabled={recording}
              title="Add attachment"
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-lg shrink-0 transition-all
                ${menuOpen
                  ? "bg-[#1e3a8a]/30 text-[#d4a017] rotate-45"
                  : "text-slate-500 hover:text-slate-200 hover:bg-slate-700/60"
                } disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              +
            </button>

            {/* Popover menu */}
            {menuOpen && (
              <div className="absolute bottom-12 left-0 w-56 bg-slate-800 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                <div className="px-3 pt-3 pb-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 mb-2">
                    Upload
                  </p>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-700/60 transition-all text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#1e3a8a]/25 flex items-center justify-center text-base group-hover:bg-[#1e3a8a]/40 transition-all">
                      📷
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200">Upload Passport</p>
                      <p className="text-[11px] text-slate-500 leading-tight">Auto-fill passenger details</p>
                    </div>
                  </button>
                </div>
                <div className="px-3 pb-3">
                  <div className="h-px bg-slate-700/50 my-2" />
                  <p className="text-[10px] text-slate-600 px-1 text-center">
                    Drag &amp; drop a passport photo anywhere too
                  </p>
                </div>
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* ── Recording state: waveform ── */}
          {recording ? (
            <div className="flex-1 flex items-center gap-3 py-1 min-h-[40px]">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <Waveform />
              <span className="text-sm font-medium text-red-300 whitespace-nowrap">Listening…</span>
            </div>
          ) : (
            /* ── Normal textarea ── */
            <div className="flex-1 relative min-w-0">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_CHARS) onChange(e.target.value);
                }}
                onKeyDown={handleKey}
                onInput={handleInput}
                placeholder={chatPlaceholder}
                rows={1}
                disabled={disabled}
                className="w-full resize-none bg-transparent text-slate-100
                  placeholder-slate-500 text-sm leading-normal
                  outline-none py-0 max-h-[140px] disabled:opacity-50"
              />
              {charCount > 0 && (
                <span
                  className={`absolute bottom-2 right-0 text-[10px] font-mono
                    ${atLimit ? "text-red-400" : nearLimit ? "text-amber-400" : "text-slate-600"}`}
                >
                  {charCount}/{MAX_CHARS}
                </span>
              )}
            </div>
          )}

          {/* Right buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Mic / Stop */}
            <button
              onClick={onToggleMic}
              title={recording ? "Stop recording" : "Voice input"}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all
                ${recording
                  ? "bg-red-500 text-white hover:bg-red-400 shadow-lg shadow-red-900/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/60"
                }`}
            >
              {recording ? (
                /* Stop icon */
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="5" y="5" width="14" height="14" rx="2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
                </svg>
              )}
            </button>

            {/* Stop (while AI is responding) / Send */}
            {!recording && (
              disabled && onStop ? (
                <button
                  onClick={onStop}
                  title="Stop generating"
                  className="w-9 h-9 rounded-full bg-[#1e3a8a] text-white
                    flex items-center justify-center hover:bg-[#1e40af]
                    active:scale-95 transition-all shadow shadow-[#0f172a]/40"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={onSend}
                  disabled={disabled || !value.trim() || atLimit}
                  title="Send (Enter)"
                  className="w-9 h-9 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center
                    hover:bg-[#1e40af] active:scale-95 transition-all
                    disabled:opacity-30 disabled:cursor-not-allowed shadow shadow-[#0f172a]/40"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                  </svg>
                </button>
              )
            )}

            {/* Cancel recording */}
            {recording && (
              <button
                onClick={onToggleMic}
                title="Cancel recording"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400
                  hover:text-white hover:bg-slate-700/60 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
