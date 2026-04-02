import { OS_APPS } from "./nav.config";
import { ShellIcon } from "../components/ui/Icons";

export function Sidebar({ activeId, onNavigate }) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-cyan-500/10 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900/95">
      <div className="border-b border-cyan-500/10 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 font-mono-tech text-xs font-bold tracking-tighter text-cyan-300 os-status-pulse">
            D
          </div>
          <div>
            <h1 className="font-mono-tech text-[13px] font-semibold tracking-widest text-cyan-100">DAATHOS</h1>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">OS · v1</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Aplicativos">
        {OS_APPS.map((app, i) => {
          const active = activeId === app.id;
          return (
            <button
              key={app.id}
              type="button"
              onClick={() => onNavigate(app.id)}
              style={{ animationDelay: `${i * 40}ms` }}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ${
                active
                  ? "border border-cyan-400/35 bg-cyan-500/10 text-cyan-100 shadow-[inset_0_0_20px_rgba(34,211,238,0.06)]"
                  : "border border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-900/60 hover:text-slate-200"
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors duration-200 ${
                  active
                    ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-300"
                    : "border-slate-700/80 bg-slate-900/50 text-slate-500 group-hover:border-cyan-500/20 group-hover:text-cyan-400/80"
                }`}
              >
                <ShellIcon name={app.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{app.label}</span>
                <span className="font-mono-tech text-[10px] text-slate-600">{app.short}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="os-shine-border m-3 rounded-xl border border-cyan-500/10 p-3">
        <p className="font-mono-tech text-[10px] leading-relaxed text-slate-500">
          Neural mesh ativo. Selecione um módulo para continuar.
        </p>
      </div>
    </aside>
  );
}
