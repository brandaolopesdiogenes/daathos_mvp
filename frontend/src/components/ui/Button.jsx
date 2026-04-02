export function Button({ children, variant = "primary", className = "", disabled, type = "button", ...rest }) {
  const variants = {
    primary:
      "bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-sky-400 disabled:shadow-none",
    ghost: "border border-slate-600/60 bg-slate-900/50 text-slate-200 hover:border-cyan-500/40 hover:bg-slate-800/80"
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant] || variants.primary} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
