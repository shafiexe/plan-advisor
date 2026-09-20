import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/landing"><BrandLogo size={28} /></Link>
          <nav className="flex gap-4 ml-4 text-sm font-medium">
            <Link href="/explore/packages" className="text-slate-400 hover:text-white transition-colors">Packages</Link>
            <Link href="/explore/tickets"  className="text-slate-400 hover:text-white transition-colors">Tickets</Link>
            <Link href="/explore/visa"     className="text-slate-400 hover:text-white transition-colors">Visa</Link>
          </nav>
          <div className="ml-auto">
            <Link href="/" className="text-xs px-3 py-1.5 rounded-lg text-white transition-all" style={{ background: "#1e3a8a" }}>← Chat</Link>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
