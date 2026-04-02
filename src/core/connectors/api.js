const axios = require("axios");
const { ok, fail } = require("./response");

const DEFAULT_TIMEOUT_MS = Math.min(
  Number(process.env.CONNECTOR_HTTP_TIMEOUT_MS) || 15000,
  120000
);

/**
 * Requisição HTTP para API externa (teste de conectividade / consumo simples).
 *
 * @param {Record<string, unknown>} config
 * @param {string} [config.baseUrl] URL base (obrigatória)
 * @param {string} [config.path] caminho relativo (default /)
 * @param {string} [config.method] GET, POST, ...
 * @param {Record<string, string>} [config.headers]
 * @param {string} [config.token] Bearer ou valor enviado em Authorization
 * @param {string} [config.authHeader] nome do header de auth (default Authorization)
 * @param {unknown} [config.body] corpo JSON para POST/PUT
 * @param {number} [config.timeoutMs]
 */
async function connectExternalApi(config) {
  const raw = config && typeof config === "object" ? config : {};
  const baseUrl = typeof raw.baseUrl === "string" ? raw.baseUrl.trim().replace(/\/$/, "") : "";

  if (!baseUrl) {
    return fail("api", "INVALID_CONFIG", "Informe baseUrl.");
  }

  let path = typeof raw.path === "string" ? raw.path : "/";
  if (!path.startsWith("/")) path = `/${path}`;

  let url;
  try {
    url = new URL(path, baseUrl).toString();
  } catch {
    return fail("api", "INVALID_URL", "baseUrl ou path inválidos.");
  }

  const method = (typeof raw.method === "string" ? raw.method : "GET").toUpperCase();
  const timeout = Math.min(
    Number(raw.timeoutMs) > 0 ? Number(raw.timeoutMs) : DEFAULT_TIMEOUT_MS,
    120000
  );

  /** @type {Record<string, string>} */
  const headers = {};
  if (raw.headers && typeof raw.headers === "object" && !Array.isArray(raw.headers)) {
    for (const [k, v] of Object.entries(raw.headers)) {
      if (v != null) headers[String(k)] = String(v);
    }
  }

  const token = raw.token != null ? String(raw.token).trim() : "";
  if (token) {
    const headerName =
      typeof raw.authHeader === "string" && raw.authHeader.trim()
        ? raw.authHeader.trim()
        : "Authorization";
    headers[headerName] = token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}`;
  }

  try {
    const response = await axios({
      url,
      method,
      headers,
      data: raw.body !== undefined ? raw.body : undefined,
      timeout,
      validateStatus: () => true
    });

    if (raw.strict === true && response.status >= 400) {
      const snippet =
        typeof response.data === "string"
          ? response.data.slice(0, 400)
          : JSON.stringify(response.data ?? "").slice(0, 400);
      return fail("api", "HTTP_ERROR", `HTTP ${response.status}`, { status: response.status, snippet });
    }

    /** @type {Record<string, string>} */
    const slim = {};
    const respHeaders = response.headers && typeof response.headers === "object" ? response.headers : {};
    for (const key of ["content-type", "content-length", "date", "server"]) {
      const v = respHeaders[key] ?? respHeaders[key.toLowerCase()];
      if (v != null) slim[key] = String(v);
    }

    const bodyPreview =
      typeof response.data === "string"
        ? response.data.slice(0, 4000)
        : JSON.stringify(response.data ?? null).slice(0, 4000);

    return ok(
      "api",
      {
        status: response.status,
        statusText: response.statusText,
        headers: slim,
        bodyPreview
      },
      { url, method }
    );
  } catch (err) {
    const message =
      err.response?.data != null
        ? typeof err.response.data === "string"
          ? err.response.data.slice(0, 500)
          : JSON.stringify(err.response.data).slice(0, 500)
        : err.message || "HTTP request failed";
    return fail("api", "REQUEST_FAILED", String(message), {
      code: err.code,
      status: err.response?.status
    });
  }
}

module.exports = { connectExternalApi };
