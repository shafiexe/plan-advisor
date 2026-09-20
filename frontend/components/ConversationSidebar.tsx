"use client";

import { useState, useRef, useEffect } from "react";
import { Message } from "./MessageBubble";
import type { PassengerRecord } from "./PassengerFormModal";
import BrandLogo from "./BrandLogo";
import type { AlertRecord, SavedTrip } from "@/hooks/useServerSync";
import ConversationSearchModal from "./ConversationSearchModal";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Locale } from "@/contexts/LanguageContext";

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
  onShare: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  /* Passengers */
  passengers?: PassengerRecord[];
  onEditPassenger?: (p: PassengerRecord) => void;
  onDeletePassenger?: (id: number) => void;
  onAddPassenger?: () => void;
  /* Alerts */
  alerts?: AlertRecord[];
  onDeleteAlert?: (id: number) => void;
  onEditAlert?: (alert: AlertRecord) => void;
  /* Saved trips */
  savedTrips?: SavedTrip[];
  onRecallTrip?: (tripId: number) => void;
  onDeleteTrip?: (tripId: number) => void;
  onShareTrip?: (tripId: number) => Promise<string | null>;
  onEmailTrip?: (tripId: number, toEmail: string, message: string) => Promise<boolean>;
  onAddCollaborator?: (tripId: number, email: string) => Promise<boolean>;
  onRemoveCollaborator?: (tripId: number, email: string) => Promise<boolean>;
  userEmail?: string | null;
  /* Bottom bar */
  sessionUser?: SessionUser | null;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
  connected?: boolean;
  onSignOut?: () => void;
  onEditPreferences?: () => void;
  onEditEssentials?: () => void;
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
              hover:border-[#1e3a8a]/60 hover:bg-[#1e3a8a]/10 transition-all"
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
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#d4a017]
      flex items-center justify-center text-xs font-bold text-white shrink-0">
      {initials}
    </div>
  );
}

function AlertRow({
  alert, onEdit, onDelete,
}: { alert: AlertRecord; onEdit: () => void; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const isPast = !!alert.departure_date && new Date(alert.departure_date) < new Date();

  return (
    <div className={`rounded-lg border p-2 ${isPast ? "border-slate-700/30 opacity-50" : "border-slate-700/50 bg-slate-800/40"}`}>
      <div className="flex items-center justify-between gap-1">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-200">
            {alert.origin} → {alert.destination}
          </p>
          <p className="text-[10px] text-slate-500">
            {alert.departure_date} · below ₹{alert.threshold_inr.toLocaleString("en-IN")}
          </p>
          {alert.last_price_inr && (
            <p className="text-[10px] text-slate-600">
              Last seen: ₹{alert.last_price_inr.toLocaleString("en-IN")}
            </p>
          )}
        </div>
        {confirming ? (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => { onDelete(); setConfirming(false); }}
              className="text-[10px] px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold"
            >Yes</button>
            <button
              onClick={() => setConfirming(false)}
              className="text-[10px] px-1.5 py-0.5 rounded border border-slate-600 text-slate-400 hover:text-white"
            >No</button>
          </div>
        ) : (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={onEdit}
              title="Edit alert"
              className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-[#d4a017] hover:bg-[#172554]/40 text-[10px] transition-all"
            >✎</button>
            <button
              onClick={() => setConfirming(true)}
              title="Delete alert"
              className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-950/40 text-[10px] transition-all"
            >✕</button>
          </div>
        )}
      </div>
    </div>
  );
}

function SavedTripRow({
  trip, onRecall, onDelete, onShare, onEmail, onAddCollaborator, onRemoveCollaborator, isOwner,
}: {
  trip: SavedTrip;
  onRecall: () => void;
  onDelete: () => void;
  onShare?: () => Promise<string | null>;
  onEmail?: (toEmail: string, message: string) => Promise<boolean>;
  onAddCollaborator?: (email: string) => Promise<boolean>;
  onRemoveCollaborator?: (email: string) => Promise<boolean>;
  isOwner?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Email form state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // WhatsApp tooltip state
  const [waTooltip, setWaTooltip] = useState(false);

  // Collaborator form state
  const [showCollabForm, setShowCollabForm] = useState(false);
  const [collabEmail, setCollabEmail] = useState("");
  const [addingCollab, setAddingCollab] = useState(false);
  const [localCollabs, setLocalCollabs] = useState<string[]>(trip.collaborators ?? []);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onShare) return;
    setSharing(true);
    try {
      const url = await onShare();
      if (url) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } finally {
      setSharing(false);
    }
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!trip.share_token) {
      setWaTooltip(true);
      setTimeout(() => setWaTooltip(false), 2500);
      return;
    }
    const shareUrl = `${window.location.origin}/trip/${trip.share_token}`;
    const text = encodeURIComponent(`Check out my trip plan: ${trip.name}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleSendEmail = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onEmail || !emailTo.trim()) return;
    setSendingEmail(true);
    try {
      const ok = await onEmail(emailTo.trim(), emailMsg.trim());
      if (ok) {
        setEmailSent(true);
        setTimeout(() => { setEmailSent(false); setShowEmailForm(false); setEmailTo(""); setEmailMsg(""); }, 2000);
      }
    } finally {
      setSendingEmail(false);
    }
  };

  const handleAddCollab = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onAddCollaborator || !collabEmail.trim()) return;
    setAddingCollab(true);
    try {
      const ok = await onAddCollaborator(collabEmail.trim().toLowerCase());
      if (ok) {
        setLocalCollabs(prev => [...prev.filter(e => e !== collabEmail.trim().toLowerCase()), collabEmail.trim().toLowerCase()]);
        setCollabEmail("");
      }
    } finally {
      setAddingCollab(false);
    }
  };

  const handleRemoveCollab = async (e: React.MouseEvent, ce: string) => {
    e.stopPropagation();
    if (!onRemoveCollaborator) return;
    const ok = await onRemoveCollaborator(ce);
    if (ok) setLocalCollabs(prev => prev.filter(x => x !== ce));
  };

  return (
    <div
      className="group relative rounded-xl border border-slate-700/40 bg-slate-800/30
        hover:border-slate-600/60 hover:bg-slate-800/60 transition-all mb-0.5"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setWaTooltip(false); }}
    >
      <div
        className="px-2.5 py-2 pr-20 cursor-pointer"
        onClick={onRecall}
      >
        <p className="text-xs font-medium text-slate-300 truncate">
          {tripDestinationEmoji(trip.destination)} {trip.name}
        </p>
        {trip.date_range && (
          <p className="text-[10px] text-slate-600 truncate mt-0.5">{trip.date_range}</p>
        )}
        {!isOwner && (
          <p className="text-[10px] text-slate-500 italic mt-0.5">👥 shared</p>
        )}
        {copied && (
          <p className="text-[10px] text-emerald-400 mt-0.5">Link copied!</p>
        )}
      </div>

      {/* Action buttons — visible on hover */}
      {hovered && (
        <div className="absolute top-1.5 right-1.5 flex gap-0.5">
          {/* WhatsApp */}
          <div className="relative">
            <button
              onClick={handleWhatsApp}
              title={trip.share_token ? "Share via WhatsApp" : "Generate share link first (🔗)"}
              className="w-5 h-5 rounded-md flex items-center justify-center
                text-slate-500 hover:text-green-400 hover:bg-green-950/40 transition-all text-[10px]"
            >
              📱
            </button>
            {waTooltip && (
              <div className="absolute right-0 top-6 z-50 whitespace-nowrap bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-[10px] text-slate-300 shadow-lg">
                Generate share link first (🔗)
              </div>
            )}
          </div>

          {/* Email */}
          <button
            onClick={e => { e.stopPropagation(); setShowEmailForm(v => !v); setShowCollabForm(false); }}
            title="Send trip by email"
            className="w-5 h-5 rounded-md flex items-center justify-center
              text-slate-500 hover:text-blue-400 hover:bg-blue-950/40 transition-all text-[10px]"
          >
            ✉️
          </button>

          {/* Collaborators — owner only */}
          {isOwner && (
            <button
              onClick={e => { e.stopPropagation(); setShowCollabForm(v => !v); setShowEmailForm(false); }}
              title="Invite collaborator"
              className="w-5 h-5 rounded-md flex items-center justify-center
                text-slate-500 hover:text-[#d4a017] hover:bg-purple-950/40 transition-all text-[10px]"
            >
              👥
            </button>
          )}

          {/* Share link */}
          {onShare && (
            <button
              onClick={handleShare}
              title="Copy share link"
              disabled={sharing}
              className="w-5 h-5 rounded-md flex items-center justify-center
                text-slate-500 hover:text-emerald-400 hover:bg-emerald-950/40
                transition-all text-[10px] disabled:opacity-50"
            >
              🔗
            </button>
          )}

          {/* Delete */}
          <button
            onClick={e => {
              e.stopPropagation();
              if (window.confirm(`Delete saved trip "${trip.name}"?`)) onDelete();
            }}
            title="Delete trip"
            className="w-5 h-5 rounded-md flex items-center justify-center
              text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition-all text-[10px]"
          >
            ✕
          </button>
        </div>
      )}

      {/* Email inline form */}
      {showEmailForm && (
        <div className="mx-2 mb-2 p-2.5 rounded-xl border border-blue-500/30 bg-blue-950/20" onClick={e => e.stopPropagation()}>
          <p className="text-[10px] font-bold text-blue-400 mb-1.5">✉️ Send trip by email</p>
          <input
            type="email"
            value={emailTo}
            onChange={e => setEmailTo(e.target.value)}
            placeholder="friend@email.com"
            className="w-full text-[11px] bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5
              text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/60 mb-1.5"
          />
          <textarea
            value={emailMsg}
            onChange={e => setEmailMsg(e.target.value)}
            placeholder="Add a note... (optional)"
            rows={2}
            className="w-full text-[11px] bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5
              text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/60 resize-none mb-2"
          />
          <div className="flex gap-1.5">
            <button
              onClick={handleSendEmail}
              disabled={sendingEmail || !emailTo.trim()}
              className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                text-white text-[11px] font-bold transition-all"
            >
              {emailSent ? "✓ Sent!" : sendingEmail ? "Sending…" : "Send"}
            </button>
            <button
              onClick={e => { e.stopPropagation(); setShowEmailForm(false); setEmailTo(""); setEmailMsg(""); }}
              className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400
                hover:text-white text-[11px] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Collaborator inline form */}
      {showCollabForm && (
        <div className="mx-2 mb-2 p-2.5 rounded-xl border border-[#1e3a8a]/30 bg-purple-950/20" onClick={e => e.stopPropagation()}>
          <p className="text-[10px] font-bold text-[#d4a017] mb-1.5">👥 Invite collaborator</p>
          <div className="flex gap-1 mb-1.5">
            <input
              type="email"
              value={collabEmail}
              onChange={e => setCollabEmail(e.target.value)}
              placeholder="Invite email..."
              onKeyDown={e => { if (e.key === "Enter") handleAddCollab(e as unknown as React.MouseEvent); }}
              className="flex-1 text-[11px] bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5
                text-slate-200 placeholder-slate-600 outline-none focus:border-[#1e3a8a]/60"
            />
            <button
              onClick={handleAddCollab}
              disabled={addingCollab || !collabEmail.trim()}
              className="px-2.5 py-1.5 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-50
                text-white text-[11px] font-bold transition-all"
            >
              Add
            </button>
          </div>
          {localCollabs.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {localCollabs.map(ce => (
                <span
                  key={ce}
                  className="flex items-center gap-1 text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full"
                >
                  {ce}
                  <button
                    onClick={e => handleRemoveCollab(e, ce)}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >✕</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function tripDestinationEmoji(destination: string): string {
  const d = destination.toLowerCase();
  if (d.includes("goa") || d.includes("beach") || d.includes("bali") || d.includes("phuket") || d.includes("maldive")) return "🏖️";
  if (d.includes("paris") || d.includes("rome") || d.includes("london") || d.includes("amsterdam") || d.includes("barcelona")) return "🏛️";
  if (d.includes("dubai") || d.includes("singapore") || d.includes("hong kong") || d.includes("nyc") || d.includes("new york")) return "🏙️";
  if (d.includes("manali") || d.includes("shimla") || d.includes("snow") || d.includes("alps") || d.includes("himalaya")) return "🏔️";
  if (d.includes("safari") || d.includes("kenya") || d.includes("serengeti") || d.includes("africa")) return "🦁";
  return "✈️";
}

export default function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onPin,
  onShare,
  isOpen,
  onClose,
  passengers = [],
  onEditPassenger,
  onDeletePassenger,
  onAddPassenger,
  alerts = [],
  onDeleteAlert,
  onEditAlert,
  savedTrips = [],
  onRecallTrip,
  onDeleteTrip,
  onShareTrip,
  onEmailTrip,
  onAddCollaborator,
  onRemoveCollaborator,
  userEmail,
  sessionUser,
  theme = "dark",
  onToggleTheme,
  connected = true,
  onSignOut,
  onEditPreferences,
  onEditEssentials,
}: Props) {
  const { locale, setLocale, t } = useLanguage();
  const [tab, setTab] = useState<"chats" | "passengers">("chats");
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  useEffect(() => {
    if (!userEmail) return;
    fetch(`${API_BASE}/api/agent/check`, { headers: { "X-User-Email": userEmail } })
      .then(r => r.json())
      .then(d => {
        setIsAdmin(!!d.is_admin);
        setIsAgent(!!d.is_agent || !!d.is_admin);
      })
      .catch(() => {});
  }, [userEmail, API_BASE]);

  const { supported: pushSupported, subscribed: pushSubscribed, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } =
    usePushNotifications(sessionUser?.email);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

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
            <BrandLogo size={32} />
          </div>
          {/* Search button */}
          <button
            onClick={() => setSearchOpen(true)}
            title="Search chats (⌘K)"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
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
            💬 {t("sidebar.chats")}
          </button>
          <button
            onClick={() => setTab("passengers")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all relative ${
              tab === "passengers"
                ? "bg-slate-700 text-slate-100 shadow"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            👤 {t("sidebar.passengers")}
            {passengers.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#1e40af] text-[9px] font-bold text-white flex items-center justify-center">
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
                  bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-medium
                  transition-colors shadow-lg shadow-[#0f172a]/30"
              >
                <span className="text-base">＋</span>
                {t("chat.newChat")}
              </button>
            </div>

            {/* ── Saved Trips ── */}
            {savedTrips.length > 0 && (
              <div className="px-2 mb-1">
                <p className="px-1 pt-1 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  🗺️ {t("sidebar.savedTrips")}
                </p>
                <div className="space-y-0.5 max-h-40 overflow-y-auto">
                  {savedTrips.map((trip) => (
                    <SavedTripRow
                      key={trip.id}
                      trip={trip}
                      isOwner={trip.is_owner !== false}
                      onRecall={() => { onRecallTrip?.(trip.id); onClose(); }}
                      onDelete={() => onDeleteTrip?.(trip.id)}
                      onShare={onShareTrip
                        ? async () => {
                            const shareUrl = await onShareTrip(trip.id);
                            if (!shareUrl) return null;
                            return window.location.origin + shareUrl;
                          }
                        : undefined
                      }
                      onEmail={onEmailTrip
                        ? async (toEmail, message) => onEmailTrip(trip.id, toEmail, message)
                        : undefined
                      }
                      onAddCollaborator={onAddCollaborator && trip.is_owner !== false
                        ? async (email) => {
                            const ok = await onAddCollaborator(trip.id, email);
                            return ok;
                          }
                        : undefined
                      }
                      onRemoveCollaborator={onRemoveCollaborator && trip.is_owner !== false
                        ? async (email) => {
                            const ok = await onRemoveCollaborator(trip.id, email);
                            return ok;
                          }
                        : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {sorted.length === 0 && (
                <p className="text-slate-600 text-xs text-center mt-8 px-4">
                  {t("sidebar.noConversations")}
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
                          ? "bg-[#1e3a8a]/20 border border-[#1e3a8a]/30"
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
                            className="flex-1 min-w-0 text-sm bg-slate-800 border border-[#1e3a8a]/60
                              rounded-lg px-2 py-1 text-slate-100 outline-none
                              focus:ring-1 focus:ring-[#1e3a8a]"
                          />
                          <button
                            onClick={() => commitRename(conv.id)}
                            className="shrink-0 w-6 h-6 rounded-md bg-[#1e3a8a] hover:bg-[#1e40af]
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
                            ${isActive ? "text-[#d4a017]" : "text-slate-300"}`}>
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

                      {/* ── Hover action buttons (share + pin + rename + delete) ── */}
                      {!isEditing && (
                        <div className="absolute top-2 right-2 flex gap-0.5
                          opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.stopPropagation(); onShare(conv.id); }}
                            className="w-5 h-5 rounded-md flex items-center justify-center
                              text-slate-500 hover:text-emerald-400 hover:bg-emerald-950/40 transition-all text-[11px]"
                            title="Copy share link"
                          >🔗</button>
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
                              text-slate-500 hover:text-[#d4a017] hover:bg-[#172554]/60 transition-all text-xs"
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

            {/* ── Quick links ── */}
            <div className="px-3 pb-2 flex flex-col gap-0.5">
              {isAgent && (
                <a href="/agent/dashboard" className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl hover:bg-slate-800/60 transition-all w-full" style={{ color: "#d4a017" }}>
                  {isAdmin ? "⚙️" : "📋"} <span>{isAdmin ? "Admin Panel" : "My Listings"}</span>
                </a>
              )}
              <a href="/explore" className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-300 rounded-xl hover:bg-slate-800/60 transition-all w-full">
                🌐 <span>Explore Listings</span>
              </a>
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
                  {/* Price alerts */}
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      🔔 Price Alerts
                      {alerts.length > 0 && (
                        <span className="ml-auto text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-semibold">
                          {alerts.length}
                        </span>
                      )}
                    </p>
                    {alerts.length === 0 ? (
                      <p className="text-[11px] text-slate-600 text-center py-1">
                        No active alerts. Click 🔔 on a flight.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {alerts.map(a => (
                          <AlertRow
                            key={a.id}
                            alert={a}
                            onEdit={() => { setShowUserMenu(false); onEditAlert?.(a); }}
                            onDelete={() => onDeleteAlert?.(a.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Push notifications toggle */}
                  {pushSupported && (
                    <div className="px-4 py-2.5 border-b border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{pushSubscribed ? "🔔" : "🔕"}</span>
                          <div>
                            <p className="text-xs font-semibold text-slate-300">Push Alerts</p>
                            <p className="text-[10px] text-slate-600">
                              {pushSubscribed ? "Notifications enabled" : "Get notified when prices drop"}
                            </p>
                          </div>
                        </div>
                        <button
                          disabled={pushLoading}
                          onClick={async () => {
                            setPushError(null);
                            setPushLoading(true);
                            try {
                              const ok = pushSubscribed ? await pushUnsubscribe() : await pushSubscribe();
                              if (!ok && !pushSubscribed) setPushError("Permission denied or not supported");
                            } catch {
                              setPushError("Something went wrong");
                            } finally {
                              setPushLoading(false);
                            }
                          }}
                          className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
                            pushLoading ? "opacity-50 cursor-not-allowed" :
                            pushSubscribed ? "bg-[#1e3a8a]" : "bg-slate-700"
                          }`}
                          title={pushSubscribed ? "Disable push notifications" : "Enable push notifications"}
                        >
                          {pushLoading ? (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                            </span>
                          ) : (
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                              pushSubscribed ? "translate-x-4" : "translate-x-0.5"
                            }`} />
                          )}
                        </button>
                      </div>
                      {pushError && (
                        <p className="text-[10px] text-red-400 mt-1">{pushError}</p>
                      )}
                    </div>
                  )}

                  {/* Language selector */}
                  <div className="border-t border-slate-700/50 mt-2 pt-2 pb-2">
                    <p className="text-xs text-slate-500 px-3 pb-1">{t("language.select")}</p>
                    <div className="flex gap-1 px-3 flex-wrap">
                      {(([["en", "🇬🇧"], ["hi", "🇮🇳"], ["ar", "🇦🇪"], ["ta", "🇮🇳"]] as [Locale, string][])).map(([l, flag]) => (
                        <button
                          key={l}
                          onClick={() => setLocale(l)}
                          className={`px-2 py-0.5 rounded text-xs transition-all ${
                            locale === l
                              ? "bg-[#1e3a8a] text-white"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {flag} {t(`language.${l}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Travel preferences */}
                  {onEditPreferences && (
                    <button
                      onClick={() => { setShowUserMenu(false); onEditPreferences(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Travel preferences
                    </button>
                  )}

                  {/* Packing essentials */}
                  {onEditEssentials && (
                    <button
                      onClick={() => { setShowUserMenu(false); onEditEssentials(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
                    >
                      <span className="text-base shrink-0">🎒</span>
                      My packing essentials
                    </button>
                  )}

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
                      <div className="w-7 h-7 rounded-full bg-[#1e3a8a] flex items-center justify-center text-xs font-semibold text-white shrink-0">
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
                  bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-medium
                  transition-colors shadow-lg shadow-[#0f172a]/30"
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

      {/* Search modal */}
      {searchOpen && (
        <ConversationSearchModal
          conversations={conversations}
          onSelect={(id) => { onSelect(id); onClose(); }}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </>
  );
}
