export function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: "bg-slate-800/80 text-slate-300 border-slate-600/50",
    accent: "bg-cyan-500/15 text-cyan-200 border-cyan-400/30",
    success: "bg-emerald-500/15 text-emerald-200 border-emerald-400/25",
    warn: "bg-amber-500/15 text-amber-200 border-amber-400/25",
    danger: "bg-rose-500/15 text-rose-200 border-rose-400/25"
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono-tech text-[11px] font-medium uppercase tracking-wide ${tones[tone] || tones.neutral}`}
    >
      {children}
    </span>
  );
}
