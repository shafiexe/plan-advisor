export default function TypingDots() {
  return (
    <div className="msg-enter flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 border border-slate-600 flex items-center justify-center text-slate-200 text-xs font-bold flex-shrink-0">
        ✦
      </div>
      <div className="bg-slate-800/80 border border-slate-700/60 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1.5">
        <span className="w-2 h-2 bg-[#1e40af] rounded-full dot-1" />
        <span className="w-2 h-2 bg-[#1e40af] rounded-full dot-2" />
        <span className="w-2 h-2 bg-[#1e40af] rounded-full dot-3" />
      </div>
    </div>
  );
}
