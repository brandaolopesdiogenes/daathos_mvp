/**
 * Resposta padronizada para operações de conector (HTTP e uso interno).
 * @param {string} connector
 * @param {unknown} [data]
 * @param {Record<string, unknown>} [meta]
 */
function ok(connector, data = null, meta = {}) {
  return {
    ok: true,
    connector,
    data,
    error: null,
    meta: { timestamp: new Date().toISOString(), ...meta }
  };
}

/**
 * @param {string} connector
 * @param {string} code
 * @param {string} message
 * @param {Record<string, unknown>} [details]
 */
function fail(connector, code, message, details = {}) {
  return {
    ok: false,
    connector,
    data: null,
    error: { code, message, details },
    meta: { timestamp: new Date().toISOString() }
  };
}

module.exports = { ok, fail };
