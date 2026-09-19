"use client";
import { useState } from "react";

interface Props {
  value: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}

export default function ChecklistBuilder({ value, onChange, placeholder = "Add item…" }: Props) {
  const [input, setInput] = useState("");

  const add = () => {
    const item = input.trim();
    if (item) { onChange([...value, item]); setInput(""); }
  };

  const update = (i: number, v: string) => onChange(value.map((x, idx) => idx === i ? v : x));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-2">
      {value.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-slate-500 text-xs w-5 text-right flex-shrink-0">{i + 1}.</span>
          <input value={item} onChange={e => update(i, e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-[#d4a017]" />
          <button onClick={() => remove(i)} className="text-slate-500 hover:text-red-400 text-lg leading-none flex-shrink-0">×</button>
        </div>
      ))}
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017]" />
        <button onClick={add} className="px-3 py-2 text-sm font-semibold text-white rounded-lg transition-all" style={{ background: "#1e3a8a" }}>+</button>
      </div>
    </div>
  );
}
