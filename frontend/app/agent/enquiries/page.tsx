"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import ChatPanel from "@/components/agent/ChatPanel";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function useAgentEmail() {
  const { data: session } = useSession();
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    if (session?.user?.email) { setEmail(session.user.email); return; }
    try {
      const raw = localStorage.getItem("pa_agent_session");
      if (raw) { const s = JSON.parse(raw); if (s.email) setEmail(s.email); }
    } catch {}
  }, [session]);
  return email;
}

interface Enquiry {
  id: number;
  listing_type: string;
  listing_id: number;
  listing_title: string;
  enquirer_name: string;
  enquirer_email: string;
  enquirer_phone: string;
  travel_date: string;
  num_travelers: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface ChatRoom {
  room_id: string;
  other_email: string;
  last_message: string;
  last_ts: string | null;
  unread: number;
}

const TYPE_EMOJI: Record<string, string> = { package: "🌍", ticket: "🎫", visa: "🛂" };
const TYPE_LABEL: Record<string, string> = { package: "Package", ticket: "Ticket", visa: "Visa" };

export default function EnquiriesPage() {
  const agentEmail = useAgentEmail();
  const [tab, setTab] = useState<"enquiries" | "chats">("enquiries");

  // Enquiries state
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [enqLoading, setEnqLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  // Chats state
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);

  const fetchEnquiries = async () => {
    if (!agentEmail) return;
    setEnqLoading(true);
    try {
      const res = await fetch(`${API}/api/agent/enquiries`, { headers: { "X-User-Email": agentEmail } });
      const data = await res.json();
      setEnquiries(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setEnqLoading(false); }
  };

  const fetchRooms = async () => {
    if (!agentEmail) return;
    setRoomsLoading(true);
    try {
      const res = await fetch(`${API}/api/chat/rooms`, { headers: { "X-User-Email": agentEmail } });
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setRoomsLoading(false); }
  };

  useEffect(() => { fetchEnquiries(); }, [agentEmail]); // eslint-disable-line
  useEffect(() => { if (tab === "chats") fetchRooms(); }, [tab, agentEmail]); // eslint-disable-line

  const markRead = async (id: number) => {
    if (!agentEmail) return;
    await fetch(`${API}/api/agent/enquiries/${id}/read`, { method: "PATCH", headers: { "X-User-Email": agentEmail } });
    setEnquiries(prev => prev.map(e => e.id === id ? { ...e, is_read: true } : e));
  };

  const toggle = (id: number) => {
    setExpanded(prev => prev === id ? null : id);
    const enq = enquiries.find(e => e.id === id);
    if (enq && !enq.is_read) markRead(id);
  };

  const shown = enquiries.filter(e =>
    filter === "unread" ? !e.is_read :
    filter === "read"   ? e.is_read  : true
  );

  const unreadEnq = enquiries.filter(e => !e.is_read).length;
  const unreadChat = rooms.reduce((s, r) => s + r.unread, 0);

  return (
    <div className="p-6 max-w-3xl flex flex-col gap-5" style={{ height: "calc(100vh - 48px)" }}>
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Enquiries & Chats</h1>
        <p className="text-slate-400 text-sm mt-0.5">Messages and enquiries from travellers</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-900 p-1 rounded-xl w-fit">
        <button onClick={() => setTab("enquiries")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === "enquiries" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}>
          Enquiries
          {unreadEnq > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "#d4a01730", color: "#d4a017" }}>{unreadEnq}</span>}
        </button>
        <button onClick={() => setTab("chats")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === "chats" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}>
          Chats
          {unreadChat > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "#d4a01730", color: "#d4a017" }}>{unreadChat}</span>}
        </button>
      </div>

      {/* ── Enquiries tab ── */}
      {tab === "enquiries" && (
        <>
          <div className="flex gap-1 bg-slate-900 p-1 rounded-xl w-fit">
            {(["all", "unread", "read"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${filter === f ? "bg-slate-700/60 text-white" : "text-slate-400 hover:text-slate-200"}`}>
                {f}
              </button>
            ))}
          </div>

          {enqLoading ? (
            <div className="flex flex-col gap-3">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}
            </div>
          ) : shown.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-slate-300 font-semibold">
                {filter === "unread" ? "No unread enquiries" : filter === "read" ? "No read enquiries" : "No enquiries yet"}
              </p>
              <p className="text-slate-500 text-sm mt-1">Enquiries from travellers about your listings appear here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto">
              {shown.map(enq => {
                const isOpen = expanded === enq.id;
                return (
                  <div key={enq.id}
                    className={`bg-slate-900 border rounded-xl transition-all cursor-pointer ${!enq.is_read ? "border-[#d4a017]/40" : "border-slate-800 hover:border-slate-700"}`}
                    onClick={() => toggle(enq.id)}>
                    <div className="flex items-center gap-3 p-4">
                      <div className="text-2xl shrink-0">{TYPE_EMOJI[enq.listing_type] || "💬"}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white truncate">{enq.enquirer_name || "Anonymous"}</span>
                          {!enq.is_read && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#d4a017" }} />}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{TYPE_LABEL[enq.listing_type]} enquiry</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          Re: {enq.listing_title} · {new Date(enq.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <span className="text-slate-600 text-xs">{isOpen ? "▲" : "▼"}</span>
                    </div>
                    {isOpen && (
                      <div className="border-t border-slate-800 p-4 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                        {enq.message && (
                          <div className="bg-slate-800/60 rounded-xl p-3">
                            <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Message</p>
                            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{enq.message}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {enq.travel_date && <div><p className="text-xs text-slate-500">Travel date</p><p className="text-slate-200 font-medium">{enq.travel_date}</p></div>}
                          {enq.num_travelers > 0 && <div><p className="text-xs text-slate-500">Travellers</p><p className="text-slate-200 font-medium">{enq.num_travelers}</p></div>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {enq.enquirer_phone && (
                            <a href={`https://wa.me/${enq.enquirer_phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-green-300 bg-green-900/20 hover:bg-green-900/40 transition-all">
                              💬 WhatsApp
                            </a>
                          )}
                          {enq.enquirer_phone && (
                            <a href={`tel:${enq.enquirer_phone}`}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-blue-300 bg-blue-900/20 hover:bg-blue-900/40 transition-all">
                              📞 Call
                            </a>
                          )}
                          {enq.enquirer_email && (
                            <button
                              onClick={() => {
                                if (!agentEmail) return;
                                const roomId = [agentEmail, enq.enquirer_email].sort().join(":");
                                setActiveRoom({ room_id: roomId, other_email: enq.enquirer_email, last_message: "", last_ts: null, unread: 0 });
                                setTab("chats");
                              }}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                              style={{ color: "#d4a017", background: "#d4a01715" }}>
                              💬 Chat
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Chats tab ── */}
      {tab === "chats" && (
        <div className="flex flex-1 gap-4 min-h-0">
          {/* Room list */}
          <div className="w-64 shrink-0 flex flex-col gap-2 overflow-y-auto">
            {roomsLoading ? (
              <div className="text-slate-500 text-sm">Loading…</div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-slate-500 text-sm">No chats yet.</p>
                <p className="text-slate-600 text-xs mt-1">Chats started from enquiries appear here.</p>
              </div>
            ) : rooms.map(r => (
              <button key={r.room_id} onClick={() => setActiveRoom(r)}
                className={`text-left px-3 py-3 rounded-xl border transition-all ${activeRoom?.room_id === r.room_id ? "border-[#d4a017]/50 bg-slate-800" : "border-slate-800 bg-slate-900 hover:border-slate-700"}`}>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-medium text-white truncate">{r.other_email}</span>
                  {r.unread > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full font-bold shrink-0" style={{ background: "#d4a017", color: "#000" }}>{r.unread}</span>}
                </div>
                {r.last_message && <p className="text-xs text-slate-500 truncate mt-0.5">{r.last_message}</p>}
              </button>
            ))}
          </div>

          {/* Chat panel */}
          <div className="flex-1 min-h-0">
            {activeRoom && agentEmail ? (
              <ChatPanel
                roomId={activeRoom.room_id}
                myEmail={agentEmail}
                otherEmail={activeRoom.other_email}
              />
            ) : (
              <div className="h-full flex items-center justify-center border border-slate-800 rounded-2xl">
                <p className="text-slate-500 text-sm">Select a chat to open it</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
