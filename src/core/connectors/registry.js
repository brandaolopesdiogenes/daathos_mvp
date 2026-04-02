const crypto = require("crypto");

/**
 * Registro em memória de conectores persistidos após POST /connect bem-sucedido.
 * Sem segredos — apenas metadados para GET /connectors.
 */
class ConnectorRegistry {
  constructor({ maxEntries = 100 } = {}) {
    this.maxEntries = maxEntries;
    /** @type {Array<{ id: string, type: string, name: string|null, createdAt: string, lastCheckAt: string, lastOk: boolean, summary: Record<string, unknown> }>} */
    this.entries = [];
  }

  /**
   * @param {{ type: string, name?: string|null, ok: boolean, summary?: Record<string, unknown> }} row
   */
  record(row) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const item = {
      id,
      type: String(row.type),
      name: row.name != null && String(row.name).trim() ? String(row.name).trim() : null,
      createdAt: now,
      lastCheckAt: now,
      lastOk: Boolean(row.ok),
      summary: row.summary && typeof row.summary === "object" ? row.summary : {}
    };
    this.entries.unshift(item);
    if (this.entries.length > this.maxEntries) {
      this.entries.length = this.maxEntries;
    }
    return item;
  }

  list() {
    return [...this.entries];
  }
}

const singleton = new ConnectorRegistry();

module.exports = {
  ConnectorRegistry,
  connectorRegistry: singleton
};
