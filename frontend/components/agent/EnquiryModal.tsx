"use client";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface EnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentEmail: string;
  listingType: "package" | "ticket" | "visa";
  listingId: number;
  listingTitle: string;
  agentPhone?: string;
  agentWhatsapp?: string;
}

export default function EnquiryModal({
  isOpen,
  onClose,
  agentEmail,
  listingType,
  listingId,
  listingTitle,
  agentPhone,
  agentWhatsapp,
}: EnquiryModalProps) {
  const [form, setForm] = useState({
    enquirer_name: "",
    enquirer_phone: "",
    enquirer_email: "",
    message: "",
    travel_date: "",
    num_travelers: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.enquirer_name.trim()) { setError("Name is required"); return; }
    if (!form.enquirer_phone.trim()) { setError("Phone is required"); return; }
    setError("");
    setLoading(true);
    try {
      const body = {
        agent_email: agentEmail,
        listing_type: listingType,
        listing_id: listingId,
        listing_title: listingTitle,
        enquirer_name: form.enquirer_name,
        enquirer_email: form.enquirer_email || undefined,
        enquirer_phone: form.enquirer_phone,
        travel_date: form.travel_date || undefined,
        num_travelers: form.num_travelers ? parseInt(form.num_travelers, 10) : undefined,
        message: form.message || undefined,
      };
      const res = await fetch(`${API}/api/explore/enquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to send enquiry");
      setSuccess(true);
    } catch (err) {
      setError("Failed to send enquiry. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleWhatsApp() {
    const number = (agentWhatsapp || agentPhone || "").replace(/\D/g, "");
    if (!number) return;
    const text = encodeURIComponent(`Hi, I'm interested in ${listingTitle}. Could you please share more details?`);
    window.open(`https://wa.me/${number}?text=${text}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-white">Enquire Now</h2>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{listingTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5">
          {success ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-white mb-2">Enquiry Sent!</h3>
              <p className="text-sm text-slate-400 mb-6">
                The agent will contact you shortly on the details provided.
              </p>
              {(agentWhatsapp || agentPhone) && (
                <button
                  onClick={handleWhatsApp}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all mb-3"
                  style={{ background: "#25d366" }}
                >
                  Also message on WhatsApp
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-all"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* WhatsApp CTA */}
              {(agentWhatsapp || agentPhone) && (
                <button
                  onClick={handleWhatsApp}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all mb-4"
                  style={{ background: "#25d366" }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Chat on WhatsApp
                </button>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-xs text-slate-500">or send an enquiry</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <input
                    name="enquirer_name"
                    value={form.enquirer_name}
                    onChange={handleChange}
                    placeholder="Your name *"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <input
                    name="enquirer_phone"
                    value={form.enquirer_phone}
                    onChange={handleChange}
                    placeholder="Phone number *"
                    type="tel"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <input
                    name="enquirer_email"
                    value={form.enquirer_email}
                    onChange={handleChange}
                    placeholder="Email (optional)"
                    type="email"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    name="travel_date"
                    value={form.travel_date}
                    onChange={handleChange}
                    placeholder="Travel date"
                    type="date"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-600"
                  />
                  <input
                    name="num_travelers"
                    value={form.num_travelers}
                    onChange={handleChange}
                    placeholder="Travellers"
                    type="number"
                    min="1"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Message (optional)"
                    rows={3}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-600 resize-none"
                  />
                </div>
                {error && <p className="text-xs text-red-400">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                  style={{ background: "#1e3a8a" }}
                >
                  {loading ? "Sending…" : "Send Enquiry"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
