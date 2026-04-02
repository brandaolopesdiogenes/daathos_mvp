const { connectPostgres } = require("./database");
const { connectExternalApi } = require("./api");
const { connectCrm } = require("./crm");
const { fail } = require("./response");
const { connectorRegistry } = require("./registry");

/**
 * @param {string} type
 * @param {Record<string, unknown>} config
 */
async function executeConnector(type, config) {
  const t = String(type).toLowerCase();
  switch (t) {
    case "postgres":
    case "postgresql":
    case "database":
      return connectPostgres(config);
    case "api":
    case "http":
    case "external_api":
      return connectExternalApi(config);
    case "crm":
    case "crm_generic":
      return connectCrm(config);
    default:
      return fail("unknown", "UNKNOWN_CONNECTOR_TYPE", `Tipo não suportado: ${type}`, {
        supported: ["postgres", "api", "crm"]
      });
  }
}

/**
 * Estrai resumo não sensível para registro.
 * @param {string} type
 * @param {import('./response')|null} result
 */
function summarizeResult(type, result) {
  if (!result || !result.ok || !result.data) {
    return { tested: false };
  }
  const d = result.data;
  if (type === "postgres" || type === "postgresql" || type === "database") {
    return { database: d.database, user: d.user };
  }
  if (type === "api" || type === "http" || type === "external_api") {
    return { status: d.status };
  }
  if (type === "crm" || type === "crm_generic") {
    return { status: d.status, crmPath: d.crmPath };
  }
  return {};
}

/**
 * @param {{ type: string, name?: string|null, config: Record<string, unknown>, persist?: boolean }} input
 */
async function connectAndMaybeRegister(input) {
  const type = String(input.type || "").toLowerCase();
  const config = input.config && typeof input.config === "object" ? input.config : {};
  const persist = input.persist !== false;

  const result = await executeConnector(type, config);

  let registered = null;
  if (persist && result.ok) {
    registered = connectorRegistry.record({
      type,
      name: input.name,
      ok: true,
      summary: summarizeResult(type, result)
    });
  }

  return { result, registered };
}

module.exports = {
  executeConnector,
  connectAndMaybeRegister,
  summarizeResult
};
