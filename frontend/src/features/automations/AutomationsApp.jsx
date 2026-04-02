import { useCallback, useEffect, useState } from "react";
import { GlowPanel } from "../../components/ui/GlowPanel";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import {
  approveEventDecision,
  fetchEventDecisions,
  publishEventApi,
  rejectEventDecision
} from "../../services/api";

const POLL_MS = 5000;

export function AutomationsApp({ operatorName = "operador" }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [simLoading, setSimLoading] = useState(false);

  const refresh = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetchEventDecisions({ status: filter, limit: 40 });
      setItems(res?.data?.items || []);
    } catch (e) {
      setErr(e?.message || "Falha ao listar decisões");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  async function onApprove(id, providerOverride) {
    setBusyId(id);
    setErr(null);
    try {
      await approveEventDecision(id, {
        decidedBy: operatorName,
        providerOverride: providerOverride?.trim() || undefined
      });
      await refresh();
    } catch (e) {
      setErr(e?.message || "Aprovação falhou");
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(id) {
    setBusyId(id);
    setErr(null);
    try {
      await rejectEventDecision(id, { decidedBy: operatorName, reason: "rejected_ui" });
      await refresh();
    } catch (e) {
      setErr(e?.message || "Rejeição falhou");
    } finally {
      setBusyId(null);
    }
  }

  async function simulateNewLead() {
    setSimLoading(true);
    setErr(null);
    try {
      await publishEventApi({
        type: "new_lead",
        source: "daathos-os",
        data: {
          name: "Lead demo",
          email: "lead@exemplo.com",
          channel: "site"
        }
      });
      setFilter("pending");
      await refresh();
    } catch (e) {
      setErr(e?.message || "Publicar evento falhou (API key / human loop no backend?)");
    } finally {
      setSimLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <GlowPanel className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Automações · human-in-the-loop</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Eventos disparam uma proposta da IA (ações + provider + prompt). Você aprova ou rejeita; ao aprovar, o
              router DAATHOS executa. Ative no core:{" "}
              <code className="text-cyan-300/90">DAATHOS_HUMAN_LOOP=true</code> e use{" "}
              <code className="text-cyan-300/90">DAATHOS_AUTOMATION_SKIP_EVENTS=new_lead</code> para não duplicar com
              automação automática.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" className="!text-xs" onClick={() => void refresh()} disabled={loading}>
              Atualizar
            </Button>
            <Button type="button" className="!text-xs" onClick={() => void simulateNewLead()} disabled={simLoading}>
              {simLoading ? "…" : "Simular new_lead"}
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {["pending", "all", "executed", "rejected", "failed"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setLoading(true);
                setFilter(s);
              }}
              className={`rounded-lg border px-3 py-1.5 font-mono-tech text-[11px] transition ${
                filter === s
                  ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100"
                  : "border-slate-700 text-slate-500 hover:border-slate-600"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {err && <p className="mt-3 text-sm text-rose-300/90">{err}</p>}
      </GlowPanel>

      <div className="space-y-4">
        {loading && items.length === 0 ? (
          <p className="text-sm text-slate-500">Carregando fila…</p>
        ) : items.length === 0 ? (
          <GlowPanel variant="inset" className="p-6 text-center text-sm text-slate-500">
            Nenhum item neste filtro. Publique um evento (botão acima) ou aguarde integrações.
          </GlowPanel>
        ) : (
          items.map((item) => (
            <GlowPanel key={item.id} variant="inset" className="p-5 transition duration-300 hover:border-cyan-500/20">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{item.event?.type}</Badge>
                <Badge tone="accent">IA · {item.proposal?.provider}</Badge>
                <Badge tone={item.status === "pending" ? "warn" : item.status === "executed" ? "success" : "neutral"}>
                  {item.status}
                </Badge>
                <span className="font-mono-tech text-[10px] text-slate-600">{item.id}</span>
              </div>

              <p className="mb-2 text-sm font-medium text-slate-200">{item.proposal?.summaryForHuman}</p>

              <div className="mb-3 flex flex-wrap gap-1">
                {(item.proposal?.actions || []).map((a) => (
                  <Badge key={a} tone="neutral">
                    {a}
                  </Badge>
                ))}
              </div>

              <details className="mb-3 text-xs text-slate-500">
                <summary className="cursor-pointer text-cyan-400/80">Prompt de execução</summary>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950/80 p-3 text-[11px] text-slate-400">
                  {item.proposal?.executionPrompt}
                </pre>
              </details>

              {item.status === "pending" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="!py-2 !text-xs"
                    disabled={busyId === item.id}
                    onClick={() => void onApprove(item.id)}
                  >
                    Aprovar e executar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="!py-2 !text-xs"
                    disabled={busyId === item.id}
                    onClick={() => void onApprove(item.id, "auto")}
                  >
                    Aprovar · modo auto
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="!py-2 !text-xs text-rose-300"
                    disabled={busyId === item.id}
                    onClick={() => void onReject(item.id)}
                  >
                    Rejeitar
                  </Button>
                </div>
              )}

              {item.executionResult && (
                <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-slate-400">
                  Executado com <span className="text-emerald-300">{item.executionResult.provider}</span>
                  <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono-tech text-[10px]">
                    {typeof item.executionResult.response?.result === "string"
                      ? item.executionResult.response.result
                      : JSON.stringify(item.executionResult.response, null, 2)}
                  </pre>
                </div>
              )}

              {item.executionError && (
                <p className="mt-2 text-sm text-rose-300/90">{item.executionError}</p>
              )}
            </GlowPanel>
          ))
        )}
      </div>
    </div>
  );
}
