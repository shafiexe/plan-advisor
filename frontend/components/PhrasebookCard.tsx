"use client";

import { useState } from "react";
import type { Phrasebook, Phrase } from "@/types/phrasebook";

type Props = { data: Phrasebook };

function PhraseRow({ phrase }: { phrase: Phrase }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(phrase.pronunciation).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <tr className="even:bg-slate-800/40 odd:bg-slate-900/60">
      <td className="px-3 py-2 text-sm text-slate-300">{phrase.english}</td>
      <td className="px-3 py-2 text-sm text-slate-200 font-medium">{phrase.local}</td>
      <td className="px-3 py-2">
        <button
          onClick={handleCopy}
          title="Copy pronunciation"
          className="text-xs text-[#d4a017] italic hover:text-[#d4a017] transition-colors text-left"
        >
          {copied ? (
            <span className="text-emerald-400 not-italic font-medium">Copied!</span>
          ) : (
            phrase.pronunciation
          )}
        </button>
      </td>
    </tr>
  );
}

export default function PhrasebookCard({ data }: Props) {
  const [activeTab, setActiveTab] = useState(0);

  if (data.error || !data.categories?.length) return null;

  const activeCategory = data.categories[activeTab];

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900 shadow-lg">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-700/50 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <span className="font-semibold text-slate-200 text-sm">
            {data.language} Phrasebook
          </span>
          <span className="text-xs text-slate-500">{data.destination}</span>
        </div>
        {data.script && data.script !== "Latin" && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e3a8a]/20 text-[#d4a017] border border-[#1e3a8a]/30">
            {data.script} script
          </span>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex overflow-x-auto scrollbar-none border-b border-slate-700/40 bg-slate-900">
        {data.categories.map((cat, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs whitespace-nowrap transition-colors shrink-0
              ${activeTab === i
                ? "text-[#d4a017] border-b-2 border-[#1e40af] bg-[#172554]/30"
                : "text-slate-400 hover:text-slate-200 border-b-2 border-transparent"}`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Phrases table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-800/50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">English</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Local</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Pronunciation <span className="text-[10px] text-slate-500 normal-case">(tap to copy)</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {activeCategory?.phrases.map((phrase, i) => (
              <PhraseRow key={i} phrase={phrase} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Tip */}
      {data.tip && (
        <div className="px-4 py-2.5 bg-slate-800/30 border-t border-slate-700/40">
          <p className="text-xs text-slate-400 italic">💡 {data.tip}</p>
        </div>
      )}
    </div>
  );
}
