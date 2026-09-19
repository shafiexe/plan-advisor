"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MarkdownBody from "@/components/MarkdownBody";
import BrandLogo from "@/components/BrandLogo";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Message = { id: string; role: string; content: string; timestamp?: number };

type SharedConv = {
  title: string;
  messages: Message[];
  sharedAt: number;
};

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [conv, setConv] = useState<SharedConv | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/user/share/${token}`)
      .then(r => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setConv)
      .catch(() => setError("This share link is invalid or has been revoked."));
  }, [token]);

  if (error) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-5xl mb-4">🔗</div>
        <p className="text-slate-300 text-lg font-medium">Link not found</p>
        <p className="text-slate-500 text-sm mt-2">{error}</p>
        <a href="/" className="mt-6 inline-block px-4 py-2 rounded-xl text-white text-sm font-medium transition-colors" style={{ background: "#1e3a8a" }}>
          Open planadviros
        </a>
      </div>
    </div>
  );

  if (!conv) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#1e3a8a] border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandLogo size={28} />
            <p className="text-[11px] text-slate-500 ml-1">Shared trip plan</p>
          </div>
          <a
            href="/"
            className="px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-colors"
            style={{ background: "#1e3a8a" }}
          >
            Plan your trip →
          </a>
        </div>
      </div>

      {/* Conversation */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-100 mb-1">{conv.title}</h1>
        <p className="text-xs text-slate-500 mb-8">
          Shared on {new Date(conv.sharedAt).toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="flex flex-col gap-4">
          {conv.messages.filter(m => m.role !== "tool").map((m, i) => (
            <div key={m.id ?? i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="mr-2 mt-1 shrink-0">
                  <BrandLogo variant="icon" size={28} />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm
                ${m.role === "user"
                  ? "bg-[#1e3a8a] text-white rounded-br-sm"
                  : "bg-slate-800/80 text-slate-200 rounded-bl-sm border border-slate-700/40"}`}
              >
                {m.role === "user"
                  ? <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  : <MarkdownBody text={m.content} />
                }
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-600 mb-3">Want to plan your own trip?</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-colors shadow-lg"
            style={{ background: "#1e3a8a" }}
          >
            Try planadviros free →
          </a>
        </div>
      </div>
    </div>
  );
}
