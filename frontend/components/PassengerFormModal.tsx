"use client";

import { useState, useRef, useCallback, useEffect, DragEvent, ChangeEvent } from "react";
import { useSession } from "next-auth/react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* ── Types ───────────────────────────────────────────────── */
export type PassengerRecord = {
  id?: number;
  label: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  passport_number: string;
  nationality: string;
  expiry_date: string;
  email: string;
  phone: string;
};

type ScannedData = {
  surname?: string | null;
  given_names?: string | null;
  passport_number?: string | null;
  nationality?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  expiry_date?: string | null;
};

type ScanMatch =
  | { type: "same";    passenger: PassengerRecord }   // identical details already saved
  | { type: "renewed"; passenger: PassengerRecord }   // same person, new passport details
  | null;

const REQUIRED: (keyof PassengerRecord)[] = [
  "first_name", "last_name", "date_of_birth",
  "gender", "passport_number", "nationality", "expiry_date",
];

const FIELD_LABELS: Record<string, string> = {
  first_name: "First Name", last_name: "Last Name",
  date_of_birth: "Date of Birth", gender: "Gender",
  passport_number: "Passport Number", nationality: "Nationality",
  expiry_date: "Expiry Date", email: "Email", phone: "Phone",
};

const EMPTY: PassengerRecord = {
  label: "", first_name: "", last_name: "", date_of_birth: "",
  gender: "", passport_number: "", nationality: "",
  expiry_date: "", email: "", phone: "",
};

/* ── Helpers ─────────────────────────────────────────────── */
function isAccepted(f: File) {
  return f.type.startsWith("image/") || f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
}
function authHdrs(email: string): HeadersInit {
  return { "Content-Type": "application/json", "X-User-Email": email };
}
function missingRequired(p: PassengerRecord): (keyof PassengerRecord)[] {
  return REQUIRED.filter(f => !(p[f] as string)?.trim());
}
function isExpired(dateStr: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}
function sameName(a: PassengerRecord, b: PassengerRecord) {
  return (
    a.first_name.trim().toLowerCase() === b.first_name.trim().toLowerCase() &&
    a.last_name.trim().toLowerCase() === b.last_name.trim().toLowerCase()
  );
}

/* ── Sub-components ─────────────────────────────────────── */
function Field({
  label, value, onChange, type = "text",
  required = false, missing = false, highlight = false, half = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; missing?: boolean; highlight?: boolean; half?: boolean;
}) {
  return (
    <div className={half ? "flex-1 min-w-0" : "w-full"}>
      <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
        {label}
        {required && <span className="text-red-400">*</span>}
        {missing && (
          <span className="ml-auto text-[9px] font-bold text-red-400 bg-red-950/60 border border-red-500/40 px-1.5 py-0.5 rounded-full normal-case tracking-normal">
            Required
          </span>
        )}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full rounded-lg px-3 py-2.5 text-sm bg-slate-800/80 border
          text-slate-100 placeholder-slate-600 outline-none transition-all duration-500
          focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500
          ${missing
            ? "border-red-500/70 bg-red-950/20 ring-1 ring-red-500/20"
            : highlight
              ? "border-emerald-500/70 bg-emerald-950/30 ring-1 ring-emerald-500/30"
              : "border-slate-700/60 hover:border-slate-600"
          }`}
        placeholder={missing ? `Enter ${label.toLowerCase()}` : `${label}…`}
      />
    </div>
  );
}

function GenderToggle({ value, onChange, missing }: { value: string; onChange: (v: string) => void; missing: boolean }) {
  return (
    <div className="flex-1 min-w-0">
      <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
        Gender<span className="text-red-400">*</span>
        {missing && (
          <span className="ml-auto text-[9px] font-bold text-red-400 bg-red-950/60 border border-red-500/40 px-1.5 py-0.5 rounded-full normal-case tracking-normal">
            Required
          </span>
        )}
      </label>
      <div className={`flex rounded-lg overflow-hidden border transition-all ${missing ? "border-red-500/70" : "border-slate-700/60"}`}>
        {["M", "F"].map(g => (
          <button key={g} type="button" onClick={() => onChange(g)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-all
              ${value === g ? "bg-indigo-600 text-white" : "bg-slate-800/80 text-slate-400 hover:text-white"}`}
          >
            {g === "M" ? "Male" : "Female"}
          </button>
        ))}
      </div>
    </div>
  );
}

function Section({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 mt-1">
      <div className="h-px flex-1 bg-slate-700/60" />
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{children}</span>
      <div className="h-px flex-1 bg-slate-700/60" />
    </div>
  );
}

function PassengerCard({
  p, active, onSelect, onDelete,
}: { p: PassengerRecord; active: boolean; onSelect: () => void; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const initials = `${p.first_name?.[0] ?? ""}${p.last_name?.[0] ?? ""}`.toUpperCase() || "?";
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown";
  const expired = isExpired(p.expiry_date);

  if (confirming) {
    return (
      <div className="relative flex-shrink-0 w-32 rounded-xl border border-red-500/60 bg-red-950/30 p-3 flex flex-col items-center justify-center gap-2">
        <p className="text-[11px] font-semibold text-red-300 text-center leading-tight">Remove {name}?</p>
        <div className="flex gap-1.5 w-full">
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="flex-1 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold transition-all"
          >
            Delete
          </button>
          <button
            onClick={e => { e.stopPropagation(); setConfirming(false); }}
            className="flex-1 py-1 rounded-lg border border-slate-600 text-slate-400 hover:text-white text-[10px] font-semibold transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      className={`relative flex-shrink-0 w-32 rounded-xl border p-3 cursor-pointer transition-all
        ${active
          ? "border-indigo-400/70 bg-indigo-950/50 ring-1 ring-indigo-500/30"
          : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600/80"
        }`}
    >
      {active && (
        <span className="absolute -top-2 right-2 text-[9px] font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">
          Active
        </span>
      )}
      {expired && !active && (
        <span className="absolute -top-2 left-2 text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
          Expired
        </span>
      )}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white mb-2">
        {initials}
      </div>
      <p className="text-xs font-semibold text-slate-200 truncate">{name}</p>
      <p className="text-[10px] text-slate-500 truncate">{p.label || "Passenger"}</p>
      {p.passport_number && (
        <p className="text-[9px] text-slate-600 mt-0.5 font-mono">{p.passport_number.slice(0, 3)}···</p>
      )}
      <button
        onClick={e => { e.stopPropagation(); setConfirming(true); }}
        className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center
          text-slate-600 hover:text-red-400 hover:bg-red-950/50 transition-all text-xs"
        title="Remove passenger"
      >✕</button>
    </div>
  );
}

/* ── Text Paste Zone ────────────────────────────────────── */
function TextPasteZone({ onExtracted }: { onExtracted: (data: ScannedData) => void }) {
  const [open, setOpen]       = useState(false);
  const [text, setText]       = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleParse = async () => {
    if (!text.trim()) return;
    setParsing(true);
    setError(null);
    try {
      const resp = await fetch(`${API}/api/passport/parse-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).detail ?? "Parse failed");
      const data = (await resp.json()).data ?? {};
      onExtracted(data);
      setText("");
      setOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not extract details — check the text and try again.");
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 overflow-hidden">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setError(null); }}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-slate-800/60 transition-all"
      >
        <span className="text-base">📋</span>
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-300">Paste passenger details as text</p>
          <p className="text-[10px] text-slate-500">Copy from any source — ticket, email, note, or just type it out</p>
        </div>
        <span className={`text-slate-500 text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-2.5">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={5}
            placeholder={"Paste or type any text containing passenger details:\n\nName: John Smith\nPassport: A1234567\nDOB: 1985-03-22\nNationality: British\nExpiry: 2030-03-21\nGender: M"}
            className="w-full rounded-lg px-3 py-2.5 text-xs bg-slate-900/80 border border-slate-700/60
              text-slate-200 placeholder-slate-600 outline-none resize-none
              focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
          />
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          <button
            type="button"
            onClick={handleParse}
            disabled={parsing || !text.trim()}
            className="self-end px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold
              transition-all active:scale-95 disabled:opacity-40 flex items-center gap-1.5"
          >
            {parsing
              ? <><span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />Extracting…</>
              : "Extract Details"
            }
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Upload Zone ─────────────────────────────────────────── */
function UploadZone({
  label = "Upload Passport Photo or PDF",
  sublabel = "JPEG · PNG · WebP · PDF — auto-fills all details",
  scanning,
  previewUrl,
  scanError,
  missingCount,
  onFile,
}: {
  label?: string;
  sublabel?: string;
  scanning: boolean;
  previewUrl: string | null;
  scanError: string | null;
  missingCount: number;
  onFile: (f: File) => void;
}) {
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e: DragEvent) => {
        e.preventDefault(); setDrag(false);
        const f = e.dataTransfer.files[0];
        if (f && isAccepted(f)) onFile(f);
      }}
      onClick={() => !scanning && ref.current?.click()}
      className={`relative rounded-xl border-2 border-dashed cursor-pointer transition-all overflow-hidden
        ${drag ? "border-indigo-400 bg-indigo-950/40"
        : scanning ? "border-amber-500/60 bg-amber-950/20 cursor-wait"
        : previewUrl ? "border-slate-600/60 bg-slate-800/30"
        : "border-slate-600/50 bg-slate-800/30 hover:border-indigo-500/60 hover:bg-indigo-950/20"}`}
    >
      <input ref={ref} type="file" accept="image/*,.pdf,application/pdf" className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = "";
        }} />

      {scanning && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="w-10 h-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <p className="text-sm font-semibold text-amber-300">Reading passport…</p>
          <p className="text-[11px] text-slate-500">Takes 2–3 seconds</p>
        </div>
      )}

      {previewUrl && !scanning && (
        <div className="flex items-center gap-4 p-4">
          {previewUrl === "pdf" ? (
            <div className="w-20 h-14 rounded-lg border border-slate-600/60 shrink-0 bg-slate-800/60 flex flex-col items-center justify-center gap-1">
              <span className="text-xl">📄</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase">PDF</span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Passport" className="w-20 h-14 object-cover rounded-lg border border-slate-600/60 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            {scanError
              ? <p className="text-xs text-red-400 font-medium">{scanError}</p>
              : (
                <>
                  <p className="text-xs font-semibold text-emerald-400">✓ Scanned successfully</p>
                  {missingCount > 0 && (
                    <p className="text-[11px] text-amber-400 mt-0.5">
                      {missingCount} field{missingCount !== 1 ? "s" : ""} need manual entry below
                    </p>
                  )}
                </>
              )
            }
            <p className="text-[11px] text-slate-500 mt-1">Tap to upload a different photo</p>
          </div>
        </div>
      )}

      {!previewUrl && !scanning && (
        <div className="flex flex-col items-center gap-2 py-5 px-4 text-center">
          <div className="text-3xl">📷</div>
          <p className="text-sm font-semibold text-slate-300">{label}</p>
          <p className="text-[11px] text-slate-500">{sublabel}</p>
        </div>
      )}
    </div>
  );
}

/* ── Main modal ─────────────────────────────────────────── */
export default function PassengerFormModal({
  bookingLink,
  onClose,
  initialFile,
  initialPassengerId,
  onPassengersChange,
}: {
  bookingLink?: string;
  onClose: () => void;
  initialFile?: File | null;
  initialPassengerId?: number;
  onPassengersChange?: (passengers: PassengerRecord[]) => void;
}) {
  const { data: session } = useSession();
  const userEmail = session?.user?.email ?? null;

  const [savedPassengers, setSavedPassengers] = useState<PassengerRecord[]>([]);
  const [activePassengerId, setActivePassengerId] = useState<number | null>(null);
  const [form, setForm]               = useState<PassengerRecord>({ ...EMPTY });
  const [highlightedFields, setHL]    = useState<Set<keyof PassengerRecord>>(new Set());
  const [showMissing, setShowMissing] = useState(false);
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [scanning, setScanning]       = useState(false);
  const [scanError, setScanError]     = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [duplicateOf, setDuplicateOf] = useState<PassengerRecord | null>(null);
  const [scanMatch, setScanMatch]     = useState<ScanMatch>(null);

  const prevUrlRef          = useRef<string | null>(null);
  const scannedFileRef      = useRef<File | null>(null);
  // Ref so scanFile always sees the current list without needing it as a dep
  const savedPassengersRef  = useRef<PassengerRecord[]>([]);
  const setField = useCallback((key: keyof PassengerRecord) => (v: string) =>
    setForm(p => ({ ...p, [key]: v })), []);

  /* ── Publish list changes upward ─── */
  const publish = useCallback((list: PassengerRecord[]) => {
    savedPassengersRef.current = list;
    setSavedPassengers(list);
    onPassengersChange?.(list);
  }, [onPassengersChange]);

  /* ── Load saved passengers ─── */
  useEffect(() => {
    if (!userEmail) return;
    fetch(`${API}/api/user/passengers`, { headers: { "X-User-Email": userEmail } })
      .then(r => r.ok ? r.json() : [])
      .then((list: PassengerRecord[]) => {
        savedPassengersRef.current = list;
        publish(list);
        if (initialPassengerId) {
          const target = list.find((p: PassengerRecord) => p.id === initialPassengerId);
          if (target) loadPassenger(target);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  /* ── Cleanup blob URL on unmount ─── */
  useEffect(() => {
    return () => { if (prevUrlRef.current && prevUrlRef.current !== "pdf") URL.revokeObjectURL(prevUrlRef.current); };
  }, []);

  /* ── Apply scanned data onto a base form (returns filled-field set) ─── */
  const applyScanned = useCallback((base: PassengerRecord, data: ScannedData): { next: PassengerRecord; filled: Set<keyof PassengerRecord> } => {
    const mapping: [keyof PassengerRecord, string | null | undefined][] = [
      ["first_name",      data.given_names],
      ["last_name",       data.surname],
      ["date_of_birth",   data.date_of_birth],
      ["gender",          data.gender],
      ["passport_number", data.passport_number],
      ["nationality",     data.nationality],
      ["expiry_date",     data.expiry_date],
    ];
    const next = { ...base };
    const filled = new Set<keyof PassengerRecord>();
    for (const [field, val] of mapping) {
      if (val) { (next as Record<string, unknown>)[field as string] = val; filled.add(field); }
    }
    return { next, filled };
  }, []);

  /* ── Scan a passport file ─── */
  const scanFile = useCallback(async (file: File) => {
    if (prevUrlRef.current && prevUrlRef.current !== "pdf") URL.revokeObjectURL(prevUrlRef.current);
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const url = isPdf ? "pdf" : URL.createObjectURL(file);
    if (!isPdf) prevUrlRef.current = url;
    setPreviewUrl(url);
    setScanError(null);
    setScanMatch(null);
    setScanning(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const resp = await fetch(`${API}/api/passport/scan`, { method: "POST", body: fd });
      if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).detail ?? `Scan failed (${resp.status})`);
      const scanned: ScannedData = (await resp.json()).data ?? {};

      // ── Match detection against saved passengers ──────────────────
      const fn = scanned.given_names?.trim().toLowerCase() ?? "";
      const ln = scanned.surname?.trim().toLowerCase() ?? "";
      const existing = fn && ln
        ? savedPassengersRef.current.find(
            p => p.first_name.trim().toLowerCase() === fn &&
                 p.last_name.trim().toLowerCase() === ln
          )
        : undefined;

      if (existing) {
        const passportSame    = existing.passport_number === (scanned.passport_number ?? "");
        const expirySame      = existing.expiry_date === (scanned.expiry_date ?? "");
        const allDetailsSame  = passportSame && expirySame;

        if (allDetailsSame) {
          // Identical — just load the existing record, no overwrite needed
          setScanMatch({ type: "same", passenger: existing });
          setForm({ ...existing });
          setActivePassengerId(existing.id ?? null);
          setHL(new Set());
        } else {
          // Renewed passport — load existing record then overlay new passport fields
          setScanMatch({ type: "renewed", passenger: existing });
          const { next, filled } = applyScanned({ ...existing }, scanned);
          setForm(next);
          setActivePassengerId(existing.id ?? null);
          setHL(filled);
          setTimeout(() => setHL(new Set()), 3000);
        }
      } else {
        // Brand-new passenger
        setForm(prev => {
          const { next, filled } = applyScanned(prev, scanned);
          setHL(filled);
          setTimeout(() => setHL(new Set()), 3000);
          return next;
        });
      }
    } catch (e: unknown) {
      setScanError(e instanceof Error ? e.message : "Could not read passport — try a clearer photo.");
    } finally {
      setScanning(false);
    }
  }, [applyScanned]);

  /* Auto-scan the file passed from outside (drag-drop / + menu) */
  useEffect(() => {
    if (initialFile && initialFile !== scannedFileRef.current) {
      scannedFileRef.current = initialFile;
      scanFile(initialFile);
    }
  }, [initialFile, scanFile]);

  /* ── Load a saved passenger into the form ─── */
  const loadPassenger = (p: PassengerRecord) => {
    setForm({ ...p });
    setActivePassengerId(p.id ?? null);
    setShowMissing(false);
    setDuplicateOf(null);
    setScanMatch(null);
    setHL(new Set());
    setPreviewUrl(null);
    setScanError(null);
  };

  /* ── Save (upsert) ─── */
  const savePassenger = async (): Promise<boolean> => {
    const missing = missingRequired(form);
    if (missing.length > 0) { setShowMissing(true); return false; }
    if (!userEmail) return true;

    // Duplicate detection: same name, different id → auto-switch to update
    if (!activePassengerId) {
      const dup = savedPassengers.find(p => sameName(p, form) && p.id !== activePassengerId);
      if (dup) {
        setDuplicateOf(dup);
        setActivePassengerId(dup.id ?? null);
        // Continue saving as an update below
      }
    }

    setSaving(true);
    try {
      const body = { ...form };
      if (!body.label.trim()) body.label = [body.first_name, body.last_name].filter(Boolean).join(" ") || "Passenger";
      const id = activePassengerId ?? duplicateOf?.id ?? null;
      let saved: PassengerRecord;

      if (id) {
        const r = await fetch(`${API}/api/user/passengers/${id}`, {
          method: "PUT", headers: authHdrs(userEmail), body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail ?? "Update failed");
        saved = await r.json();
        publish(savedPassengers.map(p => p.id === id ? saved : p));
      } else {
        // POST → backend upserts by name
        const r = await fetch(`${API}/api/user/passengers`, {
          method: "POST", headers: authHdrs(userEmail), body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail ?? "Save failed");
        saved = await r.json();
        // Backend may return the existing record (upserted), so replace or append
        publish(
          savedPassengers.some(p => p.id === saved.id)
            ? savedPassengers.map(p => p.id === saved.id ? saved : p)
            : [...savedPassengers, saved]
        );
        setActivePassengerId(saved.id ?? null);
      }

      setDuplicateOf(null);
      setSavedNotice(id ? "Passenger updated ✓" : "Passenger saved ✓");
      setTimeout(() => setSavedNotice(null), 3000);
      return true;
    } catch (e: unknown) {
      setScanError(e instanceof Error ? e.message : "Save failed — please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ─── */
  const deletePassenger = async (id: number) => {
    if (!userEmail) return;
    await fetch(`${API}/api/user/passengers/${id}`, {
      method: "DELETE", headers: { "X-User-Email": userEmail },
    }).catch(() => {});
    const next = savedPassengers.filter(p => p.id !== id);
    publish(next);
    if (activePassengerId === id) { setActivePassengerId(null); setForm({ ...EMPTY }); }
  };

  /* ── Proceed to book ─── */
  const handleProceed = async () => {
    const ok = await savePassenger();
    if (!ok) return;
    if (bookingLink) window.open(bookingLink, "_blank", "noopener,noreferrer");
    onClose();
  };

  const missing    = showMissing ? missingRequired(form) : [];
  const isMissing  = (f: keyof PassengerRecord) => missing.includes(f);
  const isEditing  = activePassengerId !== null;
  const expiredPassport = isEditing && isExpired(form.expiry_date);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700/60 shadow-2xl shadow-black/60">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-base shadow">
              👤
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">
                {isEditing ? "Edit Passenger" : "Add Passenger"}
              </p>
              <p className="text-[11px] text-slate-500">
                {savedPassengers.length > 0
                  ? `${savedPassengers.length} saved · first name + last name must be unique`
                  : "Scan passport or fill manually · required fields marked *"}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-xl"
          >✕</button>
        </div>

        <div className="flex flex-col gap-4 p-5">

          {/* ── Saved passengers selector ── */}
          {savedPassengers.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Saved Passengers — tap to edit
              </p>
              <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
                {savedPassengers.map(p => (
                  <PassengerCard
                    key={p.id}
                    p={p}
                    active={p.id === activePassengerId}
                    onSelect={() => loadPassenger(p)}
                    onDelete={() => p.id && deletePassenger(p.id)}
                  />
                ))}
                <button
                  onClick={() => { setForm({ ...EMPTY }); setActivePassengerId(null); setShowMissing(false); setDuplicateOf(null); setPreviewUrl(null); setScanError(null); }}
                  className="flex-shrink-0 w-32 rounded-xl border-2 border-dashed border-slate-700/60
                    flex flex-col items-center justify-center gap-1 text-slate-500
                    hover:border-indigo-500/60 hover:text-indigo-400 transition-all py-4"
                >
                  <span className="text-2xl">+</span>
                  <span className="text-[10px] font-semibold">Add new</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Scan match banners ── */}
          {scanMatch?.type === "same" && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-600/60">
              <span className="text-slate-400 mt-0.5 text-base shrink-0">ℹ</span>
              <div>
                <p className="text-xs font-semibold text-slate-300">
                  Already saved — no changes detected
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {scanMatch.passenger.first_name} {scanMatch.passenger.last_name} is already saved
                  with the same passport details. No update needed.
                </p>
              </div>
            </div>
          )}
          {scanMatch?.type === "renewed" && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-indigo-950/50 border border-indigo-500/50">
              <span className="text-indigo-400 mt-0.5 text-base shrink-0">🔄</span>
              <div>
                <p className="text-xs font-semibold text-indigo-300">
                  Renewed passport detected for {scanMatch.passenger.first_name} {scanMatch.passenger.last_name}
                </p>
                <p className="text-[11px] text-indigo-400/80 mt-0.5">
                  New passport details have been applied above. Review and tap <strong>Update Passenger</strong> to save.
                </p>
              </div>
            </div>
          )}

          {/* ── Success notice ── */}
          {savedNotice && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
              <span className="text-emerald-400 text-base">✓</span>
              <p className="text-xs font-semibold text-emerald-300">{savedNotice}</p>
            </div>
          )}

          {/* ── Duplicate-at-save warning (same name, different id) ── */}
          {duplicateOf && !scanMatch && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40">
              <span className="text-amber-400 mt-0.5">⚠</span>
              <div>
                <p className="text-xs font-semibold text-amber-300">Duplicate name detected</p>
                <p className="text-[11px] text-amber-400/80 mt-0.5">
                  {duplicateOf.first_name} {duplicateOf.last_name} already exists. Saving will update their record.
                </p>
              </div>
            </div>
          )}

          {/* ── Expired passport warning ── */}
          {expiredPassport && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-red-950/40 border border-red-500/40">
              <span className="text-red-400 mt-0.5 text-base shrink-0">🛂</span>
              <div>
                <p className="text-xs font-semibold text-red-300">Passport has expired</p>
                <p className="text-[11px] text-red-400/80 mt-0.5">
                  Expired {form.expiry_date}. Upload a new passport below to update.
                </p>
              </div>
            </div>
          )}

          {/* ── Scan / upload zone ── */}
          <UploadZone
            label={isEditing ? "Upload New Passport to Update" : "Upload Passport Photo or PDF"}
            sublabel={isEditing
              ? "Scan renewed passport · photo or paper doc with details also works"
              : "Passport photo · PDF · any ID doc · photo of written details"}
            scanning={scanning}
            previewUrl={previewUrl}
            scanError={scanError}
            missingCount={missingRequired(form).length}
            onFile={scanFile}
          />

          {/* ── Text paste zone ── */}
          <TextPasteZone onExtracted={data => {
            const fn = data.given_names?.trim().toLowerCase() ?? "";
            const ln = data.surname?.trim().toLowerCase() ?? "";
            const existing = fn && ln
              ? savedPassengersRef.current.find(
                  p => p.first_name.trim().toLowerCase() === fn &&
                       p.last_name.trim().toLowerCase() === ln
                )
              : undefined;
            if (existing) {
              const allSame = existing.passport_number === (data.passport_number ?? "") &&
                              existing.expiry_date === (data.expiry_date ?? "");
              setScanMatch(allSame
                ? { type: "same", passenger: existing }
                : { type: "renewed", passenger: existing });
              const { next, filled } = applyScanned({ ...existing }, data);
              setForm(next);
              setActivePassengerId(existing.id ?? null);
              if (!allSame) { setHL(filled); setTimeout(() => setHL(new Set()), 3000); }
            } else {
              setScanMatch(null);
              setForm(prev => {
                const { next, filled } = applyScanned(prev, data);
                setHL(filled);
                setTimeout(() => setHL(new Set()), 3000);
                return next;
              });
            }
          }} />

          {/* ── Validation summary ── */}
          {showMissing && missing.length > 0 && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-red-950/40 border border-red-500/40">
              <span className="text-red-400 mt-0.5 shrink-0">⚠</span>
              <div>
                <p className="text-xs font-semibold text-red-300">Fill in highlighted fields to continue:</p>
                <p className="text-[11px] text-red-400/80 mt-0.5">{missing.map(f => FIELD_LABELS[f]).join(", ")}</p>
              </div>
            </div>
          )}

          {/* ── Passenger label ── */}
          <Field label="Passenger Label (e.g. Myself, Wife, Child)" value={form.label} onChange={setField("label")} />

          {/* ── Personal details ── */}
          <Section>Personal Details</Section>
          <div className="flex gap-3">
            <Field label="First Name" value={form.first_name} onChange={setField("first_name")}
              required missing={isMissing("first_name")} highlight={highlightedFields.has("first_name")} half />
            <Field label="Last Name" value={form.last_name} onChange={setField("last_name")}
              required missing={isMissing("last_name")} highlight={highlightedFields.has("last_name")} half />
          </div>
          <div className="flex gap-3">
            <Field label="Date of Birth" value={form.date_of_birth} onChange={setField("date_of_birth")}
              type="date" required missing={isMissing("date_of_birth")} highlight={highlightedFields.has("date_of_birth")} half />
            <GenderToggle value={form.gender} onChange={setField("gender")} missing={isMissing("gender")} />
          </div>

          {/* ── Passport ── */}
          <Section>Passport / Travel Document</Section>
          <div className="flex gap-3">
            <Field label="Passport Number" value={form.passport_number} onChange={setField("passport_number")}
              required missing={isMissing("passport_number")} highlight={highlightedFields.has("passport_number")} half />
            <Field label="Nationality" value={form.nationality} onChange={setField("nationality")}
              required missing={isMissing("nationality")} highlight={highlightedFields.has("nationality")} half />
          </div>
          <Field label="Expiry Date" value={form.expiry_date} onChange={setField("expiry_date")}
            type="date" required missing={isMissing("expiry_date")} highlight={highlightedFields.has("expiry_date")} />

          {/* ── Contact ── */}
          <Section>Contact Details</Section>
          <div className="flex gap-3">
            <Field label="Email" value={form.email} onChange={setField("email")} type="email" half />
            <Field label="Phone" value={form.phone} onChange={setField("phone")} type="tel" half />
          </div>

          <p className="text-[10px] text-slate-600">* Required. First name + last name uniquely identify a passenger — a duplicate name updates the existing record.</p>

          {/* ── Footer buttons ── */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold
                hover:border-slate-600 hover:text-white transition-all active:scale-95"
            >
              Cancel
            </button>

            <button
              onClick={async () => { const ok = await savePassenger(); if (ok && !bookingLink) onClose(); }}
              disabled={saving}
              className="flex-1 py-3 rounded-xl border border-indigo-500/50 text-indigo-300 text-sm font-semibold
                hover:bg-indigo-600/20 transition-all active:scale-95 disabled:opacity-40"
            >
              {saving ? "Saving…" : isEditing ? "Update Passenger" : "Save Passenger"}
            </button>

            {bookingLink && (
              <button
                onClick={handleProceed}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold
                  shadow-lg shadow-indigo-900/40 transition-all active:scale-95 disabled:opacity-40
                  flex items-center justify-center gap-1.5"
              >
                Book
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            )}
          </div>

          <p className="text-[10px] text-slate-600 text-center -mt-1">
            Passport photos are processed securely and never stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
