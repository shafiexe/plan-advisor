"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Conversation } from "./ConversationSidebar";

type Props = {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  onClose: () => void;
};

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-indigo-500/30 text-indigo-200 rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function lastSnippet(conv: Conversation): string {
  const last = [...conv.messages].reverse().find(m => m.role === "assistant");
  return last?.content?.replace(/[#*`_~[\]]/g, "").slice(0, 80) ?? "";
}

function matches(conv: Conversation, q: string): boolean {
  if (!q.trim()) return true;
  const lower = q.toLowerCase();
  if (conv.title.toLowerCase().includes(lower)) return true;
  return lastSnippet(conv).toLowerCase().includes(lower);
}

export default function ConversationSearchModal({ conversations, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = conversations.filter(c => matches(c, query));

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Reset cursor when results change
  useEffect(() => { setCursor(0); }, [query]);

  const choose = useCallback((id: string) => {
    onSelect(id);
    onClose();
  }, [onSelect, onClose]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, filtered.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, 0));
    }
    if (e.key === "Enter" && filtered[cursor]) {
      choose(filtered[cursor].id);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[cursor] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-700/60">
          <svg className="w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search chats…"
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-slate-500 hover:text-slate-300 transition-colors text-xs">
              Clear
            </button>
          )}
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No chats match &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              {!query && (
                <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                  Recent chats
                </p>
              )}
              {query && (
                <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                  {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                </p>
              )}
              {filtered.map((conv, i) => {
                const snippet = lastSnippet(conv);
                const isActive = i === cursor;
                return (
                  <button
                    key={conv.id}
                    onClick={() => choose(conv.id)}
                    onMouseEnter={() => setCursor(i)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors
                      ${isActive ? "bg-slate-800" : "hover:bg-slate-800/60"}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5
                      ${isActive ? "bg-indigo-600/30 text-indigo-300" : "bg-slate-800 text-slate-500"}`}>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {highlight(conv.title, query)}
                      </p>
                      {snippet && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {highlight(snippet, query)}
                        </p>
                      )}
                    </div>
                    {isActive && (
                      <span className="text-[10px] text-slate-600 shrink-0 mt-1">↵</span>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-slate-800 flex items-center gap-4 text-[11px] text-slate-600">
          <span><kbd className="bg-slate-800 px-1 rounded text-slate-500">↑↓</kbd> navigate</span>
          <span><kbd className="bg-slate-800 px-1 rounded text-slate-500">↵</kbd> open</span>
          <span><kbd className="bg-slate-800 px-1 rounded text-slate-500">Esc</kbd> close</span>
          <span className="ml-auto"><kbd className="bg-slate-800 px-1 rounded text-slate-500">⌘K</kbd> to open</span>
        </div>
      </div>
    </div>
  );
}
