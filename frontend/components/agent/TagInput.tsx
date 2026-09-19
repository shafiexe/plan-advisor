"use client";
import { useState, KeyboardEvent } from "react";

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export default function TagInput({ value, onChange, placeholder = "Type and press Enter", className = "" }: Props) {
  const [input, setInput] = useState("");

  const add = () => {
    const tag = input.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setInput("");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); add(); }
    if (e.key === "Backspace" && !input && value.length > 0) onChange(value.slice(0, -1));
  };

  return (
    <div className={`flex flex-wrap gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 min-h-[44px] focus-within:border-[#d4a017] transition-colors ${className}`}>
      {value.map(tag => (
        <span key={tag} className="flex items-center gap-1 text-xs bg-slate-700 text-slate-200 px-2 py-1 rounded-lg">
          {tag}
          <button onClick={() => onChange(value.filter(t => t !== tag))} className="text-slate-400 hover:text-red-400 ml-0.5">×</button>
        </span>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none" />
    </div>
  );
}
