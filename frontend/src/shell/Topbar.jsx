import { Badge } from "../components/ui/Badge";

export function Topbar({ operatorName, onOperatorChange, systemStatus, activeLabel = "Workspace" }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-cyan-500/10 bg-slate-950/80 px-5 backdrop-blur-md">
      <div className="min-w-0">
        <p className="font-mono-tech text-[10px] uppercase tracking-[0.35em] text-slate-500">Surface</p>
        <p className="truncate text-sm font-medium text-slate-200">{activeLabel}</p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <div
          className={`hidden items-center gap-2 rounded-full border px-3 py-1 sm:flex ${
            systemStatus.ok
              ? "border-emerald-500/25 bg-emerald-500/5"
              : "border-rose-500/25 bg-rose-500/5"
          }`}
          title={systemStatus.detail || ""}
        >
          <span
            className={`h-2 w-2 rounded-full ${systemStatus.ok ? "animate-pulse bg-emerald-400" : "bg-rose-500"}`}
          />
          <span className="font-mono-tech text-[11px] font-medium text-slate-300">
            CORE · {systemStatus.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="operator-name">
            Operador
          </label>
          <input
            id="operator-name"
            value={operatorName}
            onChange={(e) => onOperatorChange(e.target.value)}
            placeholder="Operador"
            className="w-32 rounded-lg border border-slate-700/80 bg-slate-900/70 px-2.5 py-1.5 font-mono-tech text-xs text-slate-200 outline-none ring-cyan-400/40 placeholder:text-slate-600 focus:ring-2 sm:w-40"
          />
          <Badge tone="accent">sessão</Badge>
        </div>
      </div>
    </header>
  );
}
