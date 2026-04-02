const { PostgreSQLConnector } = require("./postgresql/postgresql.connector");
const { ExternalApiConnector } = require("./http/external-api.connector");
const { CrmConnector } = require("./crm/crm.connector");

/**
 * Central registry for connectors — used by workers, webhooks, and future automations.
 */
class ConnectorRegistry {
  constructor() {
    /** @type {Map<string, import('./core/base-connector').BaseConnector>} */
    this._connectors = new Map();
  }

  register(name, connector) {
    this._connectors.set(name, connector);
    return this;
  }

  get(name) {
    return this._connectors.get(name) || null;
  }

  list() {
    return Array.from(this._connectors.keys());
  }

  /**
   * @param {string} name
   * @param {import('./core/types').ConnectorPayload} payload
   */
  async run(name, payload) {
    const connector = this.get(name);
    if (!connector) {
      const { errResult } = require("./core/types");
      return errResult({
        connector: "http",
        operation: payload.operation,
        code: "CONNECTOR_NOT_FOUND",
        message: `Connector "${name}" is not registered`
      });
    }
    return connector.execute(payload);
  }
}

function createDefaultRegistry() {
  const registry = new ConnectorRegistry();

  if (process.env.DATABASE_URL) {
    registry.register("postgres", new PostgreSQLConnector());
  }

  registry.register("http", new ExternalApiConnector());

  if (process.env.CRM_API_BASE_URL) {
    registry.register("crm", new CrmConnector());
  }

  return registry;
}

module.exports = {
  ConnectorRegistry,
  createDefaultRegistry
};
