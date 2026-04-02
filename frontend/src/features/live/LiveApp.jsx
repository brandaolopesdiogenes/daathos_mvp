import { useCallback, useEffect, useMemo, useState } from "react";
import { GlowPanel } from "../../components/ui/GlowPanel";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { fetchLive } from "../../services/api";

const POLL_MS = 8000;
const LOG_LIMIT = 100;

function formatMs(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(2)}s`;
  return `${Math.round(n)}ms`;
}

function formatTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

function eventTone(type) {
  if (type === "orchestration_completed") return "success";
  if (type === "decision_executed") return "accent";
  if (type === "approval_required") return "warn";
  if (type === "system_pulse") return "neutral";
  return "neutral";
}

function summarizeEventData(data) {
  if (data == null) return null;
  if (typeof data === "object" && data._truncated) return `${data.bytes ?? "?"} bytes (truncado)`;
  if (typeof data === "object" && data.provider) return String(data.provider);
  try {
    const s = JSON.stringify(data);
    return s.length > 120 ? `${s.slice(0, 118)}…` : s;
  } catch {
    return "…";
  }
}

function StatTile({ label, value, sub, live }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-800/90 bg-gradient-to-br from-slate-900/90 to-slate-950/95 px-4 py-3 shadow-[inset_0_1px_0_rgba(34,211,238,0.06)]">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl transition-opacity group-hover:opacity-100" />
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="font-mono-tech text-xl font-semibold tabular-nums text-slate-100">{value}</p>
        {live ? (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
        ) : null}
      </div>
      {sub ? <p className="mt-0.5 text-[11px] text-slate-600">{sub}</p> : null}
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex gap-1.5">
        <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400/80" style={{ animationDelay: "0ms" }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400/80" style={{ animationDelay: "140ms" }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400/80" style={{ animationDelay: "280ms" }} />
      </span>
      <p className="text-sm text-slate-500">Carregando feed /live…</p>
    </div>
  );
}

export function LiveApp() {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastFetchAt, setLastFetchAt] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchLive({ logLimit: LOG_LIMIT });
      setPayload(res?.data ?? null);
      setLastFetchAt(Date.now());
    } catch (e) {
      setPayload(null);
      setError(e?.message || "Falha ao carregar /live");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const live = payload?.live;
  const tail = payload?.executionLogTail ?? [];
  const recentActions = payload?.recentActions ?? [];
  const recentEvents = payload?.recentEvents ?? [];
  const busStats = payload?.stats;

  const avgMs = useMemo(() => {
    if (!tail.length) return null;
    const ok = tail.filter((r) => !r.hasError && typeof r.responseTimeMs === "number");
    const arr = ok.length ? ok : tail;
    const sum = arr.reduce((a, r) => a + (Number(r.responseTimeMs) || 0), 0);
    return sum / arr.length;
  }, [tail]);

  const pulseLive = Boolean(live?.loopEnabled && live?.lastPulseAt);
  const apiKeyHint = !import.meta.env.VITE_DAATHOS_API_KEY;

  return (
    <div className="space-y-5 pb-8">
      <GlowPanel className="relative overflow-hidden p-5 md:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-50">Live</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              Feed em tempo quasi real via <span className="font-mono-tech text-cyan-200/80">GET /live</span> — fila de
              execuções, journal de eventos e pulso do núcleo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" className="!py-2 !text-xs" onClick={() => load()} disabled={loading}>
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
            {live?.receivedNow ? <> · servidor: {formatTime(live.receivedNow)}</> : null}
          </p>
        ) : null}
      </GlowPanel>

      {apiKeyHint ? (
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
          Defina <span className="font-mono-tech">VITE_DAATHOS_API_KEY</span> no <span className="font-mono-tech">.env</span>{" "}
          do frontend para autenticar <span className="font-mono-tech">/live</span>.
        </p>
      ) : null}

      {error ? (
        <GlowPanel variant="inset" className="border-rose-500/20 p-4">
          <p className="text-sm text-rose-200/90">{error}</p>
          <Button type="button" variant="ghost" className="mt-3 !py-2 !text-xs" onClick={() => load()}>
            Tentar novamente
          </Button>
        </GlowPanel>
      ) : null}

      {loading && !payload ? <LoadingBlock /> : null}

      {!loading || payload ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Execuções (amostra)"
              value={String(busStats?.executionLogEntries ?? tail.length)}
              sub={`até ${LOG_LIMIT} linhas`}
            />
            <StatTile label="Latência média" value={avgMs != null ? formatMs(avgMs) : "—"} sub="Buffer de execução" />
            <StatTile
              label="Monitoramento"
              value={live?.loopEnabled ? "Ativo" : "Pulso off"}
              sub={live?.lastPulseAt ? `Último pulso · ${formatTime(live.lastPulseAt)}` : "Sem pulso ainda"}
              live={pulseLive}
            />
            <StatTile
              label="Buffer de eventos"
              value={String(busStats?.events ?? recentEvents.length)}
              sub={`${busStats?.actions ?? recentActions.length} ações rastreadas`}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            <GlowPanel className="relative overflow-hidden p-0 xl:col-span-3">
              <div className="border-b border-slate-800/80 bg-slate-900/50 px-4 py-3 md:px-5">
                <h3 className="text-sm font-semibold text-slate-200">Histórico de prompts (buffer)</h3>
                <p className="text-[11px] text-slate-500">
                  Últimas execuções registradas no processo — mais recentes por último
                </p>
              </div>
              <div className="max-h-[min(520px,55vh)] overflow-auto">
                {tail.length === 0 ? (
                  <p className="p-5 text-sm text-slate-500">
                    Nenhuma execução em memória ainda. Use o Chat ou aguarde tráfego na API.
                  </p>
                ) : (
                  <table className="w-full min-w-[640px] text-left font-mono-tech text-[12px]">
                    <thead className="sticky top-0 z-10 border-b border-slate-800/90 bg-slate-950/95 backdrop-blur-md">
                      <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-2.5 font-medium md:px-5">Horário</th>
                        <th className="px-2 py-2.5 font-medium">IA</th>
                        <th className="px-2 py-2.5 font-medium">Tempo</th>
                        <th className="px-2 py-2.5 font-medium">Estado</th>
                        <th className="px-4 py-2.5 pr-5 font-medium md:px-5">Prompt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tail.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-slate-800/50 transition-colors hover:bg-cyan-500/[0.04]"
                        >
                          <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 md:px-5">
                            {formatTime(row.timestamp)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2.5">
                            <Badge tone={row.provider ? "accent" : "neutral"}>{row.provider || "—"}</Badge>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2.5 tabular-nums text-cyan-100/90">
                            {formatMs(row.responseTimeMs)}
                          </td>
                          <td className="px-2 py-2.5">
                            <Badge tone={row.hasError ? "danger" : "success"}>{row.hasError ? "erro" : "ok"}</Badge>
                          </td>
                          <td className="max-w-[420px] px-4 py-2.5 text-slate-300 md:px-5">
                            <span className="line-clamp-2 whitespace-normal break-words">{row.promptPreview || "—"}</span>
                            {row.mode ? (
                              <span className="mt-1 block text-[10px] text-slate-600">modo · {row.mode}</span>
                            ) : null}
                            {row.errorMessage ? (
                              <span className="mt-1 block text-[11px] text-rose-300/80">{row.errorMessage}</span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </GlowPanel>

            <div className="flex flex-col gap-4 xl:col-span-2">
              <GlowPanel className="flex max-h-[min(380px,42vh)] flex-col overflow-hidden p-0">
                <div className="border-b border-slate-800/80 bg-slate-900/50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-200">Ações executadas</h3>
                  <p className="text-[11px] text-slate-500">Orquestrações e decisões aplicadas</p>
                </div>
                <ul className="min-h-0 flex-1 space-y-0 overflow-y-auto">
                  {recentActions.length === 0 ? (
                    <li className="p-4 text-sm text-slate-500">Nenhuma ação no journal.</li>
                  ) : (
                    recentActions.map((ev, i) => (
                      <li
                        key={`${ev.ingestedAt}-${ev.type}-${i}`}
                        className="border-b border-slate-800/40 px-4 py-3 last:border-b-0 hover:bg-slate-900/40"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={eventTone(ev.type)}>{ev.type?.replace(/_/g, " ")}</Badge>
                          <span className="text-[10px] text-slate-600">{formatTime(ev.timestamp)}</span>
                        </div>
                        <p className="mt-1 font-mono-tech text-[11px] text-slate-500">{ev.source}</p>
                        {summarizeEventData(ev.data) ? (
                          <p className="mt-1.5 break-words text-[11px] leading-relaxed text-slate-400">
                            {summarizeEventData(ev.data)}
                          </p>
                        ) : null}
                      </li>
                    ))
                  )}
                </ul>
              </GlowPanel>

              <GlowPanel className="flex max-h-[min(340px,38vh)] flex-col overflow-hidden p-0" variant="inset">
                <div className="border-b border-slate-800/60 bg-slate-900/30 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-200">Stream de eventos</h3>
                  <p className="text-[11px] text-slate-500">Barramento interno</p>
                </div>
                <ul className="min-h-0 flex-1 space-y-0 overflow-y-auto font-mono-tech text-[11px]">
                  {recentEvents.length === 0 ? (
                    <li className="p-4 text-slate-500">Sem eventos no buffer.</li>
                  ) : (
                    recentEvents.slice(0, 40).map((ev, i) => (
                      <li
                        key={`${ev.ingestedAt}-${ev.type}-${i}`}
                        className="border-b border-slate-800/30 px-4 py-2.5 last:border-b-0 hover:bg-slate-900/30"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-cyan-200/80">{ev.type}</span>
                          <span className="text-slate-600">{formatTime(ev.timestamp)}</span>
                        </div>
                        <span className="text-slate-600">{ev.source}</span>
                      </li>
                    ))
                  )}
                </ul>
              </GlowPanel>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
