import { useCallback, useEffect, useMemo, useState } from "react";
import { GlowPanel } from "../../components/ui/GlowPanel";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { fetchStats } from "../../services/api";

const POLL_MS = 20000;
const STATS_LIMIT = 5000;

function formatMs(ms) {
  if (ms == null || !Number.isFinite(Number(ms))) return "—";
  const n = Number(ms);
  if (n >= 1000) return `${(n / 1000).toFixed(2)}s`;
  return `${Math.round(n)}ms`;
}

function StatTile({ label, value, sub }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-800/90 bg-gradient-to-br from-slate-900/90 to-slate-950/95 px-4 py-3 shadow-[inset_0_1px_0_rgba(34,211,238,0.06)]">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl transition-opacity group-hover:opacity-100" />
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 font-mono-tech text-xl font-semibold tabular-nums text-slate-100">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-slate-600">{sub}</p> : null}
    </div>
  );
}

function LoadingPanel() {
  return (
    <GlowPanel className="flex min-h-[200px] flex-col items-center justify-center gap-3 p-8">
      <span className="flex gap-1.5">
        <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400/80" style={{ animationDelay: "0ms" }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400/80" style={{ animationDelay: "140ms" }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400/80" style={{ animationDelay: "280ms" }} />
      </span>
      <p className="text-sm text-slate-500">Carregando estatísticas do orquestrador…</p>
    </GlowPanel>
  );
}

export function LogsApp() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastFetchAt, setLastFetchAt] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async ({ silent = false } = {}) => {
    setError(null);
    if (!silent) setLoading(true);
    try {
      const res = await fetchStats({ limit: STATS_LIMIT });
      setData(res?.data ?? null);
      setLastFetchAt(Date.now());
    } catch (e) {
      setData(null);
      setError(e?.message || "Falha ao carregar GET /stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load({ silent: false });
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => load({ silent: true }), POLL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const summary = data?.summary;
  const byProvider = data?.byProvider ?? [];

  const globalAvgMs = useMemo(() => {
    if (!byProvider.length) return null;
    let sum = 0;
    let n = 0;
    for (const row of byProvider) {
      const ms = row.avgLatencyMs;
      if (ms != null && Number(ms) > 0 && row.successes > 0) {
        sum += Number(ms) * row.successes;
        n += row.successes;
      }
    }
    if (!n) return null;
    return sum / n;
  }, [byProvider]);

  const apiKeyHint = !import.meta.env.VITE_DAATHOS_API_KEY;

  return (
    <div className="space-y-5 pb-8">
      <GlowPanel className="relative overflow-hidden p-5 md:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-50">Logs · orquestração</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              Uso de IAs e latência agregados via{" "}
              <span className="font-mono-tech text-cyan-200/80">GET /stats</span>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="!py-2 !text-xs"
              onClick={() => load({ silent: false })}
              disabled={loading}
            >
              {loading ? "Atualizando…" : "Atualizar agora"}
            </Button>
            <Button
              type="button"
              variant={autoRefresh ? "primary" : "ghost"}
              className="!py-2 !text-xs"
              onClick={() => setAutoRefresh((v) => !v)}
            >
              Auto {autoRefresh ? `· ${POLL_MS / 1000}s` : "off"}
            </Button>
          </div>
        </div>
        {lastFetchAt ? (
          <p className="mt-3 text-[11px] text-slate-600">
            Última sincronização: {new Date(lastFetchAt).toLocaleTimeString()}
          </p>
        ) : null}
      </GlowPanel>

      {apiKeyHint ? (
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
          Defina <span className="font-mono-tech">VITE_DAATHOS_API_KEY</span> no <span className="font-mono-tech">.env</span>{" "}
          do frontend para autenticar <span className="font-mono-tech">/stats</span>.
        </p>
      ) : null}

      {error ? (
        <GlowPanel variant="inset" className="border-rose-500/20 p-4">
          <p className="text-sm text-rose-200/90">{error}</p>
          <Button type="button" variant="ghost" className="mt-3 !py-2 !text-xs" onClick={() => load({ silent: false })}>
            Tentar novamente
          </Button>
        </GlowPanel>
      ) : null}

      {loading && !data ? <LoadingPanel /> : null}

      {!loading || data ? (
        <>
          {data ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatTile
                  label="Runs com sucesso"
                  value={String(summary?.completedRuns ?? 0)}
                  sub="Linhas bem-sucedidas na janela"
                />
                <StatTile
                  label="Tentativas (providers)"
                  value={String(summary?.totalProviderAttempts ?? 0)}
                  sub={`${summary?.entriesAnalyzed ?? 0} entradas analisadas`}
                />
                <StatTile
                  label="Latência média (ponderada)"
                  value={formatMs(globalAvgMs)}
                  sub="Só sucessos com tempo medido"
                />
                <StatTile
                  label="Janela máxima"
                  value={String(summary?.lookbackLimit ?? STATS_LIMIT)}
                  sub="Limite solicitado ao servidor"
                />
              </div>

              <GlowPanel className="overflow-hidden p-0">
                <div className="border-b border-slate-800/80 bg-slate-900/50 px-4 py-3 md:px-5">
                  <h3 className="text-sm font-semibold text-slate-200">Por provedor de IA</h3>
                  <p className="text-[11px] text-slate-500">Tentativas, sucesso, falhas e latência</p>
                </div>
                <div className="overflow-x-auto">
                  {byProvider.length === 0 ? (
                    <p className="p-5 text-sm text-slate-500">
                      Sem dados agora. Gere tráfego pelo Chat para preencher o repositório de orquestração.
                    </p>
                  ) : (
                    <table className="w-full min-w-[560px] text-left font-mono-tech text-[12px]">
                      <thead className="border-b border-slate-800/90 bg-slate-950/80">
                        <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                          <th className="px-4 py-3 font-medium md:px-5">IA / provider</th>
                          <th className="px-2 py-3 font-medium">Tentativas</th>
                          <th className="px-2 py-3 font-medium">Sucesso</th>
                          <th className="px-2 py-3 font-medium">Falhas</th>
                          <th className="px-4 py-3 pr-5 font-medium md:px-5">Latência média</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byProvider.map((row) => (
                          <tr
                            key={row.provider}
                            className="border-b border-slate-800/50 transition-colors hover:bg-cyan-500/[0.04]"
                          >
                            <td className="px-4 py-3 text-cyan-100/90 md:px-5">
                              <Badge tone="accent">{row.provider}</Badge>
                            </td>
                            <td className="px-2 py-3 tabular-nums text-slate-300">{row.attempts}</td>
                            <td className="px-2 py-3 tabular-nums text-emerald-200/80">{row.successes}</td>
                            <td className="px-2 py-3 tabular-nums text-rose-200/70">{row.failures}</td>
                            <td className="px-4 py-3 pr-5 tabular-nums text-slate-200 md:px-5">
                              {formatMs(row.avgLatencyMs)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </GlowPanel>
            </>
          ) : !error ? (
            <p className="text-sm text-slate-500">Nenhum dado disponível.</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
