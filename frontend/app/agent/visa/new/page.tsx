"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TagInput from "@/components/agent/TagInput";
import ChecklistBuilder from "@/components/agent/ChecklistBuilder";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const VISA_TYPES = ["tourist", "visiting", "work", "student", "transit", "medical"];
const ENTRY_TYPES = ["single", "double", "multiple"];
const APPLICATION_METHODS = ["online", "embassy", "vfs", "agent", "on_arrival"];
const CURRENCIES = ["AED", "USD", "EUR", "GBP", "INR", "SAR", "QAR", "KWD", "OMR", "BHD"];

const SECTION_LABEL = "text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5 block";
const INPUT_CLASS = "w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017]";
const SELECT_CLASS = "w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#d4a017]";
const SECTION_TITLE = "text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2";

export default function NewVisaPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");

  // Target
  const [destinationCountry, setDestinationCountry] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [visaType, setVisaType] = useState("tourist");

  // Conditions
  const [validityLabel, setValidityLabel] = useState("");
  const [maxStayDays, setMaxStayDays] = useState<number | "">("");
  const [entryType, setEntryType] = useState("single");
  const [eligibleNationalities, setEligibleNationalities] = useState<string[]>([]);

  // Documents
  const [requiredDocuments, setRequiredDocuments] = useState<string[]>([]);

  // Fees & Time
  const [govtFeeAmount, setGovtFeeAmount] = useState<number | "">("");
  const [govtFeeCurrency, setGovtFeeCurrency] = useState("AED");
  const [agentServiceFee, setAgentServiceFee] = useState<number | "">("");
  const [processingTimeMin, setProcessingTimeMin] = useState<number | "">("");
  const [processingTimeMax, setProcessingTimeMax] = useState<number | "">("");

  // Application
  const [applicationMethod, setApplicationMethod] = useState("agent");
  const [embassyDetails, setEmbassyDetails] = useState("");

  // Steps & Notes
  const [processSteps, setProcessSteps] = useState<string[]>([]);
  const [importantNotes, setImportantNotes] = useState<string[]>([]);

  // Status
  const [status, setStatus] = useState("active");
  const [isPublic, setIsPublic] = useState(true);

  const aiFill = async () => {
    if (!destinationCountry.trim()) { setError("Enter destination country first."); return; }
    setAiLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/agent/visa/ai-fill`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Email": session!.user!.email! },
        body: JSON.stringify({ country: destinationCountry, visa_type: visaType }),
      });
      if (!res.ok) throw new Error("AI fill failed");
      const d = await res.json();
      if (d.country_code) setCountryCode(d.country_code);
      if (d.validity_label) setValidityLabel(d.validity_label);
      if (d.max_stay_days) setMaxStayDays(d.max_stay_days);
      if (d.entry_type) setEntryType(d.entry_type);
      if (d.eligible_nationalities) setEligibleNationalities(d.eligible_nationalities);
      if (d.required_documents) setRequiredDocuments(d.required_documents);
      if (d.govt_fee_amount) setGovtFeeAmount(d.govt_fee_amount);
      if (d.govt_fee_currency) setGovtFeeCurrency(d.govt_fee_currency);
      if (d.processing_time_min) setProcessingTimeMin(d.processing_time_min);
      if (d.processing_time_max) setProcessingTimeMax(d.processing_time_max);
      if (d.application_method) setApplicationMethod(d.application_method);
      if (d.embassy_details) setEmbassyDetails(typeof d.embassy_details === "string" ? d.embassy_details : d.embassy_details?.info || "");
      if (d.process_steps) setProcessSteps(d.process_steps);
      if (d.important_notes) setImportantNotes(d.important_notes);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "AI fill failed");
    } finally { setAiLoading(false); }
  };

  const handleSubmit = async () => {
    if (!destinationCountry.trim()) { setError("Destination country is required."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/agent/visa`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Email": session!.user!.email! },
        body: JSON.stringify({
          destination_country: destinationCountry,
          country_code: countryCode,
          visa_type: visaType,
          validity_label: validityLabel,
          max_stay_days: maxStayDays === "" ? null : maxStayDays,
          entry_type: entryType,
          eligible_nationalities: eligibleNationalities,
          required_documents: requiredDocuments,
          govt_fee_amount: govtFeeAmount === "" ? null : govtFeeAmount,
          govt_fee_currency: govtFeeCurrency,
          agent_service_fee: agentServiceFee === "" ? null : agentServiceFee,
          processing_time_min: processingTimeMin === "" ? null : processingTimeMin,
          processing_time_max: processingTimeMax === "" ? null : processingTimeMax,
          application_method: applicationMethod,
          embassy_details: embassyDetails ? { info: embassyDetails } : null,
          process_steps: processSteps,
          important_notes: importantNotes,
          status, is_public: isPublic,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Failed to create visa service"); }
      router.push("/agent/visa");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">New Visa Service</h1>
        <p className="text-slate-400 text-sm mt-1">Add a visa assistance service with AI-fill</p>
      </div>

      {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 mb-4">{error}</p>}

      <div className="flex flex-col gap-6">
        {/* Target + AI Fill */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>🌍 Destination & Type</p>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={SECTION_LABEL}>Destination Country *</label>
                <input value={destinationCountry} onChange={e => setDestinationCountry(e.target.value)}
                  placeholder="e.g. United Arab Emirates"
                  className={INPUT_CLASS} />
              </div>
              <div>
                <label className={SECTION_LABEL}>Country Code (ISO)</label>
                <input value={countryCode} onChange={e => setCountryCode(e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="e.g. AE" maxLength={2}
                  className={INPUT_CLASS} />
              </div>
            </div>
            <div>
              <label className={SECTION_LABEL}>Visa Type</label>
              <select value={visaType} onChange={e => setVisaType(e.target.value)} className={SELECT_CLASS}>
                {VISA_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <button onClick={aiFill} disabled={aiLoading || !destinationCountry.trim()}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
              style={{ background: "#d4a017", color: "#000" }}>
              {aiLoading ? "Filling with AI…" : "✨ Fill with AI"}
            </button>
          </div>
        </div>

        {/* Conditions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>📋 Visa Conditions</p>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={SECTION_LABEL}>Validity</label>
                <input value={validityLabel} onChange={e => setValidityLabel(e.target.value)}
                  placeholder="e.g. 30 days, 1 year"
                  className={INPUT_CLASS} />
              </div>
              <div>
                <label className={SECTION_LABEL}>Max Stay (days)</label>
                <input type="number" value={maxStayDays} onChange={e => setMaxStayDays(e.target.value === "" ? "" : Number(e.target.value))} min={1} placeholder="e.g. 30" className={INPUT_CLASS} />
              </div>
            </div>
            <div>
              <label className={SECTION_LABEL}>Entry Type</label>
              <select value={entryType} onChange={e => setEntryType(e.target.value)} className={SELECT_CLASS}>
                {ENTRY_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className={SECTION_LABEL}>Eligible Nationalities</label>
              <TagInput value={eligibleNationalities} onChange={setEligibleNationalities} placeholder="e.g. Indian, Pakistani (press Enter)" />
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>📄 Required Documents</p>
          <ChecklistBuilder value={requiredDocuments} onChange={setRequiredDocuments} placeholder="Add required document…" />
        </div>

        {/* Fees & Time */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>💰 Fees & Processing Time</p>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={SECTION_LABEL}>Govt Fee Amount</label>
                <input type="number" value={govtFeeAmount} onChange={e => setGovtFeeAmount(e.target.value === "" ? "" : Number(e.target.value))} min={0} placeholder="0" className={INPUT_CLASS} />
              </div>
              <div>
                <label className={SECTION_LABEL}>Currency</label>
                <select value={govtFeeCurrency} onChange={e => setGovtFeeCurrency(e.target.value)} className={SELECT_CLASS}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={SECTION_LABEL}>Service Fee</label>
                <input type="number" value={agentServiceFee} onChange={e => setAgentServiceFee(e.target.value === "" ? "" : Number(e.target.value))} min={0} placeholder="0" className={INPUT_CLASS} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={SECTION_LABEL}>Processing Time Min (days)</label>
                <input type="number" value={processingTimeMin} onChange={e => setProcessingTimeMin(e.target.value === "" ? "" : Number(e.target.value))} min={0} placeholder="3" className={INPUT_CLASS} />
              </div>
              <div>
                <label className={SECTION_LABEL}>Processing Time Max (days)</label>
                <input type="number" value={processingTimeMax} onChange={e => setProcessingTimeMax(e.target.value === "" ? "" : Number(e.target.value))} min={0} placeholder="7" className={INPUT_CLASS} />
              </div>
            </div>
          </div>
        </div>

        {/* Application */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>🏛️ Application Details</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className={SECTION_LABEL}>Application Method</label>
              <select value={applicationMethod} onChange={e => setApplicationMethod(e.target.value)} className={SELECT_CLASS}>
                {APPLICATION_METHODS.map(m => <option key={m} value={m} className="capitalize">{m.replace("_", " ").charAt(0).toUpperCase() + m.replace("_", " ").slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className={SECTION_LABEL}>Embassy / VFS Details</label>
              <textarea value={embassyDetails} onChange={e => setEmbassyDetails(e.target.value)} rows={3}
                placeholder="Address, phone, opening hours, appointment requirements…"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#d4a017] resize-none" />
            </div>
          </div>
        </div>

        {/* Process Steps */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>📝 Application Steps</p>
          <ChecklistBuilder value={processSteps} onChange={setProcessSteps} placeholder="Add step…" />
        </div>

        {/* Important Notes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>⚠️ Important Notes</p>
          <ChecklistBuilder value={importantNotes} onChange={setImportantNotes} placeholder="Add important note…" />
        </div>

        {/* Status & Visibility */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className={SECTION_TITLE}>⚙️ Settings</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className={SECTION_LABEL}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className={SELECT_CLASS}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsPublic(!isPublic)}
                className={`relative w-10 h-5 rounded-full transition-colors ${isPublic ? "" : "bg-slate-700"}`}
                style={isPublic ? { background: "#1e3a8a" } : {}}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPublic ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
              <label className="text-sm text-slate-300">Make publicly visible</label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6 justify-end">
        <button onClick={() => router.push("/agent/visa")}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 border border-slate-700 hover:border-slate-600 transition-all">
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={loading}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: "#1e3a8a" }}>
          {loading ? "Creating…" : "Create Visa Service"}
        </button>
      </div>
    </div>
  );
}
