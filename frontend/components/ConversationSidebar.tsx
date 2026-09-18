"use client";

import { useState, useRef, useEffect } from "react";
import { Message } from "./MessageBubble";
import type { PassengerRecord } from "./PassengerFormModal";

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
};

type SessionUser = { name?: string | null; email?: string | null; image?: string | null };

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onPin: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  /* Passengers */
  passengers?: PassengerRecord[];
  onEditPassenger?: (p: PassengerRecord) => void;
  onDeletePassenger?: (id: number) => void;
  onAddPassenger?: () => void;
  /* Bottom bar */
  sessionUser?: SessionUser | null;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
  connected?: boolean;
  onSignOut?: () => void;
};

function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)    return "Just now";
  if (mins < 60)   return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days < 7)    return `${days}d ago`;
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

function lastSnippet(conv: Conversation) {
  const last = [...conv.messages].reverse().find((m) => m.role === "assistant");
  if (!last) return "No response yet";
  return last.content.slice(0, 60) + (last.content.length > 60 ? "…" : "");
}

function isExpired(dateStr: string) {
  return !!dateStr && new Date(dateStr) < new Date();
}

function PassengerListCard({
  p, onEdit, onDelete,
}: { p: PassengerRecord; onEdit: () => void; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown";
  const expired = isExpired(p.expiry_date);

  return (
    <div className={`rounded-xl border transition-all p-3
      ${expired ? "border-red-500/40 bg-red-950/10" : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600/70"}`}
    >
      <div className="flex items-start gap-2.5">
        <PassengerInitials p={p} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-slate-200 truncate">{name}</p>
            {expired && (
              <span className="shrink-0 text-[9px] font-bold bg-red-500/80 text-white px-1 py-0.5 rounded">
                Expired
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 truncate">{p.label || "Passenger"}</p>
        </div>
      </div>

      <div className="mt-2.5 space-y-1">
        {p.passport_number && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">Passport</span>
            <span className="text-[11px] text-slate-400 font-mono">{p.passport_number}</span>
          </div>
        )}
        {p.nationality && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">Nationality</span>
            <span className="text-[11px] text-slate-400">{p.nationality}</span>
          </div>
        )}
        {p.date_of_birth && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">DOB</span>
            <span className="text-[11px] text-slate-400">{p.date_of_birth}</span>
          </div>
        )}
        {p.expiry_date && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">Expires</span>
            <span className={`text-[11px] font-medium ${expired ? "text-red-400" : "text-slate-400"}`}>
              {p.expiry_date}
            </span>
          </div>
        )}
        {p.email && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">Email</span>
            <span className="text-[11px] text-slate-400 truncate ml-2 max-w-30">{p.email}</span>
          </div>
        )}
        {p.phone && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">Phone</span>
            <span className="text-[11px] text-slate-400">{p.phone}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {confirming ? (
        <div className="mt-3 rounded-lg border border-red-500/40 bg-red-950/30 p-2.5">
          <p className="text-[11px] text-red-300 font-semibold text-center mb-2">
            Delete {name}? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { onDelete(); setConfirming(false); }}
              className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold transition-all"
            >
              Yes, Delete
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:text-white text-[11px] font-semibold transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 mt-3">
          <button
            onClick={onEdit}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold
              border border-slate-600/60 text-slate-400 hover:text-white
              hover:border-indigo-500/60 hover:bg-indigo-600/10 transition-all"
          >
            ✏ Edit
          </button>
          <button
            onClick={() => setConfirming(true)}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold
              border border-slate-600/60 text-slate-400 hover:text-red-400
              hover:border-red-500/60 hover:bg-red-950/20 transition-all"
          >
            🗑 Delete
          </button>
        </div>
      )}
    </div>
  );
}

function PassengerInitials({ p }: { p: PassengerRecord }) {
  const initials = `${p.first_name?.[0] ?? ""}${p.last_name?.[0] ?? ""}`.toUpperCase() || "?";
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600
      flex items-center justify-center text-xs font-bold text-white shrink-0">
      {initials}
    </div>
  );
}

export default function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onPin,
  isOpen,
  onClose,
  passengers = [],
  onEditPassenger,
  onDeletePassenger,
  onAddPassenger,
  sessionUser,
  theme = "dark",
  onToggleTheme,
  connected = true,
  onSignOut,
}: Props) {
  const [tab, setTab] = useState<"chats" | "passengers">("chats");
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showUserMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu]);

  // Pinned conversations first, then by most recent
  const sorted = [...conversations].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updatedAt - a.updatedAt;
  });
  const pinnedCount = sorted.filter(c => c.pinned).length;

  const startRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const commitRename = (id: string) => {
    const trimmed = editTitle.trim();
    if (trimmed) onRename(id, trimmed);
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          conv-sidebar
          fixed md:relative inset-y-0 left-0 z-30
          flex flex-col bg-slate-900 border-r border-slate-800
          transition-all duration-300 overflow-hidden
          ${isOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full md:w-0 md:translate-x-0 md:border-r-0"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0 min-w-[256px]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-900/30 shrink-0">
              ✦
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100 leading-none">Plan Advisor</p>
              <p className="text-[11px] text-slate-500 mt-0.5">AI Assistant</p>
            </div>
          </div>
          {/* Close sidebar button — visible on all screen sizes */}
          <button
            onClick={onClose}
            title="Close sidebar"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            {/* Panel-left icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
            </svg>
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex mx-3 mt-3 mb-1 rounded-xl bg-slate-800/60 p-0.5 flex-shrink-0">
          <button
            onClick={() => setTab("chats")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === "chats"
                ? "bg-slate-700 text-slate-100 shadow"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            💬 Chats
          </button>
          <button
            onClick={() => setTab("passengers")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all relative ${
              tab === "passengers"
                ? "bg-slate-700 text-slate-100 shadow"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            👤 Passengers
            {passengers.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-[9px] font-bold text-white flex items-center justify-center">
                {passengers.length}
              </span>
            )}
          </button>
        </div>

        {/* ── CHATS TAB ── */}
        {tab === "chats" && (
          <>
            <div className="px-3 py-2 flex-shrink-0">
              <button
                onClick={() => { onNew(); onClose(); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl
                  bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium
                  transition-colors shadow-lg shadow-indigo-900/30"
              >
                <span className="text-base">＋</span>
                New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {sorted.length === 0 && (
                <p className="text-slate-600 text-xs text-center mt-8 px-4">
                  No conversations yet. Start a new chat above.
                </p>
              )}

              {sorted.map((conv, idx) => {
                const isActive  = conv.id === activeId;
                const isEditing = editingId === conv.id;
                // Section label: "Pinned" above first pinned, "Recent" above first unpinned
                const showPinnedLabel  = idx === 0 && conv.pinned;
                const showRecentLabel  = conv.pinned
                  ? false
                  : idx === 0 || (idx === pinnedCount && pinnedCount > 0);

                return (
                  <div key={conv.id}>
                    {showPinnedLabel && (
                      <p className="px-2 pt-2 pb-1 text-[10px] font-bold text-amber-500/80 uppercase tracking-widest flex items-center gap-1">
                        <span>📌</span> Pinned
                      </p>
                    )}
                    {showRecentLabel && (
                      <p className={`px-2 pb-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest
                        ${pinnedCount > 0 ? "pt-3 border-t border-slate-800 mt-1" : "pt-2"}`}>
                        Recent
                      </p>
                    )}

                    <div
                      className={`group relative rounded-xl transition-all mb-0.5
                        ${isActive
                          ? "bg-indigo-600/20 border border-indigo-500/30"
                          : conv.pinned
                            ? "border border-amber-500/20 bg-amber-950/10 hover:bg-amber-950/20"
                            : "hover:bg-slate-800/60 border border-transparent"}`}
                    >
                      {isEditing ? (
                        /* ── Inline rename ── */
                        <div className="px-2 py-2 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <input
                            autoFocus
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") commitRename(conv.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            onBlur={() => commitRename(conv.id)}
                            className="flex-1 min-w-0 text-sm bg-slate-800 border border-indigo-500/60
                              rounded-lg px-2 py-1 text-slate-100 outline-none
                              focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            onClick={() => commitRename(conv.id)}
                            className="shrink-0 w-6 h-6 rounded-md bg-indigo-600 hover:bg-indigo-500
                              flex items-center justify-center text-white text-xs transition-all"
                            title="Save"
                          >✓</button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="shrink-0 w-6 h-6 rounded-md border border-slate-600
                              flex items-center justify-center text-slate-400 hover:text-white text-xs transition-all"
                            title="Cancel"
                          >✕</button>
                        </div>
                      ) : (
                        /* ── Normal row ── */
                        <div
                          className="px-3 py-2.5 cursor-pointer"
                          onClick={() => { onSelect(conv.id); onClose(); }}
                        >
                          <p className={`text-sm font-medium truncate pr-14
                            ${isActive ? "text-indigo-300" : "text-slate-300"}`}>
                            {conv.title}
                          </p>
                          <p className="text-xs text-slate-600 truncate mt-0.5">
                            {lastSnippet(conv)}
                          </p>
                          <p className="text-[10px] text-slate-700 mt-0.5">
                            {relativeTime(conv.updatedAt)}
                          </p>
                        </div>
                      )}

                      {/* ── Hover action buttons (pin + rename + delete) ── */}
                      {!isEditing && (
                        <div className="absolute top-2 right-2 flex gap-0.5
                          opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.stopPropagation(); onPin(conv.id); }}
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-all text-[11px]
                              ${conv.pinned
                                ? "text-amber-400 hover:text-amber-300 hover:bg-amber-950/60"
                                : "text-slate-500 hover:text-amber-400 hover:bg-amber-950/40"}`}
                            title={conv.pinned ? "Unpin" : "Pin to top"}
                          >📌</button>
                          <button
                            onClick={e => startRename(conv, e)}
                            className="w-5 h-5 rounded-md flex items-center justify-center
                              text-slate-500 hover:text-indigo-400 hover:bg-indigo-950/60 transition-all text-xs"
                            title="Rename"
                          >✎</button>
                          <button
                            onClick={e => { e.stopPropagation(); setPendingDelete(conv); }}
                            className="w-5 h-5 rounded-md flex items-center justify-center
                              text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition-all text-xs"
                            title="Delete"
                          >✕</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Bottom user bar ── */}
            <div ref={userMenuRef} className="relative px-3 py-3 border-t border-slate-800 flex-shrink-0">

              {/* User menu popover — opens above the bar */}
              {showUserMenu && sessionUser && (
                <div className="absolute bottom-full left-3 right-3 mb-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-slate-800">
                    <p className="text-sm font-semibold text-slate-200 truncate">{sessionUser.name}</p>
                    <p className="text-xs text-slate-500 truncate">{sessionUser.email}</p>
                  </div>
                  {/* Sign out */}
                  {onSignOut && (
                    <button
                      onClick={() => { setShowUserMenu(false); onSignOut(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800/60 transition-colors"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                      </svg>
                      Sign out
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                {/* Avatar + name — click to open menu */}
                {sessionUser && (
                  <button
                    onClick={() => setShowUserMenu(v => !v)}
                    className="flex items-center gap-2 flex-1 min-w-0 rounded-xl hover:bg-slate-800/60 px-1 py-1 transition-all text-left"
                  >
                    {sessionUser.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={sessionUser.image} alt="avatar" className="w-7 h-7 rounded-full border border-slate-700 shrink-0 object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                        {(sessionUser.name ?? sessionUser.email ?? "U")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate leading-tight">
                        {sessionUser.name ?? sessionUser.email}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${connected ? "bg-green-400" : "bg-amber-400 animate-pulse"}`} />
                        <span className="text-[10px] text-slate-500">{connected ? "Online" : "Connecting…"}</span>
                      </div>
                    </div>
                  </button>
                )}

                {/* Theme toggle */}
                {onToggleTheme && (
                  <button
                    onClick={onToggleTheme}
                    title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                    aria-label="Toggle theme"
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border focus:outline-none shrink-0
                      ${theme === "dark"
                        ? "bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700"
                        : "bg-white border-gray-300 text-yellow-500"}`}
                  >
                    {theme === "dark" ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="5" />
                        <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Delete confirmation modal ── */}
        {pendingDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setPendingDelete(null)}
            />
            <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900
              border border-slate-200 dark:border-slate-700 shadow-2xl p-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                Delete chat?
              </h2>
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">
                This will delete{" "}
                <strong className="text-slate-900 dark:text-slate-100">{pendingDelete.title}</strong>.
              </p>
              <p className="text-xs text-slate-500 mb-5">
                The conversation will be permanently removed from your account.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setPendingDelete(null)}
                  className="px-4 py-2 rounded-full border border-slate-300 dark:border-slate-600
                    text-slate-700 dark:text-slate-300 text-sm font-medium
                    hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDelete(pendingDelete.id);
                    setPendingDelete(null);
                  }}
                  className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white text-sm font-bold
                    transition-all shadow-lg shadow-red-900/30"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── PASSENGERS TAB ── */}
        {tab === "passengers" && (
          <>
            <div className="px-3 py-2 flex-shrink-0">
              <button
                onClick={() => { onAddPassenger?.(); onClose(); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl
                  bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium
                  transition-colors shadow-lg shadow-indigo-900/30"
              >
                <span className="text-base">＋</span>
                Add Passenger
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-2">
              {passengers.length === 0 && (
                <div className="text-center mt-10 px-4">
                  <p className="text-3xl mb-2">🧳</p>
                  <p className="text-slate-500 text-xs">No saved passengers yet.</p>
                  <p className="text-slate-600 text-[11px] mt-1">
                    Upload a passport or fill in details to save a passenger.
                  </p>
                </div>
              )}

              {passengers.map((p) => (
                <PassengerListCard
                  key={p.id}
                  p={p}
                  onEdit={() => { onEditPassenger?.(p); onClose(); }}
                  onDelete={() => p.id && onDeletePassenger?.(p.id)}
                />
              ))}
            </div>

            <div className="px-4 py-3 border-t border-slate-800 flex-shrink-0">
              <p className="text-[10px] text-slate-700 text-center">
                {passengers.length} passenger{passengers.length !== 1 ? "s" : ""} saved
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
