import { useEffect, useState } from "react";
import { GlowPanel } from "../../components/ui/GlowPanel";
import { Badge } from "../../components/ui/Badge";
import { fetchStats } from "../../services/api";

export function DataApp({ systemStatus }) {
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatsLoading(true);
      try {
        const res = await fetchStats({ limit: 2000 });
        if (!cancelled) {
          setStats(res?.data || null);
          setStatsError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setStats(null);
          setStatsError(e?.message || "Stats indisponível (API key?)");
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const providersHealth = systemStatus?.providers;
  const byProvider = stats?.byProvider || [];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlowPanel className="p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">Conectividade</h2>
        <p className="mb-3 text-xs text-slate-500">GET /health · última leitura do topbar</p>
        {providersHealth ? (
          <ul className="space-y-2">
            {Object.entries(providersHealth).map(([name, ok]) => (
              <li
                key={name}
                className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/40 px-3 py-2"
              >
                <span className="font-mono-tech text-sm text-slate-300">{name}</span>
                <Badge tone={ok ? "success" : "warn"}>{ok ? "KEY" : "OFF"}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Aguardando health…</p>
        )}
      </GlowPanel>

      <GlowPanel className="p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">Uso & latência</h2>
        <p className="mb-3 text-xs text-slate-500">GET /stats · requer X-API-Key se o core estiver protegido</p>
        {statsLoading && <p className="text-sm text-slate-500">Carregando stats…</p>}
        {statsError && <p className="text-sm text-amber-200/90">{statsError}</p>}
        {stats?.summary && (
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge tone="neutral">runs · {stats.summary.completedRuns}</Badge>
            <Badge tone="neutral">tentativas · {stats.summary.totalProviderAttempts}</Badge>
          </div>
        )}
        {byProvider.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono-tech text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="pb-2 pr-3">IA</th>
                  <th className="pb-2 pr-3">Uso</th>
                  <th className="pb-2">Latência média</th>
                </tr>
              </thead>
              <tbody>
                {byProvider.map((row) => (
                  <tr key={row.provider} className="border-b border-slate-800/60">
                    <td className="py-2 pr-3 text-cyan-200/90">{row.provider}</td>
                    <td className="py-2 pr-3 text-slate-400">{row.attempts}</td>
                    <td className="py-2 text-slate-400">
                      {row.avgLatencyMs != null ? `${Math.round(row.avgLatencyMs)} ms` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !statsError ? (
          <p className="text-sm text-slate-500">Sem agregados ainda ou stats bloqueado.</p>
        ) : null}
      </GlowPanel>

    </div>
  );
}
