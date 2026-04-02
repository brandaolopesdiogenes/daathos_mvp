/**
 * Estruturas para futura integração com o backend DAATHOS.
 * Não persistir estes builders em logs públicos com segredos em claro.
 */

import { getCatalogEntry } from "./connectorCatalog";

/**
 * Monta corpo de POST /connect a partir de uma conexão da UI.
 * @param {import("./connectorTypes").ConnectorConnection} c
 */
export function connectionToPostConnectBody(c) {
  const entry = getCatalogEntry(c.catalogType);
  if (!entry) throw new Error("Tipo de conector inválido.");

  const type =
    c.catalogType === "postgres"
      ? "postgresql"
      : c.catalogType === "external_api"
        ? "http"
        : c.catalogType === "crm"
          ? "crm_generic"
          : entry.backendProvider;

  const config = buildConnectConfig(c.catalogType, c.host, c.secret);

  return {
    type,
    name: c.name.trim() || null,
    config,
    persist: true,
  };
}

/**
 * @param {string} catalogType
 * @param {string} host
 * @param {string} secret
 */
function buildConnectConfig(catalogType, host, secret) {
  const h = String(host || "").trim();
  const s = String(secret || "").trim();

  if (catalogType === "postgres") {
    if (/^postgres(ql)?:\/\//i.test(h)) {
      return { connectionString: h };
    }
    const colon = h.lastIndexOf(":");
    let hostPart = h;
    let port = 5432;
    if (colon > 0 && /^[0-9]+$/.test(h.slice(colon + 1).trim())) {
      hostPart = h.slice(0, colon).trim();
      port = Number(h.slice(colon + 1).trim()) || 5432;
    }
    return {
      host: hostPart,
      port,
      database: "postgres",
      user: "postgres",
      password: s,
    };
  }

  if (catalogType === "external_api" || catalogType === "crm") {
    return { baseUrl: h.replace(/\/$/, ""), token: s };
  }

  return {};
}

/**
 * Corpo sugerido para PUT/POST de uma conexão (ex.: POST /connectors).
 * @param {import("./connectorTypes").ConnectorConnection} c
 */
export function toConnectorCreateBody(c) {
  return {
    clientRef: c.id,
    provider: c.catalogType,
    backendProvider: c.backendProvider,
    displayName: c.name,
    host: c.host.trim(),
    credentials: {
      token: c.secret.trim()
    },
    status: c.status
  };
}

/**
 * Listagem “segura” para sync ou UI admin — sem expor o segredo.
 * @param {import("./connectorTypes").ConnectorConnection[]} connections
 */
export function toConnectorsListPayload(connections) {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    items: connections.map((c) => ({
      clientRef: c.id,
      provider: c.catalogType,
      backendProvider: c.backendProvider,
      displayName: c.name,
      host: c.host,
      status: c.status,
      hasCredentials: Boolean(c.secret?.trim()),
      updatedAt: c.updatedAt
    }))
  };
}

/**
 * Payload completo para sincronização em lote (segredos apenas se o backend exigir no mesmo request).
 * @param {import("./connectorTypes").ConnectorConnection[]} connections
 */
export function toConnectorsFullSyncBody(connections) {
  return {
    version: 1,
    connections: connections.map((c) => toConnectorCreateBody(c))
  };
}
