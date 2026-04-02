/**
 * Painel com borda luminosa e fundo glass — base para janelas do OS.
 */
export function GlowPanel({ children, className = "", variant = "default" }) {
  const variants = {
    default: "border-cyan-500/20 bg-slate-950/50 shadow-[0_0_40px_-12px_rgba(34,211,238,0.25)]",
    inset: "border-slate-700/60 bg-slate-900/40"
  };

  return (
    <div
      className={`rounded-2xl border backdrop-blur-md transition-[border-color,box-shadow] duration-300 hover:border-cyan-400/25 ${variants[variant] || variants.default} ${className}`}
    >
      {children}
    </div>
  );
}
