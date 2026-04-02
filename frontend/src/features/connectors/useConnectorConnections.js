import { useCallback, useEffect, useState } from "react";
import { getCatalogEntry } from "./connectorCatalog";

const STORAGE_KEY = "daathos_os_connectors_v1";

/** @returns {import("./connectorTypes").ConnectorConnection[]} */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** @param {import("./connectorTypes").ConnectorConnection[]} list */
function saveToStorage(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/**
 * @param {{ catalogType: string, name: string, host: string, secret: string }} input
 */
function normalizeNewConnection(input) {
  const entry = getCatalogEntry(input.catalogType);
  if (!entry) throw new Error("Tipo de conector inválido");

  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    catalogType: /** @type {import("./connectorTypes").ConnectorCatalogId} */ (entry.id),
    backendProvider: entry.backendProvider,
    name: input.name.trim(),
    host: input.host.trim(),
    secret: input.secret,
    status: /** @type {import("./connectorTypes").ConnectorLinkStatus} */ ("disconnected"),
    createdAt: now,
    updatedAt: now
  };
}

export function useConnectorConnections() {
  const [connections, setConnections] = useState(loadFromStorage);

  useEffect(() => {
    saveToStorage(connections);
  }, [connections]);

  const addConnection = useCallback((input) => {
    const row = normalizeNewConnection(input);
    setConnections((prev) => [row, ...prev]);
    return row;
  }, []);

  const removeConnection = useCallback((id) => {
    setConnections((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const setStatus = useCallback((id, status) => {
    setConnections((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c
      )
    );
  }, []);

  const clearAll = useCallback(() => setConnections([]), []);

  return {
    connections,
    addConnection,
    removeConnection,
    setStatus,
    clearAll
  };
}
