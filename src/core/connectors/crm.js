const { connectExternalApi } = require("./api");
const { ok, fail } = require("./response");

/**
 * CRM genérico via HTTP: mesmo fluxo da API externa, com path padrão configurável.
 * Útil para sanity-check de base (ex. /v1/me, /health).
 *
 * @param {Record<string, unknown>} config
 * @param {string} config.baseUrl
 * @param {string} [config.token]
 * @param {string} [config.path] default / (ou CRM_DEFAULT_PATH em env)
 * @param {string} [config.method] default GET
 */
async function connectCrm(config) {
  const raw = config && typeof config === "object" ? config : {};
  const baseUrl = typeof raw.baseUrl === "string" ? raw.baseUrl.trim() : "";

  if (!baseUrl) {
    return fail("crm", "INVALID_CONFIG", "Informe baseUrl do CRM.");
  }

  const defaultPath = process.env.CRM_DEFAULT_PATH || "/";
  const path = typeof raw.path === "string" && raw.path.trim() ? raw.path.trim() : defaultPath;

  const result = await connectExternalApi({
    baseUrl,
    path,
    method: raw.method || "GET",
    headers: raw.headers,
    token: raw.token,
    authHeader: raw.authHeader,
    body: raw.body,
    timeoutMs: raw.timeoutMs
  });

  if (!result.ok) {
    return { ...result, connector: "crm" };
  }

  return {
    ok: true,
    connector: "crm",
    data: {
      ...result.data,
      crmPath: path
    },
    error: null,
    meta: {
      ...result.meta,
      variant: "generic_http"
    }
  };
}

module.exports = { connectCrm };
