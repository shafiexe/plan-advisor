"use client";
import { useEffect, useRef, useState } from "react";

const WS_BASE = (process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws/chat")
  .replace(/\/ws\/chat$/, "");

interface Msg {
  id?: number;
  sender: string;
  content: string;
  ts: string;
}

interface Props {
  roomId: string;
  myEmail: string;
  otherEmail: string;
  onClose?: () => void;
}

export default function ChatPanel({ roomId, myEmail, otherEmail, onClose }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = `${WS_BASE}/ws/agent-chat/${encodeURIComponent(roomId)}?user_email=${encodeURIComponent(myEmail)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "history") {
        setMessages(data.messages ?? []);
      } else if (data.type === "message") {
        setMessages(prev => [...prev, { id: data.id, sender: data.sender, content: data.content, ts: data.ts }]);
      }
    };

    return () => { ws.close(); };
  }, [roomId, myEmail]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ content: text }));
    setInput("");
  };

  const fmt = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-slate-600"}`} />
          <span className="text-sm font-semibold text-white truncate max-w-[200px]">{otherEmail}</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg leading-none">×</button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {messages.length === 0 && (
          <p className="text-slate-600 text-sm text-center mt-8">No messages yet. Say hello!</p>
        )}
        {messages.map((m, i) => {
          const mine = m.sender === myEmail;
          return (
            <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                mine
                  ? "text-black rounded-br-sm"
                  : "bg-slate-800 text-slate-200 rounded-bl-sm"
              }`} style={mine ? { background: "#d4a017" } : {}}>
                <p className="leading-snug">{m.content}</p>
                <p className={`text-xs mt-0.5 ${mine ? "text-black/50 text-right" : "text-slate-500"}`}>{fmt(m.ts)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-3 border-t border-slate-800 bg-slate-900">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          placeholder={connected ? "Type a message…" : "Connecting…"}
          disabled={!connected}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#d4a017] disabled:opacity-40"
        />
        <button
          onClick={send}
          disabled={!connected || !input.trim()}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-black disabled:opacity-40 transition-all"
          style={{ background: "#d4a017" }}>
          Send
        </button>
      </div>
    </div>
  );
}
