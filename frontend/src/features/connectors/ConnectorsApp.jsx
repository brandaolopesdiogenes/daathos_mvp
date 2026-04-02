import { useEffect, useMemo, useState } from "react";
import { GlowPanel } from "../../components/ui/GlowPanel";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { fetchConnectorsState, postConnect } from "../../services/api";
import { CONNECTOR_CATALOG, getCatalogEntry } from "./connectorCatalog";
import {
  connectionToPostConnectBody,
  toConnectorsFullSyncBody,
  toConnectorsListPayload,
} from "./connectorPayload";
import { useConnectorConnections } from "./useConnectorConnections";

function maskSecret(secret) {
  if (!secret?.trim()) return "—";
  return "•".repeat(Math.min(12, secret.trim().length + 4));
}

export function ConnectorsApp() {
  const { connections, addConnection, removeConnection, setStatus, clearAll } = useConnectorConnections();

  const [catalogType, setCatalogType] = useState(
    /** @type {import("./connectorTypes").ConnectorCatalogId} */ ("postgres")
  );
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [secret, setSecret] = useState("");
  const [formError, setFormError] = useState("");
  const [showPayload, setShowPayload] = useState(false);

  const [remoteLoading, setRemoteLoading] = useState(true);
  const [remoteError, setRemoteError] = useState(null);
  const [remotePayload, setRemotePayload] = useState(null);

  const [connectBusyId, setConnectBusyId] = useState(null);
  const [connectFeedback, setConnectFeedback] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRemoteError(null);
      setRemoteLoading(true);
      try {
        const res = await fetchConnectorsState();
        if (!cancelled) {
          setRemotePayload(res?.data ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          setRemotePayload(null);
          setRemoteError(e?.message || "Não foi possível carregar GET /connectors");
        }
      } finally {
        if (!cancelled) setRemoteLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const catalog = getCatalogEntry(catalogType);
  const listPreview = useMemo(() => toConnectorsListPayload(connections), [connections]);
  const fullSyncPreview = useMemo(() => toConnectorsFullSyncBody(connections), [connections]);

  function handleAdd(event) {
    event.preventDefault();
    setFormError("");
    if (!name.trim() || !host.trim()) {
      setFormError("Nome e host são obrigatórios.");
      return;
    }
    const pgUrl = /^postgres(ql)?:\/\//i.test(host.trim());
    if (!secret.trim() && !pgUrl) {
      setFormError("Informe o token ou API key (ou use connection string PostgreSQL completa no host).");
      return;
    }
    try {
      addConnection({ catalogType, name, host, secret });
      setName("");
      setHost("");
      setSecret("");
    } catch (e) {
      setFormError(e?.message || "Não foi possível salvar.");
    }
  }

  return (
    <div className="space-y-6">
      <GlowPanel className="p-5">
        <h2 className="text-lg font-semibold text-slate-100">Connectors</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Conexões guardadas localmente no browser. O botão <strong className="text-slate-400">Conectar</strong> chama{" "}
          <span className="font-mono-tech text-cyan-200/80">POST /connect</span> no core (testa e registra quando OK).
        </p>
      </GlowPanel>

      <GlowPanel variant="inset" className="p-5">
        <h3 className="font-mono-tech text-xs uppercase tracking-[0.2em] text-cyan-400/80">Estado no core</h3>
        <p className="mt-1 text-xs text-slate-500">Sincronizado com GET /connectors</p>
        {remoteLoading ? (
          <p className="mt-3 text-sm text-slate-500">Carregando catálogo do servidor…</p>
        ) : remoteError ? (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-rose-300/90">{remoteError}</p>
            <Button
              type="button"
              variant="ghost"
              className="!py-2 !text-xs"
              onClick={() => {
                setRemoteLoading(true);
                fetchConnectorsState()
                  .then((res) => {
                    setRemotePayload(res?.data ?? null);
                    setRemoteError(null);
                  })
                  .catch((e) => {
                    setRemotePayload(null);
                    setRemoteError(e?.message || "Falha");
                  })
                  .finally(() => setRemoteLoading(false));
              }}
            >
              Tentar novamente
            </Button>
          </div>
        ) : (
          <div className="mt-3 space-y-2 text-sm text-slate-400">
            <p>
              Conexões registradas no processo:{" "}
              <span className="font-mono-tech text-cyan-100/90">{remotePayload?.connections?.length ?? 0}</span>
            </p>
            {remotePayload?.catalog?.length ? (
              <p className="text-xs text-slate-600">
                Catálogo servidor: {remotePayload.catalog.length} tipo(s) suportado(s).
              </p>
            ) : null}
          </div>
        )}
      </GlowPanel>

      {connectFeedback ? (
        <p
          className={`rounded-xl border px-4 py-2 text-sm ${
            connectFeedback.ok
              ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-100/90"
              : "border-rose-500/25 bg-rose-500/5 text-rose-100/90"
          }`}
        >
          {connectFeedback.message}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <GlowPanel className="p-5">
          <h3 className="mb-4 font-mono-tech text-xs uppercase tracking-[0.2em] text-cyan-400/80">
            Catálogo
          </h3>
          <ul className="space-y-3">
            {CONNECTOR_CATALOG.map((c) => (
              <li
                key={c.id}
                className={`cursor-pointer rounded-xl border px-3 py-3 transition duration-200 ${
                  catalogType === c.id
                    ? "border-cyan-400/40 bg-cyan-500/10"
                    : "border-slate-800/80 bg-slate-900/30 hover:border-slate-600"
                }`}
                onClick={() => setCatalogType(/** @type {import("./connectorTypes").ConnectorCatalogId} */ (c.id))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setCatalogType(/** @type {import("./connectorTypes").ConnectorCatalogId} */ (c.id));
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-200">{c.label}</span>
                  <Badge tone="neutral">{c.backendProvider}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">{c.description}</p>
              </li>
            ))}
          </ul>
        </GlowPanel>

        <GlowPanel className="p-5">
          <h3 className="mb-4 font-mono-tech text-xs uppercase tracking-[0.2em] text-cyan-400/80">
            Nova conexão · {catalog?.label ?? "—"}
          </h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="mb-1 block font-mono-tech text-[10px] uppercase text-slate-500">
                Nome da conexão
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Produção EU"
                className="w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-400/30 focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono-tech text-[10px] uppercase text-slate-500">
                Host / URL
              </label>
              <input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder={catalog?.hostPlaceholder ?? ""}
                className="w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2 font-mono-tech text-xs text-slate-100 outline-none ring-cyan-400/30 focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono-tech text-[10px] uppercase text-slate-500">
                {catalog?.secretLabel ?? "Token"}
              </label>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="••••••••"
                autoComplete="off"
                className="w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-400/30 focus:ring-2"
              />
            </div>
            {formError && <p className="text-sm text-rose-300/90">{formError}</p>}
            <Button type="submit">Salvar conexão</Button>
          </form>
        </GlowPanel>
      </div>

      <GlowPanel className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-mono-tech text-xs uppercase tracking-[0.2em] text-cyan-400/80">
            Conexões salvas · {connections.length}
          </h3>
          {connections.length > 0 && (
            <button
              type="button"
              onClick={() => clearAll()}
              className="font-mono-tech text-[11px] text-slate-500 underline-offset-2 hover:text-rose-300 hover:underline"
            >
              Limpar todas
            </button>
          )}
        </div>

        {connections.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma conexão ainda. Use o formulário acima.</p>
        ) : (
          <ul className="space-y-3">
            {connections.map((c) => {
              const cat = getCatalogEntry(c.catalogType);
              const connected = c.status === "connected";
              return (
                <li key={c.id}>
                  <GlowPanel variant="inset" className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-100">{c.name}</span>
                        <Badge tone="neutral">{cat?.label ?? c.catalogType}</Badge>
                        <Badge tone={connected ? "success" : "warn"}>
                          {connected ? "conectado" : "desconectado"}
                        </Badge>
                      </div>
                      <p className="font-mono-tech text-[11px] text-slate-500">{c.host}</p>
                      <p className="font-mono-tech text-[11px] text-slate-600">
                        credencial: {maskSecret(c.secret)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {connected ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="!py-2 !text-xs"
                          onClick={() => setStatus(c.id, "disconnected")}
                        >
                          Desconectar
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          className="!py-2 !text-xs"
                          disabled={connectBusyId === c.id}
                          onClick={async () => {
                            setConnectFeedback(null);
                            setConnectBusyId(c.id);
                            try {
                              const body = connectionToPostConnectBody(c);
                              await postConnect(body);
                              setStatus(c.id, "connected");
                              setConnectFeedback({ ok: true, message: `Conectado: ${c.name} · registrado no core.` });
                              try {
                                const res = await fetchConnectorsState();
                                setRemotePayload(res?.data ?? null);
                                setRemoteError(null);
                              } catch {
                                /* ignore refresh */
                              }
                            } catch (e) {
                              const msg = e?.message || "Falha em POST /connect";
                              setConnectFeedback({ ok: false, message: msg });
                            } finally {
                              setConnectBusyId(null);
                            }
                          }}
                        >
                          {connectBusyId === c.id ? "Conectando…" : "Conectar"}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        className="!py-2 !text-xs text-rose-300 hover:border-rose-500/40"
                        onClick={() => removeConnection(c.id)}
                      >
                        Remover
                      </Button>
                    </div>
                  </GlowPanel>
                </li>
              );
            })}
          </ul>
        )}
      </GlowPanel>

      <GlowPanel className="p-5">
        <button
          type="button"
          onClick={() => setShowPayload((s) => !s)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <div>
            <h3 className="font-mono-tech text-xs uppercase tracking-[0.2em] text-slate-400">
              Payload sugerido (backend)
            </h3>
            <p className="mt-1 text-xs text-slate-600">Metadados sem segredo + corpo completo para sync.</p>
          </div>
          <Badge tone="neutral">{showPayload ? "ocultar" : "mostrar"}</Badge>
        </button>
        {showPayload && (
          <div className="mt-4 space-y-4 os-animate-in">
            <div>
              <p className="mb-2 font-mono-tech text-[10px] uppercase text-slate-500">Listagem (sem credenciais)</p>
              <pre className="max-h-48 overflow-auto rounded-lg border border-slate-800 bg-slate-950/90 p-3 font-mono-tech text-[10px] leading-relaxed text-cyan-100/80">
                {JSON.stringify(listPreview, null, 2)}
              </pre>
            </div>
            <div>
              <p className="mb-2 font-mono-tech text-[10px] uppercase text-amber-500/80">
                Sync completo (inclui tokens — apenas para transporte seguro HTTPS)
              </p>
              <pre className="max-h-56 overflow-auto rounded-lg border border-amber-500/20 bg-slate-950/90 p-3 font-mono-tech text-[10px] leading-relaxed text-amber-100/70">
                {JSON.stringify(fullSyncPreview, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </GlowPanel>
    </div>
  );
}
