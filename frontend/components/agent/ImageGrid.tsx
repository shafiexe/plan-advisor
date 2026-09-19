"use client";
import { useState } from "react";

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
}

export default function ImageGrid({ value, onChange, maxImages = 8 }: Props) {
  const [input, setInput] = useState("");

  const add = () => {
    const url = input.trim();
    if (url && !value.includes(url) && value.length < maxImages) { onChange([...value, url]); setInput(""); }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-2">
        {value.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-800 border border-slate-700 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = ""; }} />
            <button onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              className="absolute top-1 right-1 w-5 h-5 bg-red-600 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              ×
            </button>
            {i === 0 && <span className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">Cover</span>}
          </div>
        ))}
        {value.length < maxImages && (
          <div className="aspect-square rounded-lg border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-2xl">+</div>
        )}
      </div>
      {value.length < maxImages && (
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())}
            placeholder="Paste image URL…"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017]" />
          <button onClick={add} className="px-4 py-2 text-sm font-semibold text-white rounded-lg" style={{ background: "#1e3a8a" }}>Add</button>
        </div>
      )}
      <p className="text-xs text-slate-500">{value.length}/{maxImages} images · First image is the cover photo</p>
    </div>
  );
}
