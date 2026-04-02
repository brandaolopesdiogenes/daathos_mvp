import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { OS_APPS } from "./nav.config";

export function AppShell({ activeApp, onNavigate, operatorName, onOperatorChange, systemStatus, children }) {
  const activeMeta = OS_APPS.find((a) => a.id === activeApp);

  return (
    <div className="flex h-screen min-h-[480px] flex-col overflow-hidden bg-[#030712] text-slate-100 md:flex-row">
      <Sidebar activeId={activeApp} onNavigate={onNavigate} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          operatorName={operatorName}
          onOperatorChange={onOperatorChange}
          systemStatus={systemStatus}
          activeLabel={activeMeta?.label || "Workspace"}
        />
        <main className="relative flex-1 overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage: `radial-gradient(ellipse 80% 50% at 50% -20%, rgba(34,211,238,0.12), transparent)`,
              backgroundRepeat: "no-repeat"
            }}
          />
          <div className="relative h-full overflow-y-auto p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
