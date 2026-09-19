"use client";

interface PickupPoint { location: string; time: string; }
interface Props { value: PickupPoint[]; onChange: (pts: PickupPoint[]) => void; }

export default function PickupPointsBuilder({ value, onChange }: Props) {
  const add = () => onChange([...value, { location: "", time: "" }]);
  const update = (i: number, field: keyof PickupPoint, v: string) =>
    onChange(value.map((p, idx) => idx === i ? { ...p, [field]: v } : p));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-2">
      {value.length === 0 && (
        <p className="text-xs text-slate-500 italic">No pickup points added. Main departure point is sufficient.</p>
      )}
      {value.map((pt, i) => (
        <div key={i} className="grid grid-cols-[1fr_120px_32px] gap-2 items-center">
          <input value={pt.location} onChange={e => update(i, "location", e.target.value)}
            placeholder="Location / landmark"
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017]" />
          <input value={pt.time} onChange={e => update(i, "time", e.target.value)}
            placeholder="HH:MM"
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017]" />
          <button onClick={() => remove(i)} className="text-slate-500 hover:text-red-400 text-lg leading-none text-center">×</button>
        </div>
      ))}
      <button onClick={add} className="text-sm text-[#1e40af] hover:text-[#d4a017] transition-colors font-medium text-left mt-1">+ Add pickup point</button>
    </div>
  );
}
