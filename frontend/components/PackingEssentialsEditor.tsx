"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SUGGESTIONS = [
  "Phone charger", "Earphones", "Sunglasses", "Umbrella", "Power bank",
  "Wallet", "ID card", "Hand sanitizer", "Lip balm", "Medicines",
  "Toothbrush", "Toothpaste", "Deodorant", "Hair brush", "Belt",
  "Extra socks", "Chappal", "Pen", "Notebook",
];

type Props = {
  userEmail: string;
  initialEssentials: string[];
  currentPrefs: Record<string, unknown>;
  onClose: () => void;
  onSave: (items: string[]) => void;
};

export default function PackingEssentialsEditor({
  userEmail,
  initialEssentials,
  currentPrefs,
  onClose,
  onSave,
}: Props) {
  const [items, setItems] = useState<string[]>(initialEssentials);
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItem = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (items.some((i) => i.toLowerCase() === trimmed.toLowerCase())) return;
    setItems((prev) => [...prev, trimmed]);
    setNewItem("");
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const resp = await fetch(`${API}/api/user/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": userEmail,
        },
        body: JSON.stringify({ ...currentPrefs, packing_essentials: items }),
      });
      if (!resp.ok) throw new Error("Failed to save");
      onSave(items);
      onClose();
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700/60 shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎒</span>
            <div>
              <h2 className="text-sm font-bold text-slate-100">My Packing Essentials</h2>
              <p className="text-[11px] text-slate-500">Always included in your packing lists</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

          {/* Current items */}
          {items.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {items.map((item, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 bg-slate-800 text-slate-200 text-xs px-2 py-1 rounded-full border border-slate-700/60"
                >
                  {item}
                  <button
                    onClick={() => removeItem(i)}
                    className="ml-0.5 text-slate-500 hover:text-red-400 transition-colors leading-none"
                    aria-label={`Remove ${item}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              No essentials yet. Add items below and they will appear in every packing list.
            </p>
          )}

          {/* Add item input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addItem(newItem); }
              }}
              placeholder="Add an item…"
              className="flex-1 bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#1e3a8a]/60"
            />
            <button
              onClick={() => addItem(newItem)}
              disabled={!newItem.trim()}
              className="px-3 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
            >
              Add
            </button>
          </div>

          {/* Suggestions */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Quick add
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.filter(
                (s) => !items.some((i) => i.toLowerCase() === s.toLowerCase())
              ).map((s) => (
                <button
                  key={s}
                  onClick={() => addItem(s)}
                  className="text-[11px] px-2 py-1 rounded-full border border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-[#1e3a8a]/60 hover:bg-[#172554]/30 transition-all"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-700/40 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-slate-700/60 text-slate-400 hover:text-slate-200 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-60 text-white text-sm font-semibold transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
